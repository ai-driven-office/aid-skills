/**
 * HDR Encoding Module
 *
 * Hybrid pipeline: sharp handles image processing, external CLI tools handle
 * HDR-aware encoding that sharp's prebuilt binaries can't do:
 *
 *   avifenc       → 10/12-bit AVIF with CICP HDR metadata (PQ, HLG, BT.2020)
 *   cjxl          → JPEG XL with Rec2100PQ/HLG, intensity targets
 *   open-ultrahdr → ISO 21496-1 Ultra HDR JPEG via WASM (no external binary needed)
 *
 * Falls back to sharp 8-bit encoding when external tools are unavailable.
 */

import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "fs";
import { createRequire } from "module";
import { dirname, join } from "path";
import { tmpdir } from "os";
import sharp from "sharp";

// ── Tool Discovery ──────────────────────────────────────────

export interface ToolAvailability {
  avifenc: boolean;
  cjxl: boolean;
  djxl: boolean;
  heifEnc: boolean;
  openUltraHdr: boolean;
  ultrahdrApp: boolean;
  ffmpeg: boolean;
}

let _toolCache: ToolAvailability | null = null;

function hasCmd(cmd: string): boolean {
  try {
    execFileSync("which", [cmd], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function hasNpmPackage(pkg: string): boolean {
  try {
    const req = createRequire(import.meta.url);
    req.resolve(pkg);
    return true;
  } catch {
    return false;
  }
}

export function detectTools(): ToolAvailability {
  if (_toolCache) return _toolCache;

  _toolCache = {
    avifenc: hasCmd("avifenc"),
    cjxl: hasCmd("cjxl"),
    djxl: hasCmd("djxl"),
    heifEnc: hasCmd("heif-enc"),
    openUltraHdr: hasNpmPackage("open-ultrahdr-wasm"),
    ultrahdrApp: hasCmd("ultrahdr_app"),
    ffmpeg: hasCmd("ffmpeg"),
  };

  return _toolCache;
}

export function getToolVersions(): Record<string, string> {
  const tools = detectTools();
  const versions: Record<string, string> = {};
  try {
    if (tools.avifenc) {
      const out = execFileSync("avifenc", ["--version"], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
      versions.avifenc = out.trim().split("\n")[0];
    }
  } catch {}
  try {
    if (tools.cjxl) {
      const out = execFileSync("cjxl", ["--version"], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
      versions.cjxl = out.trim().split("\n")[0];
    }
  } catch {}
  try {
    if (tools.heifEnc) {
      const out = execFileSync("heif-enc", ["--version"], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
      versions.heifEnc = out.trim().split("\n")[0];
    }
  } catch {}
  if (tools.openUltraHdr) versions.openUltraHdr = "open-ultrahdr (WASM)";
  else if (tools.ultrahdrApp) versions.ultrahdrApp = "libultrahdr (CLI)";
  return versions;
}

// ── CICP Constants (ITU-T H.273) ────────────────────────────

/** Color Primaries */
export const CICP_PRIMARIES = {
  bt709: 1,      // sRGB, BT.709
  bt2020: 9,     // BT.2020 (UHDTV)
  displayP3: 12, // Display P3
} as const;

/** Transfer Characteristics */
export const CICP_TRANSFER = {
  srgb: 13,      // sRGB transfer curve
  pq: 16,        // SMPTE ST 2084 (PQ) — HDR10
  hlg: 18,       // ARIB STD-B67 (HLG) — BBC/NHK HDR
} as const;

/** Matrix Coefficients */
export const CICP_MATRIX = {
  bt709: 1,
  bt2020: 9,
  identity: 0,   // RGB (used for lossless, ICtCp)
} as const;

export type HdrTransfer = "pq" | "hlg" | "sdr";
export type HdrColorSpace = "display-p3" | "rec2020" | "srgb";
export type HdrOutputFormat = "avif" | "jxl" | "jpeg" | "ultrahdr-jpeg";

export interface HdrEncodeOptions {
  format: HdrOutputFormat;
  bitDepth: 8 | 10 | 12;
  colorSpace: HdrColorSpace;
  transfer: HdrTransfer;
  quality: number;        // 0-100
  effort: number;         // encoding speed/quality tradeoff (1-10)
  peakNits?: number;      // peak brightness for HDR metadata
  /** For ultrahdr-jpeg: path to the SDR JPEG base */
  sdrJpegPath?: string;
}

export interface HdrEncodeResult {
  outputPath: string;
  outputSize: number;
  bitDepth: number;
  encoder: string;        // which tool was used
  cicp?: { primaries: number; transfer: number; matrix: number };
  warning?: string;
}

// ── Temp File Helpers ───────────────────────────────────────

function tmpPath(ext: string): string {
  return join(tmpdir(), `uhd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
}

function cleanupTemp(...paths: string[]): void {
  for (const p of paths) {
    try { if (existsSync(p)) unlinkSync(p); } catch {}
  }
}

// ── 16-bit PNG Intermediate ─────────────────────────────────

/**
 * Convert an image buffer to a 16-bit PNG for handoff to external encoders.
 * This preserves the full precision from sharp's processing pipeline.
 */
export async function writeTempPng16(imageBuffer: Buffer): Promise<string> {
  const tempPng = tmpPath(".png");
  await sharp(imageBuffer)
    .toColourspace("rgb16")
    .png({ compressionLevel: 1 })  // fast compression, it's a temp file
    .toFile(tempPng);
  return tempPng;
}

// ── AVIF Encoding (avifenc) ─────────────────────────────────

function resolveAvifCicp(opts: HdrEncodeOptions): { p: number; t: number; m: number } {
  const p = opts.colorSpace === "rec2020" ? CICP_PRIMARIES.bt2020
    : opts.colorSpace === "display-p3" ? CICP_PRIMARIES.displayP3
    : CICP_PRIMARIES.bt709;

  const t = opts.transfer === "pq" ? CICP_TRANSFER.pq
    : opts.transfer === "hlg" ? CICP_TRANSFER.hlg
    : CICP_TRANSFER.srgb;

  const m = opts.colorSpace === "rec2020" ? CICP_MATRIX.bt2020 : CICP_MATRIX.bt709;

  return { p, t, m };
}

async function encodeAvifExternal(
  tempPng: string,
  outputPath: string,
  opts: HdrEncodeOptions,
): Promise<HdrEncodeResult> {
  const cicp = resolveAvifCicp(opts);
  const quality = Math.round(opts.quality);
  const speed = Math.max(0, Math.min(10, 10 - opts.effort)); // invert: 0=slowest in avifenc

  const args = [
    "-d", String(opts.bitDepth),
    "-q", String(quality),
    "-s", String(speed),
    "--cicp", `${cicp.p}/${cicp.t}/${cicp.m}`,
    "-r", "full",
    "-y", "444",  // preserve full chroma for HDR
    tempPng,
    outputPath,
  ];

  mkdirSync(dirname(outputPath), { recursive: true });
  execFileSync("avifenc", args, { stdio: "pipe" });

  const stat = statSync(outputPath);
  return {
    outputPath,
    outputSize: stat.size,
    bitDepth: opts.bitDepth,
    encoder: "avifenc",
    cicp: { primaries: cicp.p, transfer: cicp.t, matrix: cicp.m },
  };
}

// ── JXL Encoding (cjxl) ────────────────────────────────────

async function encodeJxlExternal(
  tempPng: string,
  outputPath: string,
  opts: HdrEncodeOptions,
): Promise<HdrEncodeResult> {
  const args: string[] = [];

  args.push("-q", String(Math.round(opts.quality)));
  args.push("-e", String(Math.max(1, Math.min(10, opts.effort))));

  // HDR color space
  if (opts.transfer === "pq") {
    args.push("-x", "color_space=RGB_D65_202_Rel_PeQ");
  } else if (opts.transfer === "hlg") {
    args.push("-x", "color_space=RGB_D65_202_Rel_HLG");
  }

  // Peak brightness
  if (opts.peakNits && opts.transfer !== "sdr") {
    args.push("--intensity_target", String(opts.peakNits));
  }

  // Override bit depth for proper HDR
  if (opts.bitDepth > 8) {
    args.push("--override_bitdepth", String(opts.bitDepth));
  }

  args.push(tempPng, outputPath);

  mkdirSync(dirname(outputPath), { recursive: true });
  execFileSync("cjxl", args, { stdio: "pipe" });

  const stat = statSync(outputPath);
  return {
    outputPath,
    outputSize: stat.size,
    bitDepth: opts.bitDepth,
    encoder: "cjxl",
  };
}

// ── Ultra HDR JPEG (open-ultrahdr WASM) ─────────────────────

let _wasmModule: any = null;

async function getUltraHdrWasm(): Promise<any> {
  if (_wasmModule) return _wasmModule;

  const wasm = await import("open-ultrahdr-wasm");

  // Initialize WASM by loading the .wasm file from disk
  const req = createRequire(import.meta.url);
  const wasmPath = req.resolve("open-ultrahdr-wasm/pkg/open_ultrahdr_bg.wasm");
  const wasmBytes = readFileSync(wasmPath);
  await wasm.default(wasmBytes);

  _wasmModule = wasm;
  return wasm;
}

/**
 * Encode an Ultra HDR JPEG (ISO 21496-1) with embedded gain map.
 * Produces a single JPEG that shows SDR on normal displays
 * and HDR on supported devices (Android 14+, iOS 18+, Chrome).
 *
 * Uses open-ultrahdr WASM: SDR JPEG + HDR linear Float32Array → Ultra HDR JPEG.
 * Includes both ISO 21496-1 metadata and Google UltraHDR v1 (Android compat).
 */
async function encodeUltraHdrWasm(
  hdrBuffer: Buffer,
  outputPath: string,
  opts: HdrEncodeOptions,
): Promise<HdrEncodeResult> {
  const wasm = await getUltraHdrWasm();
  const meta = await sharp(hdrBuffer).metadata();
  const width = meta.width!;
  const height = meta.height!;
  const pixelCount = width * height;

  // 1. Create SDR JPEG base layer
  const sdrJpeg = opts.sdrJpegPath
    ? readFileSync(opts.sdrJpegPath)
    : await sharp(hdrBuffer).jpeg({ quality: Math.round(opts.quality), mozjpeg: true }).toBuffer();

  // 2. Create HDR linear RGB data (Float32Array, 3 values per pixel)
  const raw = await sharp(hdrBuffer).removeAlpha().raw().toBuffer();
  const hdrLinear = new Float32Array(pixelCount * 3);

  // Map headroom stops to a linear boost factor
  const headroomLinear = Math.pow(2, opts.peakNits ? Math.log2(opts.peakNits / 203) : 2.5);

  for (let i = 0; i < pixelCount; i++) {
    const r = raw[i * 3] / 255;
    const g = raw[i * 3 + 1] / 255;
    const b = raw[i * 3 + 2] / 255;

    // sRGB → linear
    const rLin = r <= 0.04045 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gLin = g <= 0.04045 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bLin = b <= 0.04045 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    // Apply HDR expansion: luminance-weighted boost for highlights
    const lum = 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
    const boost = 1.0 + (headroomLinear - 1.0) * Math.pow(lum, 0.5);

    hdrLinear[i * 3] = rLin * boost;
    hdrLinear[i * 3 + 1] = gLin * boost;
    hdrLinear[i * 3 + 2] = bLin * boost;
  }

  // 3. Encode with open-ultrahdr
  const encOpts = wasm.createDefaultOptions();
  encOpts.baseQuality = Math.round(opts.quality);
  encOpts.gainMapQuality = 75;
  encOpts.targetHdrCapacity = opts.peakNits ? Math.log2(opts.peakNits / 203) : 3.0;
  encOpts.includeIsoMetadata = true;
  encOpts.includeUltrahdrV1 = true;
  encOpts.gainMapScale = 1;

  const result = wasm.encodeUltraHdr(
    new Uint8Array(sdrJpeg.buffer, sdrJpeg.byteOffset, sdrJpeg.byteLength),
    hdrLinear,
    encOpts,
  );

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, result);

  return {
    outputPath,
    outputSize: result.length,
    bitDepth: 10,
    encoder: "open-ultrahdr",
  };
}

/**
 * Detect whether a JPEG buffer contains Ultra HDR gain map data.
 */
export async function isUltraHdr(buffer: Buffer): Promise<boolean> {
  try {
    const wasm = await getUltraHdrWasm();
    return wasm.isUltraHdr(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
  } catch {
    return false;
  }
}

/**
 * Decode an Ultra HDR JPEG, extracting SDR base, gain map, and metadata.
 */
export async function decodeUltraHdr(buffer: Buffer): Promise<{
  sdrImage: Uint8Array;
  gainMap: Uint8Array;
  metadata: {
    version: string;
    baseRenditionIsHdr: boolean;
    hdrCapacityMin: number;
    hdrCapacityMax: number;
    gainMapMin: number[];
    gainMapMax: number[];
    gamma: number[];
    offsetSdr: number[];
    offsetHdr: number[];
  };
  width: number;
  height: number;
  gainMapWidth: number;
  gainMapHeight: number;
}> {
  const wasm = await getUltraHdrWasm();
  return wasm.decodeUltraHdr(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
}

/**
 * Get gain map metadata from an Ultra HDR JPEG without full decoding.
 */
export async function getUltraHdrMetadata(buffer: Buffer): Promise<{
  version: string;
  baseRenditionIsHdr: boolean;
  hdrCapacityMin: number;
  hdrCapacityMax: number;
  gainMapMin: number[];
  gainMapMax: number[];
}> {
  const wasm = await getUltraHdrWasm();
  return wasm.getMetadata(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
}

/**
 * Extract the SDR base from an Ultra HDR JPEG (strips gain map).
 */
export async function extractSdrBase(buffer: Buffer): Promise<Buffer> {
  const wasm = await getUltraHdrWasm();
  const result = wasm.extractSdrBase(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
  return Buffer.from(result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength));
}

/**
 * Validate gain map metadata and estimate HDR headroom.
 */
export async function validateUltraHdr(buffer: Buffer): Promise<{
  valid: boolean;
  meaningful: boolean;
  headroomStops: number;
}> {
  const wasm = await getUltraHdrWasm();
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const meta = wasm.getMetadata(uint8);
  return {
    valid: wasm.validateMetadata(meta),
    meaningful: wasm.isMeaningfulHdr(meta),
    headroomStops: wasm.estimateHdrHeadroom(meta),
  };
}

// ── Ultra HDR JPEG fallback (ultrahdr_app CLI) ──────────────

/**
 * Pack 8-bit RGBA buffer into RGBA1010102 format for ultrahdr_app.
 */
function packRgba1010102(rgba8: Buffer, pixelCount: number): Buffer {
  const out = Buffer.alloc(pixelCount * 4);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  for (let i = 0; i < pixelCount; i++) {
    const srcOff = i * 4;
    const r10 = (rgba8[srcOff] << 2) | (rgba8[srcOff] >> 6);
    const g10 = (rgba8[srcOff + 1] << 2) | (rgba8[srcOff + 1] >> 6);
    const b10 = (rgba8[srcOff + 2] << 2) | (rgba8[srcOff + 2] >> 6);
    const a2 = rgba8[srcOff + 3] >> 6;
    const packed = ((r10 & 0x3FF) | ((g10 & 0x3FF) << 10) | ((b10 & 0x3FF) << 20) | ((a2 & 0x3) << 30)) >>> 0;
    view.setUint32(i * 4, packed, true);
  }
  return out;
}

async function encodeUltraHdrCli(
  hdrBuffer: Buffer,
  outputPath: string,
  opts: HdrEncodeOptions,
): Promise<HdrEncodeResult> {
  const meta = await sharp(hdrBuffer).metadata();
  const width = meta.width!;
  const height = meta.height!;
  const pixelCount = width * height;

  const sdrJpeg = opts.sdrJpegPath || tmpPath(".jpg");
  const needsSdrCleanup = !opts.sdrJpegPath;
  if (!opts.sdrJpegPath) {
    await sharp(hdrBuffer).jpeg({ quality: 95, mozjpeg: true }).toFile(sdrJpeg);
  }

  const hdrRgba8 = await sharp(hdrBuffer).ensureAlpha().raw().toBuffer();
  const hdrPacked = packRgba1010102(hdrRgba8, pixelCount);
  const hdrRawPath = tmpPath(".raw");
  writeFileSync(hdrRawPath, hdrPacked);

  const sdrRgba = await sharp(hdrBuffer).toColourspace("srgb").ensureAlpha().raw().toBuffer();
  const sdrRawPath = tmpPath(".raw");
  writeFileSync(sdrRawPath, sdrRgba);

  const transferFlag = opts.transfer === "pq" ? "2" : "1";
  const hdrGamut = opts.colorSpace === "rec2020" ? "2" : opts.colorSpace === "display-p3" ? "1" : "0";

  const args = [
    "-m", "0", "-p", hdrRawPath, "-y", sdrRawPath, "-i", sdrJpeg,
    "-w", String(width), "-h", String(height),
    "-a", "5", "-b", "3", "-C", hdrGamut, "-c", "0",
    "-t", transferFlag, "-q", String(Math.round(opts.quality)), "-z", outputPath,
  ];

  mkdirSync(dirname(outputPath), { recursive: true });

  try {
    execFileSync("ultrahdr_app", args, { stdio: "pipe" });
  } finally {
    cleanupTemp(hdrRawPath, sdrRawPath);
    if (needsSdrCleanup) cleanupTemp(sdrJpeg);
  }

  const stat = statSync(outputPath);
  return { outputPath, outputSize: stat.size, bitDepth: 10, encoder: "ultrahdr_app" };
}

// ── Sharp Fallback ──────────────────────────────────────────

async function encodeSharpFallback(
  imageBuffer: Buffer,
  outputPath: string,
  opts: HdrEncodeOptions,
): Promise<HdrEncodeResult> {
  mkdirSync(dirname(outputPath), { recursive: true });

  if (opts.format === "jpeg" || opts.format === "ultrahdr-jpeg") {
    await sharp(imageBuffer).jpeg({ quality: opts.quality, mozjpeg: true }).toFile(outputPath);
    return {
      outputPath,
      outputSize: statSync(outputPath).size,
      bitDepth: 8,
      encoder: "sharp",
      warning: opts.format === "ultrahdr-jpeg"
        ? "open-ultrahdr not found; wrote standard JPEG instead. Install: npm install open-ultrahdr"
        : undefined,
    };
  }

  // AVIF fallback — try requested bit depth, fall back to 8
  try {
    await sharp(imageBuffer).avif({ quality: opts.quality, effort: opts.effort, bitdepth: opts.bitDepth as any }).toFile(outputPath);
    return { outputPath, outputSize: statSync(outputPath).size, bitDepth: opts.bitDepth, encoder: "sharp" };
  } catch {
    await sharp(imageBuffer).avif({ quality: opts.quality, effort: opts.effort }).toFile(outputPath);
    return {
      outputPath,
      outputSize: statSync(outputPath).size,
      bitDepth: 8,
      encoder: "sharp",
      warning: `Requested ${opts.bitDepth}-bit AVIF not supported by sharp prebuilt; used 8-bit. Install avifenc for HDR output.`,
    };
  }
}

// ── Main Encode Function ────────────────────────────────────

/**
 * Encode an image buffer to an HDR-capable format using the best available tool.
 *
 * Pipeline:
 *   1. sharp processes the image (gain map math, tone expansion, etc.)
 *   2. Result buffer is passed here for final encoding
 *   3. We pick the best encoder: external tool > sharp fallback
 *   4. External tools get a 16-bit PNG intermediate for max precision
 */
export async function encodeHdr(
  imageBuffer: Buffer,
  outputPath: string,
  opts: HdrEncodeOptions,
): Promise<HdrEncodeResult> {
  const tools = detectTools();

  // ── Ultra HDR JPEG ──
  if (opts.format === "ultrahdr-jpeg") {
    if (tools.openUltraHdr) {
      return encodeUltraHdrWasm(imageBuffer, outputPath, opts);
    }
    if (tools.ultrahdrApp) {
      return encodeUltraHdrCli(imageBuffer, outputPath, opts);
    }
    return encodeSharpFallback(imageBuffer, outputPath, opts);
  }

  // ── JPEG XL ──
  if (opts.format === "jxl") {
    if (tools.cjxl) {
      const tempPng = await writeTempPng16(imageBuffer);
      try {
        return await encodeJxlExternal(tempPng, outputPath, opts);
      } finally {
        cleanupTemp(tempPng);
      }
    }
    // No JXL fallback in sharp — write AVIF instead
    const avifPath = outputPath.replace(/\.jxl$/i, ".avif");
    const result = await encodeSharpFallback(imageBuffer, avifPath, opts);
    result.warning = "cjxl not found; wrote AVIF instead of JXL. Install: brew install jpeg-xl";
    return result;
  }

  // ── AVIF ──
  if (opts.format === "avif") {
    const needsExternal = opts.bitDepth > 8 || opts.transfer !== "sdr";
    if (needsExternal && tools.avifenc) {
      const tempPng = await writeTempPng16(imageBuffer);
      try {
        return await encodeAvifExternal(tempPng, outputPath, opts);
      } finally {
        cleanupTemp(tempPng);
      }
    }
    return encodeSharpFallback(imageBuffer, outputPath, opts);
  }

  // ── Standard JPEG ──
  return encodeSharpFallback(imageBuffer, outputPath, opts);
}

// ── Capabilities Report ─────────────────────────────────────

export interface HdrCapabilities {
  avif10bit: boolean;
  avif12bit: boolean;
  avifHdrMetadata: boolean;
  jxl: boolean;
  jxlHdr: boolean;
  ultraHdrJpeg: boolean;
  ultraHdrDecode: boolean;
  maxBitDepth: number;
  supportedFormats: HdrOutputFormat[];
  tools: ToolAvailability;
  versions: Record<string, string>;
}

export function getCapabilities(): HdrCapabilities {
  const tools = detectTools();
  const versions = getToolVersions();

  const formats: HdrOutputFormat[] = ["avif", "jpeg"];
  if (tools.cjxl) formats.push("jxl");
  if (tools.openUltraHdr || tools.ultrahdrApp) formats.push("ultrahdr-jpeg");

  return {
    avif10bit: tools.avifenc,
    avif12bit: tools.avifenc,
    avifHdrMetadata: tools.avifenc,
    jxl: tools.cjxl,
    jxlHdr: tools.cjxl,
    ultraHdrJpeg: tools.openUltraHdr || tools.ultrahdrApp,
    ultraHdrDecode: tools.openUltraHdr,
    maxBitDepth: tools.avifenc ? 12 : 8,
    supportedFormats: formats,
    tools,
    versions,
  };
}
