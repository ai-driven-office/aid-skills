#!/usr/bin/env bun
/**
 * UHD SDR-to-HDR Converter CLI
 *
 * Usage:
 *   bun sdr-to-hdr.ts convert <input> [output] [options]
 *   bun sdr-to-hdr.ts batch <dir> [options]
 *   bun sdr-to-hdr.ts preview <input>
 *   bun sdr-to-hdr.ts analyze <input>
 *   bun sdr-to-hdr.ts capabilities
 *   bun sdr-to-hdr.ts help
 */

import sharp from "sharp";
import { statSync, readdirSync, mkdirSync } from "fs";
import { join, basename, extname, resolve } from "path";
import { createInterface } from "readline";
import { encodeHdr, getCapabilities } from "./hdr-encode.ts";
import type {
  CliArgs,
  ConvertMethod,
  ConvertResult,
  AnalyzeResult,
  HistogramAnalysis,
  GainMapOptions,
  OutputFormat,
  HdrTransfer,
  PipeInput,
} from "./types.ts";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".avif", ".webp", ".tiff", ".tif", ".heif", ".heic", ".jxl"]);
const VALID_METHODS = new Set(["gainmap", "ai", "auto"]);
const VALID_MAP_TYPES = new Set(["rgb", "luminosity"]);
const VALID_FORMATS = new Set(["avif", "jxl", "jpeg", "ultrahdr-jpeg"]);
const VALID_COLOR_SPACES = new Set(["display-p3", "rec2020"]);
const VALID_TRANSFERS = new Set(["pq", "hlg", "sdr"]);

function parseOptionValue(argv: string[], i: number, flag: string): string {
  const value = argv[i + 1];
  if (value === undefined || value.startsWith("-")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

// ── Arg Parsing ──────────────────────────────────────────────

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    command: "help",
    method: "auto",
    headroom: 2.5,
    mapType: "rgb",
    gamma: 1.0,
    highlightBoost: 1.5,
    shadowLift: 1.2,
    format: "avif",
    bitDepth: 10,
    colorSpace: "display-p3",
    transfer: "pq",
    peakNits: 1000,
    strength: 0.7,
    aiModel: "auto",
    recursive: false,
    concurrency: 4,
    json: false,
    yes: false,
    dryRun: false,
    stdin: false,
  };

  const positional: string[] = [];
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];
    switch (arg) {
      case "-m": case "--method": args.method = parseOptionValue(argv, i, arg) as ConvertMethod; i++; break;
      case "--headroom": args.headroom = parseFloat(parseOptionValue(argv, i, arg)); i++; break;
      case "--map-type": args.mapType = parseOptionValue(argv, i, arg) as any; i++; break;
      case "--gamma": args.gamma = parseFloat(parseOptionValue(argv, i, arg)); i++; break;
      case "--highlight-boost": args.highlightBoost = parseFloat(parseOptionValue(argv, i, arg)); i++; break;
      case "--shadow-lift": args.shadowLift = parseFloat(parseOptionValue(argv, i, arg)); i++; break;
      case "-f": case "--format": args.format = parseOptionValue(argv, i, arg) as OutputFormat; i++; break;
      case "--bit-depth": args.bitDepth = parseInt(parseOptionValue(argv, i, arg), 10) as 8 | 10 | 12; i++; break;
      case "--color-space": args.colorSpace = parseOptionValue(argv, i, arg) as any; i++; break;
      case "--transfer": args.transfer = parseOptionValue(argv, i, arg) as HdrTransfer; i++; break;
      case "--peak-nits": args.peakNits = parseInt(parseOptionValue(argv, i, arg), 10); i++; break;
      case "--strength": args.strength = parseFloat(parseOptionValue(argv, i, arg)); i++; break;
      case "--model": args.aiModel = parseOptionValue(argv, i, arg); i++; break;
      case "-o": case "--output": args.output = parseOptionValue(argv, i, arg); i++; break;
      case "-r": case "--recursive": args.recursive = true; break;
      case "-c": case "--concurrency": args.concurrency = parseInt(parseOptionValue(argv, i, arg), 10); i++; break;
      case "--json": args.json = true; args.yes = true; break;
      case "--yes": case "-y": args.yes = true; break;
      case "--dry-run": args.dryRun = true; break;
      case "--stdin": args.stdin = true; break;
      default:
        if (arg.startsWith("-")) {
          throw new Error(`Unknown option: ${arg}`);
        }
        positional.push(arg);
        break;
    }
    i++;
  }

  const cmd = positional[0];
  if (cmd === "convert" || cmd === "c") { args.command = "convert"; args.input = positional[1]; if (positional[2] && !positional[2].startsWith("-")) args.output = positional[2]; }
  else if (cmd === "batch" || cmd === "b") { args.command = "batch"; args.input = positional[1]; }
  else if (cmd === "preview" || cmd === "p") { args.command = "preview"; args.input = positional[1]; }
  else if (cmd === "analyze" || cmd === "a") { args.command = "analyze"; args.input = positional[1]; }
  else if (cmd === "capabilities" || cmd === "caps") { args.command = "capabilities"; }

  return args;
}

function validateArgs(args: CliArgs): void {
  if (args.command === "capabilities" || args.command === "help") return;
  if (!VALID_METHODS.has(args.method)) throw new Error("--method must be gainmap, ai, or auto");
  if (!VALID_MAP_TYPES.has(args.mapType)) throw new Error("--map-type must be rgb or luminosity");
  if (!VALID_FORMATS.has(args.format)) throw new Error("--format must be avif, jxl, jpeg, or ultrahdr-jpeg");
  if (!VALID_COLOR_SPACES.has(args.colorSpace)) throw new Error("--color-space must be display-p3 or rec2020");
  if (!VALID_TRANSFERS.has(args.transfer)) throw new Error("--transfer must be pq, hlg, or sdr");
  if (![8, 10, 12].includes(args.bitDepth)) throw new Error("--bit-depth must be 8, 10, or 12");
  if (args.format === "jpeg" && args.bitDepth !== 8) throw new Error("JPEG output supports only --bit-depth 8");
  if (!Number.isInteger(args.concurrency) || args.concurrency <= 0) throw new Error("--concurrency must be a positive integer");
  if (Number.isNaN(args.headroom) || args.headroom < 0.5 || args.headroom > 8) throw new Error("--headroom must be between 0.5 and 8");
  if (Number.isNaN(args.gamma) || args.gamma <= 0) throw new Error("--gamma must be greater than 0");
  if (Number.isNaN(args.highlightBoost) || args.highlightBoost <= 0) throw new Error("--highlight-boost must be greater than 0");
  if (Number.isNaN(args.shadowLift) || args.shadowLift <= 0) throw new Error("--shadow-lift must be greater than 0");
  if (Number.isNaN(args.strength) || args.strength < 0 || args.strength > 1) throw new Error("--strength must be between 0 and 1");
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
    if (entry.isDirectory() && recursive) files.push(...collectImages(full, true));
    else if (entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) files.push(full);
  }
  return files;
}

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((r) => { rl.question(`\n${message} [y/N]: `, (a) => { rl.close(); r(a.trim().toLowerCase() === "y"); }); });
}

async function readPipeInput(): Promise<string[]> {
  const text = await Bun.stdin.text();
  try { const data: PipeInput = JSON.parse(text.trim()); if (data.paths) return data.paths; if (data.path) return [data.path]; } catch {}
  return text.trim().split("\n").filter(Boolean);
}

function formatExt(format: OutputFormat): string {
  switch (format) {
    case "avif": return ".avif";
    case "jxl": return ".jxl";
    case "jpeg": return ".jpg";
    case "ultrahdr-jpeg": return ".jpg";
  }
}

// ── Histogram Analysis ───────────────────────────────────────

async function analyzeHistogram(inputPath: string): Promise<HistogramAnalysis> {
  const { data, info } = await sharp(inputPath)
    .resize(512, 512, { fit: "inside" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const totalPixels = info.width * info.height;
  let shadowPixels = 0;
  let midtonePixels = 0;
  let highlightPixels = 0;
  let maxBrightness = 0;
  let shadowClipping = 0;
  let highlightClipping = 0;

  for (let i = 0; i < data.length; i++) {
    const v = data[i] / 255;
    if (v < 0.15) {
      shadowPixels++;
      if (v < 0.02) shadowClipping++;
    } else if (v > 0.85) {
      highlightPixels++;
      if (v > 0.98) highlightClipping++;
    } else {
      midtonePixels++;
    }
    if (v > maxBrightness) maxBrightness = v;
  }

  const minSignificant = data.reduce((min, v) => (v > 2 && v < min) ? v : min, 255);
  const maxSignificant = data.reduce((max, v) => (v < 253 && v > max) ? v : max, 0);
  const drStops = maxSignificant > minSignificant
    ? Math.log2(maxSignificant / Math.max(minSignificant, 1))
    : 6;

  return {
    shadowPercent: parseFloat(((shadowPixels / totalPixels) * 100).toFixed(1)),
    midtonePercent: parseFloat(((midtonePixels / totalPixels) * 100).toFixed(1)),
    highlightPercent: parseFloat(((highlightPixels / totalPixels) * 100).toFixed(1)),
    shadowClipping: (shadowClipping / totalPixels) > 0.02,
    highlightClipping: (highlightClipping / totalPixels) > 0.02,
    dynamicRange: parseFloat(drStops.toFixed(1)),
    peakBrightness: parseFloat(maxBrightness.toFixed(3)),
  };
}

// ── Gain Map Conversion ──────────────────────────────────────

async function convertWithGainMap(
  inputPath: string,
  outputPath: string,
  options: GainMapOptions,
  args: CliArgs,
): Promise<ConvertResult> {
  const start = performance.now();
  const inputStat = statSync(inputPath);
  const meta = await sharp(inputPath).metadata();

  let pipeline = sharp(inputPath)
    .gamma(options.gamma)
    .modulate({ brightness: 1 + (options.headroom / 10) });

  if (args.colorSpace === "rec2020") {
    pipeline = pipeline.toColorspace("rgb16");
  }

  const expandedBuffer = await pipeline.toBuffer();

  // Use the HDR encoder
  const encoded = await encodeHdr(expandedBuffer, outputPath, {
    format: args.format,
    bitDepth: args.bitDepth,
    colorSpace: args.colorSpace,
    transfer: args.transfer,
    quality: 80,
    effort: 6,
    peakNits: args.peakNits,
    sdrJpegPath: args.format === "ultrahdr-jpeg" ? inputPath : undefined,
  });

  const duration = performance.now() - start;

  return {
    input: inputPath,
    output: encoded.outputPath,
    method: "gainmap",
    inputFormat: (meta.format || "jpeg").toUpperCase(),
    outputFormat: args.format,
    inputSize: inputStat.size,
    outputSize: encoded.outputSize,
    headroom: options.headroom,
    colorSpace: args.colorSpace,
    bitDepth: encoded.bitDepth,
    transfer: args.transfer,
    encoder: encoded.encoder,
    duration,
    cicp: encoded.cicp,
    warning: encoded.warning,
  };
}

// ── AI Conversion ────────────────────────────────────────────

async function convertWithAI(
  inputPath: string,
  outputPath: string,
  args: CliArgs,
): Promise<ConvertResult> {
  const start = performance.now();
  const inputStat = statSync(inputPath);
  const meta = await sharp(inputPath).metadata();

  if (!process.env.FAL_KEY) {
    throw new Error("FAL_KEY environment variable is required for AI mode");
  }

  const { fal } = await import("@fal-ai/client");
  fal.config({ credentials: process.env.FAL_KEY });

  const imageBuffer = await sharp(inputPath).png().toBuffer();
  const base64 = `data:image/png;base64,${imageBuffer.toString("base64")}`;

  const result = await fal.subscribe("fal-ai/clarity-upscaler", {
    input: {
      image_url: base64,
      scale: 1,
      creativity: args.strength,
      prompt: "enhance HDR dynamic range, expand highlights and shadows, vivid colors",
    },
  }) as any;

  const imageUrl = result.data?.image?.url || result.image?.url;
  if (!imageUrl) throw new Error("No image URL in API response");

  const response = await fetch(imageUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  // Use the HDR encoder for AI output too
  const encoded = await encodeHdr(buffer, outputPath, {
    format: args.format,
    bitDepth: args.bitDepth,
    colorSpace: args.colorSpace,
    transfer: args.transfer,
    quality: 85,
    effort: 6,
    peakNits: args.peakNits,
    sdrJpegPath: args.format === "ultrahdr-jpeg" ? inputPath : undefined,
  });

  const duration = performance.now() - start;

  return {
    input: inputPath,
    output: encoded.outputPath,
    method: "ai",
    inputFormat: (meta.format || "jpeg").toUpperCase(),
    outputFormat: args.format,
    inputSize: inputStat.size,
    outputSize: encoded.outputSize,
    headroom: 2.5,
    colorSpace: args.colorSpace,
    bitDepth: encoded.bitDepth,
    transfer: args.transfer,
    encoder: encoded.encoder,
    duration,
    cost: 0.10,
    cicp: encoded.cicp,
    warning: encoded.warning,
  };
}

// ── Auto Method Selection ────────────────────────────────────

async function autoSelectMethod(inputPath: string): Promise<ConvertMethod> {
  const histogram = await analyzeHistogram(inputPath);
  if (histogram.highlightClipping && histogram.dynamicRange < 6) {
    return "ai";
  }
  return "gainmap";
}

// ── Commands ─────────────────────────────────────────────────

async function cmdConvert(args: CliArgs): Promise<void> {
  const input = args.stdin ? (await readPipeInput())[0] : args.input;
  if (!input) throw new Error("Input required. Usage: bun sdr-to-hdr.ts convert <input> [output]");

  const ext = formatExt(args.format);
  const output = args.output || input.replace(extname(input), `-hdr${ext}`);
  let method = args.method;

  if (method === "auto") {
    method = await autoSelectMethod(resolve(input));
    if (!args.json) console.log(`Auto-selected method: ${method}`);
  }

  if (args.dryRun) {
    const cost = method === "ai" ? "~$0.10" : "free (local)";
    const caps = getCapabilities();
    console.log(`\nDry Run: ${basename(input)} \u2192 HDR`);
    console.log(`  Method: ${method}`);
    console.log(`  Headroom: ${args.headroom} stops`);
    console.log(`  Format: ${args.format.toUpperCase()} ${args.bitDepth}-bit`);
    console.log(`  Transfer: ${args.transfer.toUpperCase()} (${args.colorSpace})`);
    if (args.peakNits && args.transfer !== "sdr") console.log(`  Peak brightness: ${args.peakNits} nits`);
    console.log(`  Encoder: ${args.format === "avif" && caps.avif10bit ? "avifenc" : args.format === "jxl" && caps.jxl ? "cjxl" : args.format === "ultrahdr-jpeg" && caps.ultraHdrJpeg ? "open-ultrahdr" : "sharp (fallback)"}`);
    console.log(`  Cost: ${cost}`);
    console.log(`  Output: ${output}`);
    return;
  }

  if (method === "ai" && !args.yes) {
    const ok = await confirm(`AI mode costs ~$0.10 per image. Proceed?`);
    if (!ok) { console.log("Cancelled."); return; }
  }

  let result: ConvertResult;
  if (method === "gainmap") {
    result = await convertWithGainMap(resolve(input), resolve(output), {
      headroom: args.headroom,
      mapType: args.mapType,
      gamma: args.gamma,
      highlightBoost: args.highlightBoost,
      shadowLift: args.shadowLift,
    }, args);
  } else {
    result = await convertWithAI(resolve(input), resolve(output), args);
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\n${basename(result.input)} \u2192 ${basename(result.output)}`);
    console.log(`  Method: ${result.method}, Encoder: ${result.encoder}`);
    console.log(`  ${humanSize(result.inputSize)} \u2192 ${humanSize(result.outputSize)}`);
    console.log(`  ${result.bitDepth}-bit ${result.outputFormat.toUpperCase()}, ${result.transfer.toUpperCase()} (${result.colorSpace})`);
    if (result.cicp) {
      console.log(`  CICP: ${result.cicp.primaries}/${result.cicp.transfer}/${result.cicp.matrix}`);
    }
    if (result.warning) {
      console.log(`  \u26A0 ${result.warning}`);
    }
    console.log(`  Time: ${(result.duration / 1000).toFixed(2)}s`);
    if (result.cost) console.log(`  Cost: $${result.cost.toFixed(2)}`);
  }
}

async function cmdBatch(args: CliArgs): Promise<void> {
  const dir = args.input;
  if (!dir) throw new Error("Directory required. Usage: bun sdr-to-hdr.ts batch <dir>");

  const files = collectImages(dir, args.recursive);
  if (files.length === 0) { console.log("No image files found."); return; }

  const outDir = args.output || join(dir, "hdr");
  const isAi = args.method === "ai";
  const estCost = isAi ? `~$${(files.length * 0.1).toFixed(2)}` : "free (local)";

  console.log(`\nBatch SDR\u2192HDR: ${files.length} images`);
  console.log(`  Method: ${args.method}, Headroom: ${args.headroom} stops`);
  console.log(`  Format: ${args.format.toUpperCase()} ${args.bitDepth}-bit ${args.transfer.toUpperCase()}`);
  console.log(`  Est. cost: ${estCost}`);
  console.log(`  Output: ${outDir}`);

  if (args.dryRun) return;

  if (!args.yes) {
    const ok = await confirm("Proceed?");
    if (!ok) { console.log("Cancelled."); return; }
  }

  mkdirSync(outDir, { recursive: true });
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < files.length) {
      const idx = nextIndex++;
      const file = files[idx];
      const ext = formatExt(args.format);
      const output = join(outDir, basename(file, extname(file)) + ext);
      process.stderr.write(`\r  Converting ${idx + 1}/${files.length}: ${basename(file)}  `);

      try {
        let method = args.method;
        if (method === "auto") method = await autoSelectMethod(resolve(file));

        if (method === "gainmap") {
          await convertWithGainMap(resolve(file), resolve(output), {
            headroom: args.headroom,
            mapType: args.mapType,
            gamma: args.gamma,
            highlightBoost: args.highlightBoost,
            shadowLift: args.shadowLift,
          }, args);
        } else {
          await convertWithAI(resolve(file), resolve(output), args);
        }
      } catch (err) {
        console.error(`\n  Error: ${basename(file)}: ${(err as Error).message}`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(args.concurrency, files.length) }, () => worker());
  await Promise.all(workers);

  process.stderr.write("\r" + " ".repeat(60) + "\r");
  console.log(`\nDone: ${files.length} images converted to HDR`);
  console.log(`  Output: ${outDir}`);
}

async function cmdAnalyze(args: CliArgs): Promise<void> {
  const input = args.stdin ? (await readPipeInput())[0] : args.input;
  if (!input) throw new Error("Input required. Usage: bun sdr-to-hdr.ts analyze <input>");

  const meta = await sharp(resolve(input)).metadata();
  const histogram = await analyzeHistogram(resolve(input));
  const method = await autoSelectMethod(resolve(input));
  const bitDepth = meta.depth === "ushort" ? 16 : meta.depth === "float" ? 32 : 8;
  const caps = getCapabilities();

  let potential: "high" | "medium" | "low" = "medium";
  let quality = 3;

  if (histogram.highlightClipping && histogram.dynamicRange < 7) {
    potential = "high";
    quality = 4;
  } else if (histogram.dynamicRange > 7.5) {
    potential = "low";
    quality = 2;
  }

  const result: AnalyzeResult = {
    file: basename(input),
    width: meta.width || 0,
    height: meta.height || 0,
    format: (meta.format || "unknown").toUpperCase(),
    bitDepth,
    colorSpace: meta.space || "sRGB",
    currentDR: histogram.dynamicRange,
    histogram,
    potential,
    recommendedMethod: method,
    recommendedHeadroom: potential === "high" ? 3.0 : 2.5,
    suggestedCommand: `bun sdr-to-hdr.ts convert ${basename(input)} -m ${method} --headroom ${potential === "high" ? 3.0 : 2.5} --transfer pq`,
    quality,
  };

  if (args.json) {
    console.log(JSON.stringify({ ...result, capabilities: caps }, null, 2));
  } else {
    const stars = "\u2605".repeat(quality) + "\u2606".repeat(5 - quality);
    console.log(`\nHDR Potential Analysis: ${result.file}`);
    console.log("\u2500".repeat(40));
    console.log(`  Dimensions:     ${result.width} x ${result.height}`);
    console.log(`  Format:         ${result.format} (${result.bitDepth}-bit, ${result.colorSpace})`);
    console.log(`  Current DR:     ~${result.currentDR} stops (estimated)\n`);
    console.log(`  Histogram Analysis:`);
    console.log(`    Shadows (0-15%):     ${histogram.shadowPercent}% of pixels ${histogram.shadowClipping ? "\u2014 CLIPPING DETECTED" : ""}`);
    console.log(`    Midtones (15-85%):   ${histogram.midtonePercent}% of pixels`);
    console.log(`    Highlights (85-100%): ${histogram.highlightPercent}% of pixels ${histogram.highlightClipping ? "\u2014 CLIPPING DETECTED" : ""}`);
    console.log(`\n  HDR Expansion Potential: ${potential.toUpperCase()}`);
    console.log(`    Recommended method:  ${result.recommendedMethod}`);
    console.log(`    Recommended headroom: ${result.recommendedHeadroom} stops`);
    console.log(`    Estimated quality:   ${stars}`);
    console.log(`\n  HDR Capabilities:`);
    console.log(`    AVIF 10-bit: ${caps.avif10bit ? "\u2705 avifenc" : "\u274C (install: brew install libavif)"}`);
    console.log(`    JPEG XL:     ${caps.jxl ? "\u2705 cjxl" : "\u274C (install: brew install jpeg-xl)"}`);
    console.log(`    Ultra HDR:   ${caps.ultraHdrJpeg ? "\u2705 open-ultrahdr" : "\u274C (install: npm install open-ultrahdr)"}`);
    console.log(`\n  Suggested command:`);
    console.log(`    ${result.suggestedCommand}\n`);
  }
}

async function cmdPreview(args: CliArgs): Promise<void> {
  const input = args.input;
  if (!input) throw new Error("Input required. Usage: bun sdr-to-hdr.ts preview <input>");

  const meta = await sharp(resolve(input)).metadata();
  const histogram = await analyzeHistogram(resolve(input));

  console.log(`\nHDR Preview: ${basename(input)}`);
  console.log("\u2500".repeat(40));
  console.log(`  Original: ${meta.width}x${meta.height}, ${meta.format?.toUpperCase()}`);
  console.log(`  DR: ~${histogram.dynamicRange} stops`);
  console.log(`\n  Headroom simulation:`);
  for (const headroom of [1.5, 2.5, 4.0]) {
    const expansion = (headroom / 4.0) * 100;
    const bar = "\u2588".repeat(Math.round(expansion / 5)) + "\u2591".repeat(20 - Math.round(expansion / 5));
    console.log(`    ${headroom.toFixed(1)} stops: [${bar}] ${expansion.toFixed(0)}% expansion`);
  }
  console.log(`\n  Transfer functions:`);
  console.log(`    PQ (HDR10):  Up to 10,000 nits \u2014 best for mastered HDR content`);
  console.log(`    HLG:         Up to 1,000 nits  \u2014 broadcast-compatible, graceful SDR fallback`);
  console.log(`\n  Output formats:`);
  const caps = getCapabilities();
  for (const fmt of caps.supportedFormats) {
    const label = fmt === "avif" ? "AVIF 10-bit" : fmt === "jxl" ? "JPEG XL" : fmt === "ultrahdr-jpeg" ? "Ultra HDR JPEG" : "JPEG";
    console.log(`    ${fmt.padEnd(16)} ${label}`);
  }
  console.log(`\n  To convert: bun sdr-to-hdr.ts convert ${basename(input)} --headroom 2.5 --transfer pq`);
}

function cmdCapabilities(args: CliArgs): void {
  const caps = getCapabilities();

  if (args.json) {
    console.log(JSON.stringify(caps, null, 2));
    return;
  }

  console.log(`\nHDR Encoding Capabilities`);
  console.log("\u2500".repeat(40));
  console.log(`  AVIF 10/12-bit:  ${caps.avif10bit ? "\u2705" : "\u274C"}  ${caps.versions.avifenc || "(avifenc not found)"}`);
  console.log(`  AVIF HDR CICP:   ${caps.avifHdrMetadata ? "\u2705" : "\u274C"}  PQ/HLG/BT.2020 metadata`);
  console.log(`  JPEG XL:         ${caps.jxl ? "\u2705" : "\u274C"}  ${caps.versions.cjxl || "(cjxl not found)"}`);
  console.log(`  JPEG XL HDR:     ${caps.jxlHdr ? "\u2705" : "\u274C"}  Rec2100PQ/HLG`);
  console.log(`  Ultra HDR JPEG:  ${caps.ultraHdrJpeg ? "\u2705" : "\u274C"}  ${caps.versions.openUltraHdr || caps.versions.ultrahdrApp || "(not found)"}`);
  console.log(`  Ultra HDR decode:${caps.ultraHdrDecode ? " \u2705" : " \u274C"}  ISO 21496-1 gain map read/validate`);
  console.log(`  Max bit depth:   ${caps.maxBitDepth}-bit`);
  console.log(`  Formats:         ${caps.supportedFormats.join(", ")}`);
  console.log(`\n  Install missing tools:`);
  if (!caps.avif10bit) console.log(`    brew install libavif       # avifenc for 10/12-bit AVIF`);
  if (!caps.jxl) console.log(`    brew install jpeg-xl       # cjxl/djxl for JPEG XL`);
  if (!caps.ultraHdrJpeg) console.log(`    npm install open-ultrahdr  # Ultra HDR JPEG encode/decode`);
  if (caps.avif10bit && caps.jxl && caps.ultraHdrJpeg) console.log(`    All HDR tools installed!`);
}

function cmdHelp(): void {
  console.log(`
UHD SDR-to-HDR Converter

Usage:
  bun sdr-to-hdr.ts <command> [options]

Commands:
  convert <input> [out]  Convert SDR to HDR
  batch <dir>            Batch convert directory
  preview <input>        Preview HDR expansion potential
  analyze <input>        Analyze image's HDR potential
  capabilities           Show HDR encoding capabilities
  help                   Show this help

Method Options:
  -m, --method <m>       gainmap, ai, auto (default: auto)
  --headroom <stops>     Target HDR headroom 1.0-4.0 (default: 2.5)
  --map-type <type>      rgb or luminosity (default: rgb)
  --gamma <value>        Gain map gamma (default: 1.0)
  --highlight-boost <v>  Highlight boost factor (default: 1.5)
  --shadow-lift <v>      Shadow lift factor (default: 1.2)

AI Options:
  --strength <0-1>       Enhancement strength (default: 0.7)
  --model <name>         AI model (default: auto)

Output Options:
  -f, --format <fmt>     avif, jxl, jpeg, ultrahdr-jpeg (default: avif)
  --bit-depth <8|10|12>  Output bit depth (default: 10)
  --color-space <cs>     display-p3 or rec2020 (default: display-p3)
  --transfer <t>         pq, hlg, or sdr (default: pq)
  --peak-nits <n>        Peak brightness in nits (default: 1000)
  -o, --output <path>    Output path

General Options:
  --json                 JSON output
  --yes, -y              Skip confirmation
  --dry-run              Preview without processing
  --stdin                Read from stdin (piping)
  -r, --recursive        Recurse subdirectories (batch)
  -c <n>                 Concurrency (default: 4)

Environment:
  FAL_KEY                Required for AI mode only

HDR Formats:
  avif           10/12-bit AVIF with PQ/HLG CICP metadata (via avifenc)
  jxl            JPEG XL with Rec2100PQ/HLG color spaces (via cjxl)
  ultrahdr-jpeg  ISO 21496-1 Ultra HDR JPEG with gain map (via open-ultrahdr WASM)
                 SDR-compatible, HDR on Android 14+/iOS 18+/Chrome
  jpeg           Standard 8-bit JPEG (no HDR metadata)

Transfer Functions:
  pq             SMPTE ST 2084 Perceptual Quantizer (HDR10) — up to 10,000 nits
  hlg            Hybrid Log-Gamma (BBC/NHK) — broadcast-compatible SDR fallback
  sdr            Standard dynamic range (no HDR metadata)

Examples:
  bun sdr-to-hdr.ts convert photo.jpg --transfer pq --bit-depth 10
  bun sdr-to-hdr.ts convert photo.jpg -f jxl --transfer hlg --peak-nits 1000
  bun sdr-to-hdr.ts convert photo.jpg -f ultrahdr-jpeg --headroom 3
  bun sdr-to-hdr.ts batch ./photos -f avif --transfer pq --bit-depth 10
  bun sdr-to-hdr.ts analyze photo.jpg
  bun sdr-to-hdr.ts capabilities --json

Piping:
  echo '{"path":"photo.jpg"}' | bun sdr-to-hdr.ts convert --stdin
`.trim());
}

// ── Main ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  validateArgs(args);

  switch (args.command) {
    case "convert": await cmdConvert(args); break;
    case "batch": await cmdBatch(args); break;
    case "preview": await cmdPreview(args); break;
    case "analyze": await cmdAnalyze(args); break;
    case "capabilities": cmdCapabilities(args); break;
    case "help": default: cmdHelp(); break;
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
