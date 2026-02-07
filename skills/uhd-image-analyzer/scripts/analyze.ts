#!/usr/bin/env bun
/**
 * UHD Image Analyzer CLI
 *
 * Usage:
 *   bun analyze.ts inspect <file>
 *   bun analyze.ts metadata <file>
 *   bun analyze.ts hdr <file>
 *   bun analyze.ts compat <file>
 *   bun analyze.ts batch <dir> [--recursive] [--filter hdr|sdr]
 *   bun analyze.ts report <dir> -o <file>
 *   bun analyze.ts diff <file1> <file2>
 *   bun analyze.ts help
 */

import sharp from "sharp";
import { statSync, readdirSync, existsSync, writeFileSync } from "fs";
import { join, basename, extname, resolve } from "path";
import type {
  CliArgs,
  ImageInfo,
  HdrInfo,
  GainMapInfo,
  IccProfile,
  CompressionInfo,
  CompatEntry,
  CompatReport,
  BatchResult,
  BatchSummary,
  DiffResult,
  DiffEntry,
  PipeInput,
} from "./types.ts";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".avif", ".webp", ".tiff", ".tif", ".heif", ".heic", ".jxl"]);

// ── Arg Parsing ──────────────────────────────────────────────

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    command: "help",
    recursive: false,
    summary: false,
    json: false,
    quiet: false,
    stdin: false,
  };

  const positional: string[] = [];
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];
    switch (arg) {
      case "--recursive":
      case "-r":
        args.recursive = true;
        break;
      case "--filter":
        args.filter = argv[++i] as "hdr" | "sdr";
        break;
      case "--summary":
        args.summary = true;
        break;
      case "--json":
        args.json = true;
        break;
      case "--quiet":
      case "-q":
        args.quiet = true;
        break;
      case "--stdin":
        args.stdin = true;
        break;
      case "-o":
      case "--output":
        args.output = argv[++i];
        break;
      default:
        if (!arg.startsWith("-")) positional.push(arg);
        break;
    }
    i++;
  }

  const cmd = positional[0];
  if (cmd === "inspect" || cmd === "i") {
    args.command = "inspect";
    args.input = positional[1];
  } else if (cmd === "metadata" || cmd === "meta") {
    args.command = "metadata";
    args.input = positional[1];
  } else if (cmd === "hdr") {
    args.command = "hdr";
    args.input = positional[1];
  } else if (cmd === "compat") {
    args.command = "compat";
    args.input = positional[1];
  } else if (cmd === "batch") {
    args.command = "batch";
    args.input = positional[1];
  } else if (cmd === "report") {
    args.command = "report";
    args.input = positional[1];
  } else if (cmd === "diff") {
    args.command = "diff";
    args.input = positional[1];
    args.input2 = positional[2];
  }

  return args;
}

// ── Utilities ────────────────────────────────────────────────

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function collectImages(dir: string, recursive: boolean): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && recursive) {
      files.push(...collectImages(full, true));
    } else if (entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

async function readPipeInput(): Promise<string[]> {
  const text = await Bun.stdin.text();
  try {
    const data: PipeInput = JSON.parse(text.trim());
    if (data.paths) return data.paths;
    if (data.path) return [data.path];
  } catch {}
  return text.trim().split("\n").filter(Boolean);
}

// ── Core Analysis ────────────────────────────────────────────

async function analyzeImage(filePath: string): Promise<ImageInfo> {
  const absPath = resolve(filePath);
  const stat = statSync(absPath);
  const img = sharp(absPath);
  const meta = await img.metadata();
  const stats = await img.stats();

  const format = meta.format || "unknown";
  const colorSpace = detectColorSpace(meta);
  const hdr = detectHdr(meta, format);
  const iccProfile = parseIccProfile(meta);
  const compression = detectCompression(meta, format);

  return {
    path: absPath,
    filename: basename(absPath),
    format: format.toUpperCase(),
    mimeType: `image/${format === "jpeg" ? "jpeg" : format}`,
    width: meta.width || 0,
    height: meta.height || 0,
    fileSize: stat.size,
    fileSizeHuman: humanSize(stat.size),
    colorSpace,
    bitDepth: meta.depth ? parseBitDepth(meta.depth) : 8,
    channels: meta.channels || 3,
    hasAlpha: meta.hasAlpha || false,
    iccProfile: iccProfile || undefined,
    hdr,
    compression,
  };
}

function parseBitDepth(depth: string): number {
  if (depth === "uchar") return 8;
  if (depth === "ushort") return 16;
  if (depth === "float") return 32;
  if (depth === "char") return 8;
  if (depth === "short") return 16;
  if (depth === "int") return 32;
  if (depth === "double") return 64;
  return 8;
}

function detectColorSpace(meta: sharp.Metadata): string {
  if (meta.space === "srgb") return "sRGB";
  if (meta.space === "rgb") return "RGB";
  if (meta.space === "rgb16") return "RGB (16-bit)";
  if (meta.space === "cmyk") return "CMYK";
  if (meta.space === "lab") return "CIE Lab";
  if (meta.space === "b-w") return "Grayscale";
  if (meta.space === "grey16") return "Grayscale (16-bit)";
  if (meta.space) return meta.space;
  return "sRGB";
}

function detectHdr(meta: sharp.Metadata, format: string): HdrInfo {
  const bitDepth = meta.depth ? parseBitDepth(meta.depth) : 8;
  const reasons: string[] = [];
  let capable = false;
  let maxHeadroom: number | undefined;

  // Check bit depth
  if (bitDepth > 8) {
    reasons.push(`${bitDepth}-bit color depth`);
    capable = true;
  }

  // Check format
  if (format === "avif" && bitDepth > 8) {
    reasons.push("AVIF HDR format");
    capable = true;
    maxHeadroom = bitDepth >= 12 ? 4.0 : 3.0;
  }

  if (format === "heif" && bitDepth > 8) {
    reasons.push("HEIF with extended depth");
    capable = true;
  }

  // Check for wide gamut via ICC
  const space = meta.space || "";
  if (space.includes("p3") || space.includes("rec2020") || space.includes("prophoto")) {
    reasons.push(`Wide gamut color space (${space})`);
    capable = true;
  }

  // Gain map detection (basic heuristic)
  const gainMap = detectGainMap(meta, format);

  if (gainMap?.present) {
    reasons.push("Gain map detected");
    capable = true;
    maxHeadroom = gainMap.headroom;
  }

  const estimatedDR = capable ? (bitDepth > 8 ? 10 + (bitDepth - 8) : 8) : 8;

  return {
    capable,
    reason: capable ? reasons.join("; ") : "Standard dynamic range (8-bit, sRGB)",
    gainMap,
    colorSpace: detectColorSpace(meta),
    maxHeadroom,
    estimatedDR,
  };
}

function detectGainMap(meta: sharp.Metadata, format: string): GainMapInfo | null {
  // Basic gain map detection — full implementation requires parsing container format
  // JPEG gain maps use Multi-Picture Format (MPF) which sharp doesn't expose directly
  // AVIF gain maps use auxiliary image items

  // For now, detect based on available metadata signals
  if (format === "jpeg" && meta.pages && meta.pages > 1) {
    return {
      present: true,
      type: "unknown",
    };
  }

  return { present: false };
}

function parseIccProfile(meta: sharp.Metadata): IccProfile | null {
  if (!meta.icc) return null;

  // Try to extract ICC profile name from the raw buffer
  const icc = meta.icc;
  let name = "Unknown";

  // ICC profile header: bytes 16-19 = profile class, description at various offsets
  if (icc.length > 128) {
    // Try to extract desc tag
    try {
      const descStr = icc.toString("ascii", 0, 128);
      // Look for common profile names
      if (descStr.includes("sRGB")) name = "sRGB IEC61966-2.1";
      else if (descStr.includes("Display P3")) name = "Display P3";
      else if (descStr.includes("Adobe RGB")) name = "Adobe RGB (1998)";
      else if (descStr.includes("ProPhoto")) name = "ProPhoto RGB";
      else if (descStr.includes("Rec. 2020") || descStr.includes("Rec2020")) name = "Rec. 2020";
    } catch {}
  }

  return {
    name,
    colorSpace: meta.space || "rgb",
  };
}

function detectCompression(meta: sharp.Metadata, format: string): CompressionInfo {
  const losslessFormats = new Set(["png", "tiff", "gif", "bmp"]);
  return {
    codec: format.toUpperCase(),
    lossless: losslessFormats.has(format),
  };
}

// ── Browser Compatibility ────────────────────────────────────

function generateCompatReport(info: ImageInfo): CompatReport {
  const format = info.format.toLowerCase();
  const isHdr = info.hdr.capable;

  const desktop: CompatEntry[] = [];
  const mobile: CompatEntry[] = [];

  if (format === "avif") {
    desktop.push(
      { browser: "Chrome", version: "85+", support: isHdr ? "full" : "full", note: isHdr ? "Full HDR support" : "Full AVIF support" },
      { browser: "Edge", version: "85+", support: isHdr ? "full" : "full", note: isHdr ? "Full HDR support" : "Full AVIF support" },
      { browser: "Safari", version: "16.4+", support: isHdr ? "partial" : "full", note: isHdr ? "AVIF support, HDR varies by version" : "Full AVIF support" },
      { browser: "Opera", version: "71+", support: isHdr ? "full" : "full", note: isHdr ? "Full HDR support" : "Full AVIF support" },
      { browser: "Firefox", version: "93+", support: isHdr ? "partial" : "full", note: isHdr ? "AVIF SDR only, no HDR" : "Full AVIF support" },
    );
    mobile.push(
      { browser: "iOS Safari", version: "16.4+", support: isHdr ? "full" : "full", note: isHdr ? "AVIF + HDR (500M+ devices)" : "Full AVIF support" },
      { browser: "Chrome Android", version: "85+", support: "full", note: isHdr ? "Full HDR support" : "Full AVIF support" },
      { browser: "Samsung Internet", version: "15+", support: isHdr ? "partial" : "full", note: isHdr ? "AVIF yes, HDR limited" : "Full AVIF support" },
    );
  } else if (format === "webp") {
    desktop.push(
      { browser: "Chrome", version: "32+", support: "full", note: "Full WebP support" },
      { browser: "Edge", version: "18+", support: "full", note: "Full WebP support" },
      { browser: "Safari", version: "16+", support: "full", note: "Full WebP support" },
      { browser: "Firefox", version: "65+", support: "full", note: "Full WebP support" },
    );
    mobile.push(
      { browser: "iOS Safari", version: "16+", support: "full", note: "Full WebP support" },
      { browser: "Chrome Android", version: "32+", support: "full", note: "Full WebP support" },
    );
  } else if (format === "jpeg" || format === "jpg") {
    const hasGainMap = info.hdr.gainMap?.present;
    desktop.push(
      { browser: "Chrome", version: "All", support: hasGainMap ? "full" : "full", note: hasGainMap ? "JPEG + gain map HDR" : "Universal JPEG support" },
      { browser: "Edge", version: "All", support: hasGainMap ? "full" : "full", note: hasGainMap ? "JPEG + gain map HDR" : "Universal JPEG support" },
      { browser: "Safari", version: hasGainMap ? "18+" : "All", support: hasGainMap ? "partial" : "full", note: hasGainMap ? "ISO gain map support (Safari 18+)" : "Universal JPEG support" },
      { browser: "Firefox", version: "All", support: hasGainMap ? "none" : "full", note: hasGainMap ? "No gain map support" : "Universal JPEG support" },
    );
    mobile.push(
      { browser: "iOS Safari", version: hasGainMap ? "18+" : "All", support: hasGainMap ? "full" : "full", note: hasGainMap ? "HDR gain map support" : "Universal" },
      { browser: "Chrome Android", version: "All", support: hasGainMap ? "full" : "full", note: hasGainMap ? "Ultra HDR support (Android 14+)" : "Universal" },
    );
  } else if (format === "png") {
    desktop.push(
      { browser: "All browsers", version: "All", support: "full", note: "Universal PNG support" },
    );
    mobile.push(
      { browser: "All mobile", version: "All", support: "full", note: "Universal PNG support" },
    );
  }

  const hdrPercent = format === "avif" ? 85 : format === "jpeg" && info.hdr.gainMap?.present ? 75 : 0;

  return {
    file: info.filename,
    format: `${info.format}${isHdr ? " HDR" : ""} (${info.bitDepth}-bit, ${info.colorSpace})`,
    hdr: isHdr,
    desktop,
    mobile,
    recommendedFallback: format === "avif" ? "WebP (SDR) → JPEG (universal)" : format === "webp" ? "JPEG (universal)" : "None needed",
    hdrAudiencePercent: hdrPercent,
  };
}

// ── Output Formatting ────────────────────────────────────────

const ICON_OK = "\u2705";
const ICON_WARN = "\u26A0\uFE0F ";
const ICON_NO = "\u274C";
const LINE = "\u2500".repeat(42);

function printInspect(info: ImageInfo): void {
  console.log(`\nImage Inspection: ${info.filename}`);
  console.log(LINE);
  console.log(`  Format:       ${info.format}`);
  console.log(`  Dimensions:   ${info.width} x ${info.height}`);
  console.log(`  File size:    ${info.fileSizeHuman} (${info.fileSize.toLocaleString()} bytes)`);
  console.log(`  Color space:  ${info.colorSpace}`);
  console.log(`  Bit depth:    ${info.bitDepth}-bit`);
  console.log(`  Channels:     ${info.channels}${info.hasAlpha ? " (with alpha)" : ""}`);
  if (info.iccProfile) {
    console.log(`  ICC profile:  ${info.iccProfile.name}`);
  }
  console.log(`  HDR capable:  ${info.hdr.capable ? "Yes" : "No"} — ${info.hdr.reason}`);
  if (info.hdr.gainMap?.present) {
    console.log(`  Gain map:     Present (${info.hdr.gainMap.type || "detected"})`);
  }
  if (info.hdr.maxHeadroom) {
    console.log(`  Max headroom: ${info.hdr.maxHeadroom} stops`);
  }
  if (info.hdr.estimatedDR) {
    console.log(`  Est. DR:      ~${info.hdr.estimatedDR} stops`);
  }
  console.log(`  Compression:  ${info.compression.codec}${info.compression.lossless ? " (lossless)" : ""}`);
  console.log();
}

function printCompat(report: CompatReport): void {
  console.log(`\nBrowser Compatibility: ${report.file}`);
  console.log(LINE);
  console.log(`Format: ${report.format}\n`);

  console.log("Desktop:");
  for (const entry of report.desktop) {
    const icon = entry.support === "full" ? ICON_OK : entry.support === "partial" ? ICON_WARN : ICON_NO;
    console.log(`  ${icon} ${entry.browser} ${entry.version}`.padEnd(30) + entry.note);
  }

  console.log("\nMobile:");
  for (const entry of report.mobile) {
    const icon = entry.support === "full" ? ICON_OK : entry.support === "partial" ? ICON_WARN : ICON_NO;
    console.log(`  ${icon} ${entry.browser} ${entry.version}`.padEnd(30) + entry.note);
  }

  if (report.recommendedFallback !== "None needed") {
    console.log(`\nRecommended fallback: ${report.recommendedFallback}`);
  }
  if (report.hdrAudiencePercent > 0) {
    console.log(`HDR-capable audience: ~${report.hdrAudiencePercent}% of web traffic`);
  }
  console.log();
}

function printBatch(result: BatchResult): void {
  console.log(`\nBatch Analysis: ${result.total} files`);
  console.log(LINE);

  if (result.summary) {
    const s = result.summary;
    console.log(`  Total size:    ${humanSize(s.totalSize)}`);
    console.log(`  Avg size:      ${humanSize(s.avgSize)}`);
    console.log(`  HDR images:    ${s.hdrCount}`);
    console.log(`  SDR images:    ${s.sdrCount}`);
    console.log(`  Formats:       ${Object.entries(s.formats).map(([k, v]) => `${k}:${v}`).join(", ")}`);
    console.log(`  Color spaces:  ${Object.entries(s.colorSpaces).map(([k, v]) => `${k}:${v}`).join(", ")}`);
    console.log(`  Bit depths:    ${Object.entries(s.bitDepths).map(([k, v]) => `${k}-bit:${v}`).join(", ")}`);
  }

  if (result.errors > 0) {
    console.log(`  Errors:        ${result.errors}`);
  }

  console.log();
  for (const info of result.images) {
    const hdrTag = info.hdr.capable ? " [HDR]" : "";
    console.log(`  ${info.filename.padEnd(30)} ${info.format.padEnd(6)} ${(info.width + "x" + info.height).padEnd(12)} ${info.fileSizeHuman.padEnd(10)}${hdrTag}`);
  }
  console.log();
}

function printDiff(diff: DiffResult): void {
  console.log(`\nImage Diff`);
  console.log(LINE);
  console.log(`  File 1: ${diff.file1.filename}`);
  console.log(`  File 2: ${diff.file2.filename}\n`);

  for (const d of diff.differences) {
    const marker = d.significant ? " ***" : "";
    console.log(`  ${d.field.padEnd(20)} ${String(d.value1).padEnd(20)} ${String(d.value2).padEnd(20)}${marker}`);
  }
  console.log();
}

// ── Commands ─────────────────────────────────────────────────

async function cmdInspect(args: CliArgs): Promise<void> {
  const input = args.stdin ? (await readPipeInput())[0] : args.input;
  if (!input) throw new Error("File path required. Usage: bun analyze.ts inspect <file>");

  const info = await analyzeImage(input);
  if (args.json) {
    console.log(JSON.stringify(info, null, 2));
  } else {
    printInspect(info);
  }
}

async function cmdMetadata(args: CliArgs): Promise<void> {
  const input = args.stdin ? (await readPipeInput())[0] : args.input;
  if (!input) throw new Error("File path required. Usage: bun analyze.ts metadata <file>");

  const img = sharp(resolve(input));
  const meta = await img.metadata();

  if (args.json) {
    // Remove raw buffer fields for clean JSON
    const clean = { ...meta, icc: meta.icc ? `<${meta.icc.length} bytes>` : undefined, exif: meta.exif ? `<${meta.exif.length} bytes>` : undefined, xmp: meta.xmp ? `<${meta.xmp.length} bytes>` : undefined, iptc: meta.iptc ? `<${meta.iptc.length} bytes>` : undefined };
    console.log(JSON.stringify(clean, null, 2));
  } else {
    console.log(`\nMetadata: ${basename(input)}`);
    console.log(LINE);
    for (const [key, value] of Object.entries(meta)) {
      if (Buffer.isBuffer(value)) {
        console.log(`  ${key}: <${value.length} bytes>`);
      } else if (value !== undefined && value !== null) {
        console.log(`  ${key}: ${value}`);
      }
    }
    console.log();
  }
}

async function cmdHdr(args: CliArgs): Promise<void> {
  const input = args.stdin ? (await readPipeInput())[0] : args.input;
  if (!input) throw new Error("File path required. Usage: bun analyze.ts hdr <file>");

  const info = await analyzeImage(input);

  if (args.json) {
    console.log(JSON.stringify(info.hdr, null, 2));
  } else {
    console.log(`\nHDR Analysis: ${info.filename}`);
    console.log(LINE);
    console.log(`  HDR capable:     ${info.hdr.capable ? "Yes" : "No"}`);
    console.log(`  Reason:          ${info.hdr.reason}`);
    console.log(`  Color space:     ${info.hdr.colorSpace}`);
    console.log(`  Bit depth:       ${info.bitDepth}-bit`);
    if (info.hdr.gainMap?.present) {
      console.log(`  Gain map:        Present (${info.hdr.gainMap.type})`);
    } else {
      console.log(`  Gain map:        Not detected`);
    }
    if (info.hdr.maxHeadroom) {
      console.log(`  Max headroom:    ${info.hdr.maxHeadroom} stops`);
    }
    if (info.hdr.estimatedDR) {
      console.log(`  Estimated DR:    ~${info.hdr.estimatedDR} stops`);
    }
    console.log();
  }
}

async function cmdCompat(args: CliArgs): Promise<void> {
  const input = args.stdin ? (await readPipeInput())[0] : args.input;
  if (!input) throw new Error("File path required. Usage: bun analyze.ts compat <file>");

  const info = await analyzeImage(input);
  const report = generateCompatReport(info);

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printCompat(report);
  }
}

async function cmdBatch(args: CliArgs): Promise<void> {
  const dir = args.input;
  if (!dir) throw new Error("Directory path required. Usage: bun analyze.ts batch <dir>");

  const files = collectImages(dir, args.recursive);
  if (files.length === 0) {
    console.log("No image files found.");
    return;
  }

  const images: ImageInfo[] = [];
  let errors = 0;

  for (const file of files) {
    try {
      const info = await analyzeImage(file);
      if (args.filter === "hdr" && !info.hdr.capable) continue;
      if (args.filter === "sdr" && info.hdr.capable) continue;
      images.push(info);
    } catch (err) {
      errors++;
      if (!args.quiet) {
        console.error(`  Error analyzing ${basename(file)}: ${(err as Error).message}`);
      }
    }
  }

  const summary = computeSummary(images);
  const result: BatchResult = { total: files.length, analyzed: images.length, errors, images, summary };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printBatch(result);
  }
}

function computeSummary(images: ImageInfo[]): BatchSummary {
  const formats: Record<string, number> = {};
  const colorSpaces: Record<string, number> = {};
  const bitDepths: Record<number, number> = {};
  let totalSize = 0;
  let hdrCount = 0;

  for (const img of images) {
    totalSize += img.fileSize;
    formats[img.format] = (formats[img.format] || 0) + 1;
    colorSpaces[img.colorSpace] = (colorSpaces[img.colorSpace] || 0) + 1;
    bitDepths[img.bitDepth] = (bitDepths[img.bitDepth] || 0) + 1;
    if (img.hdr.capable) hdrCount++;
  }

  return {
    totalSize,
    avgSize: images.length > 0 ? Math.round(totalSize / images.length) : 0,
    formats,
    hdrCount,
    sdrCount: images.length - hdrCount,
    colorSpaces,
    bitDepths,
  };
}

async function cmdReport(args: CliArgs): Promise<void> {
  const dir = args.input;
  if (!dir) throw new Error("Directory path required. Usage: bun analyze.ts report <dir> -o <file>");

  const files = collectImages(dir, true);
  const images: ImageInfo[] = [];
  let errors = 0;

  for (const file of files) {
    try {
      images.push(await analyzeImage(file));
    } catch {
      errors++;
    }
  }

  const summary = computeSummary(images);
  const report = { directory: dir, total: files.length, analyzed: images.length, errors, summary, images };

  if (args.output) {
    const ext = extname(args.output).toLowerCase();
    if (ext === ".json") {
      writeFileSync(args.output, JSON.stringify(report, null, 2));
    } else {
      // Markdown report
      let md = `# Image Analysis Report\n\n`;
      md += `**Directory:** ${dir}\n`;
      md += `**Total files:** ${files.length} (${errors} errors)\n\n`;
      md += `## Summary\n\n`;
      md += `| Metric | Value |\n|--------|-------|\n`;
      md += `| Total size | ${humanSize(summary.totalSize)} |\n`;
      md += `| Average size | ${humanSize(summary.avgSize)} |\n`;
      md += `| HDR images | ${summary.hdrCount} |\n`;
      md += `| SDR images | ${summary.sdrCount} |\n\n`;
      md += `## Images\n\n`;
      md += `| File | Format | Dimensions | Size | HDR |\n|------|--------|------------|------|-----|\n`;
      for (const img of images) {
        md += `| ${img.filename} | ${img.format} | ${img.width}x${img.height} | ${img.fileSizeHuman} | ${img.hdr.capable ? "Yes" : "No"} |\n`;
      }
      writeFileSync(args.output, md);
    }
    console.log(`Report written to ${args.output}`);
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}

async function cmdDiff(args: CliArgs): Promise<void> {
  if (!args.input || !args.input2) {
    throw new Error("Two file paths required. Usage: bun analyze.ts diff <file1> <file2>");
  }

  const info1 = await analyzeImage(args.input);
  const info2 = await analyzeImage(args.input2);

  const differences: DiffEntry[] = [];
  const compare = (field: string, v1: string | number, v2: string | number, significant = false) => {
    if (v1 !== v2) differences.push({ field, value1: v1, value2: v2, significant });
  };

  compare("Format", info1.format, info2.format, true);
  compare("Dimensions", `${info1.width}x${info1.height}`, `${info2.width}x${info2.height}`, true);
  compare("File size", info1.fileSizeHuman, info2.fileSizeHuman);
  compare("Color space", info1.colorSpace, info2.colorSpace, true);
  compare("Bit depth", `${info1.bitDepth}-bit`, `${info2.bitDepth}-bit`, true);
  compare("Channels", info1.channels, info2.channels);
  compare("HDR capable", String(info1.hdr.capable), String(info2.hdr.capable), true);
  compare("Compression", info1.compression.codec, info2.compression.codec);

  const result: DiffResult = { file1: info1, file2: info2, differences };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printDiff(result);
  }
}

function cmdHelp(): void {
  console.log(`
UHD Image Analyzer

Usage:
  bun analyze.ts <command> [options]

Commands:
  inspect <file>         Full image inspection report
  metadata <file>        Raw EXIF/XMP metadata extraction
  hdr <file>             HDR capability analysis
  compat <file>          Browser/device compatibility matrix
  batch <dir>            Batch analyze directory
  report <dir> -o <file> Generate JSON or markdown report
  diff <file1> <file2>   Compare two images
  help                   Show this help

Options:
  --json                 JSON output
  --quiet, -q            Suppress non-error output
  --recursive, -r        Recurse into subdirectories (batch/report)
  --filter hdr|sdr       Filter by HDR capability (batch)
  --summary              Show summary table (batch)
  --stdin                Read file path(s) from stdin (piping)
  -o, --output <file>    Output file for report

Piping:
  echo '{"path":"photo.jpg"}' | bun analyze.ts inspect --stdin
  bun analyze.ts batch ./photos --json | bun ../uhd-image-optimization/scripts/optimize.ts batch --stdin
`.trim());
}

// ── Main ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  switch (args.command) {
    case "inspect": await cmdInspect(args); break;
    case "metadata": await cmdMetadata(args); break;
    case "hdr": await cmdHdr(args); break;
    case "compat": await cmdCompat(args); break;
    case "batch": await cmdBatch(args); break;
    case "report": await cmdReport(args); break;
    case "diff": await cmdDiff(args); break;
    case "help": default: cmdHelp(); break;
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
