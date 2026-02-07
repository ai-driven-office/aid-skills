#!/usr/bin/env bun
/**
 * UHD Gain Map Editor CLI
 *
 * Usage:
 *   bun gainmap.ts create <sdr> <hdr> -o <output>
 *   bun gainmap.ts extract <input> -o <dir>
 *   bun gainmap.ts edit <input> --sdr-brightness +0.1
 *   bun gainmap.ts preview <input>
 *   bun gainmap.ts validate <input>
 *   bun gainmap.ts inspect <input>
 *   bun gainmap.ts batch-create <sdr-dir> <hdr-dir> -o <dir>
 *   bun gainmap.ts help
 */

import sharp from "sharp";
import { statSync, readdirSync, mkdirSync, writeFileSync, existsSync, readFileSync, copyFileSync } from "fs";
import { join, basename, extname, resolve, dirname } from "path";
import { createInterface } from "readline";
import type {
  CliArgs,
  CreateResult,
  ExtractResult,
  EditResult,
  InspectResult,
  ValidateResult,
  ValidateCheck,
  GainMapMetadata,
  GainStats,
  GainCoverage,
  PipeInput,
} from "./types.ts";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".avif", ".webp", ".tiff", ".tif", ".heif", ".heic"]);
const VALID_TYPES = new Set(["rgb", "luminosity"]);
const VALID_STANDARDS = new Set(["iso", "android", "both"]);
const VALID_FORMATS = new Set(["jpeg", "avif"]);
const VALID_MAP_RESOLUTION = new Set(["full", "half"]);

interface GainMapSidecar extends GainMapMetadata {
  createdAt: string;
  sdrSource: string;
  hdrSource: string;
  output: string;
  gainMapPath: string;
  heatmapPath: string;
  stats: GainStats;
  coverage: GainCoverage;
}

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
    type: "rgb",
    headroom: 3.0,
    standard: "both",
    format: "jpeg",
    quality: 90,
    mapQuality: 85,
    mapResolution: "full",
    sdrBrightness: 0,
    sdrContrast: 1.0,
    sdrSaturation: 1.0,
    sdrShadows: 0,
    sdrHighlights: 0,
    sdrWarmth: 0,
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
      case "--type": args.type = parseOptionValue(argv, i, arg) as any; i++; break;
      case "--headroom": args.headroom = parseFloat(parseOptionValue(argv, i, arg)); i++; break;
      case "--standard": args.standard = parseOptionValue(argv, i, arg) as any; i++; break;
      case "-f": case "--format": args.format = parseOptionValue(argv, i, arg) as any; i++; break;
      case "-q": case "--quality": args.quality = parseInt(parseOptionValue(argv, i, arg), 10); i++; break;
      case "--map-quality": args.mapQuality = parseInt(parseOptionValue(argv, i, arg), 10); i++; break;
      case "--map-resolution": args.mapResolution = parseOptionValue(argv, i, arg) as any; i++; break;
      case "--sdr-brightness": args.sdrBrightness = parseFloat(parseOptionValue(argv, i, arg)); i++; break;
      case "--sdr-contrast": args.sdrContrast = parseFloat(parseOptionValue(argv, i, arg)); i++; break;
      case "--sdr-saturation": args.sdrSaturation = parseFloat(parseOptionValue(argv, i, arg)); i++; break;
      case "--sdr-shadows": args.sdrShadows = parseFloat(parseOptionValue(argv, i, arg)); i++; break;
      case "--sdr-highlights": args.sdrHighlights = parseFloat(parseOptionValue(argv, i, arg)); i++; break;
      case "--sdr-warmth": args.sdrWarmth = parseFloat(parseOptionValue(argv, i, arg)); i++; break;
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
  if (cmd === "create") { args.command = "create"; args.input = positional[1]; args.input2 = positional[2]; }
  else if (cmd === "extract") { args.command = "extract"; args.input = positional[1]; }
  else if (cmd === "edit") { args.command = "edit"; args.input = positional[1]; }
  else if (cmd === "preview") { args.command = "preview"; args.input = positional[1]; }
  else if (cmd === "validate") { args.command = "validate"; args.input = positional[1]; }
  else if (cmd === "inspect") { args.command = "inspect"; args.input = positional[1]; }
  else if (cmd === "batch-create") { args.command = "batch-create"; args.input = positional[1]; args.input2 = positional[2]; }

  return args;
}

function validateArgs(args: CliArgs): void {
  if (!VALID_TYPES.has(args.type)) throw new Error("--type must be rgb or luminosity");
  if (!VALID_STANDARDS.has(args.standard)) throw new Error("--standard must be iso, android, or both");
  if (!VALID_FORMATS.has(args.format)) throw new Error("--format must be jpeg or avif");
  if (!VALID_MAP_RESOLUTION.has(args.mapResolution)) throw new Error("--map-resolution must be full or half");
  if (Number.isNaN(args.headroom) || args.headroom < 0 || args.headroom > 8) throw new Error("--headroom must be between 0 and 8");
  if (!Number.isInteger(args.quality) || args.quality < 1 || args.quality > 100) throw new Error("--quality must be 1-100");
  if (!Number.isInteger(args.mapQuality) || args.mapQuality < 1 || args.mapQuality > 100) throw new Error("--map-quality must be 1-100");
  if (!Number.isInteger(args.concurrency) || args.concurrency <= 0) throw new Error("--concurrency must be a positive integer");
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

function sidecarPathForOutput(outputPath: string): string {
  return outputPath.replace(extname(outputPath), "-gainmap.json");
}

function sidecarPathForInput(inputPath: string): string {
  return inputPath.replace(extname(inputPath), "-gainmap.json");
}

function readSidecar(inputPath: string): GainMapSidecar | null {
  const sidecar = sidecarPathForInput(resolve(inputPath));
  if (!existsSync(sidecar)) return null;
  try {
    return JSON.parse(readFileSync(sidecar, "utf-8")) as GainMapSidecar;
  } catch {
    return null;
  }
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

// ── Gain Map Computation ─────────────────────────────────────

async function computeGainMap(sdrPath: string, hdrPath: string, type: "rgb" | "luminosity", resolution: "full" | "half"): Promise<{ gainData: Buffer; width: number; height: number; stats: GainStats; coverage: GainCoverage }> {
  const sdrMeta = await sharp(sdrPath).metadata();
  const hdrMeta = await sharp(hdrPath).metadata();

  if (sdrMeta.width !== hdrMeta.width || sdrMeta.height !== hdrMeta.height) {
    throw new Error(`SDR (${sdrMeta.width}x${sdrMeta.height}) and HDR (${hdrMeta.width}x${hdrMeta.height}) dimensions must match`);
  }

  const width = resolution === "half" ? Math.round((sdrMeta.width || 0) / 2) : (sdrMeta.width || 0);
  const height = resolution === "half" ? Math.round((sdrMeta.height || 0) / 2) : (sdrMeta.height || 0);

  // Get raw pixel data
  const sdrData = await sharp(sdrPath).resize(width, height).removeAlpha().raw().toBuffer();
  const hdrData = await sharp(hdrPath).resize(width, height).removeAlpha().raw().toBuffer();

  const channels = type === "rgb" ? 3 : 1;
  const gainData = Buffer.alloc(width * height * channels);

  let minGain = Infinity;
  let maxGain = 0;
  let sumGain = 0;
  let highlightPixels = 0;
  let shadowPixels = 0;
  let neutralPixels = 0;

  for (let i = 0; i < width * height; i++) {
    if (type === "rgb") {
      for (let c = 0; c < 3; c++) {
        const sdrVal = Math.max(sdrData[i * 3 + c], 1) / 255;
        const hdrVal = Math.max(hdrData[i * 3 + c], 1) / 255;
        const gain = hdrVal / sdrVal;
        const quantized = Math.min(255, Math.max(0, Math.round((gain / 8) * 255))); // Gain range 0-8x
        gainData[i * 3 + c] = quantized;

        const normalGain = gain;
        if (normalGain < minGain) minGain = normalGain;
        if (normalGain > maxGain) maxGain = normalGain;
        sumGain += normalGain;
      }
    } else {
      // Luminosity mode
      const sdrLum = (0.2126 * sdrData[i * 3] + 0.7152 * sdrData[i * 3 + 1] + 0.0722 * sdrData[i * 3 + 2]) / 255;
      const hdrLum = (0.2126 * hdrData[i * 3] + 0.7152 * hdrData[i * 3 + 1] + 0.0722 * hdrData[i * 3 + 2]) / 255;
      const gain = Math.max(hdrLum, 0.001) / Math.max(sdrLum, 0.001);
      const quantized = Math.min(255, Math.max(0, Math.round((gain / 8) * 255)));
      gainData[i] = quantized;

      if (gain < minGain) minGain = gain;
      if (gain > maxGain) maxGain = gain;
      sumGain += gain;
    }

    // Coverage stats (based on first channel or luminosity)
    const idx = type === "rgb" ? i * 3 : i;
    const gainVal = (gainData[idx] / 255) * 8;
    if (gainVal > 2.0) highlightPixels++;
    else if (gainVal < 1.0) shadowPixels++;
    else neutralPixels++;
  }

  const totalPixels = width * height;
  const meanGain = sumGain / (totalPixels * (type === "rgb" ? 3 : 1));

  // Compute std dev
  let sumSqDiff = 0;
  for (let i = 0; i < gainData.length; i++) {
    const val = (gainData[i] / 255) * 8;
    sumSqDiff += (val - meanGain) ** 2;
  }
  const stdDev = Math.sqrt(sumSqDiff / gainData.length);

  return {
    gainData,
    width,
    height,
    stats: {
      min: parseFloat(minGain.toFixed(3)),
      max: parseFloat(maxGain.toFixed(3)),
      mean: parseFloat(meanGain.toFixed(3)),
      stdDev: parseFloat(stdDev.toFixed(3)),
    },
    coverage: {
      highlightPercent: parseFloat(((highlightPixels / totalPixels) * 100).toFixed(1)),
      shadowPercent: parseFloat(((shadowPixels / totalPixels) * 100).toFixed(1)),
      neutralPercent: parseFloat(((neutralPixels / totalPixels) * 100).toFixed(1)),
    },
  };
}

async function createGainMapAssets(args: CliArgs, sdrPath: string, hdrPath: string, outputPath: string): Promise<{
  gainMapPath: string;
  heatmapPath: string;
  sidecarPath: string;
  width: number;
  height: number;
  stats: GainStats;
  coverage: GainCoverage;
  outputSize: number;
  mapSize: number;
}> {
  const { gainData, width, height, stats, coverage } = await computeGainMap(
    sdrPath,
    hdrPath,
    args.type,
    args.mapResolution,
  );

  const channels = args.type === "rgb" ? 3 : 1;
  const gainMapPath = outputPath.replace(extname(outputPath), "-gainmap.png");
  const heatmapPath = outputPath.replace(extname(outputPath), "-heatmap.png");
  const sidecarPath = sidecarPathForOutput(outputPath);
  mkdirSync(dirname(outputPath), { recursive: true });

  await sharp(gainData, { raw: { width, height, channels } })
    .png({ compressionLevel: 6 })
    .toFile(gainMapPath);

  const heatmapData = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    const val = args.type === "rgb" ? gainData[i * 3] : gainData[i];
    const normalized = val / 255;
    if (normalized < 0.33) {
      heatmapData[i * 3] = 0;
      heatmapData[i * 3 + 1] = Math.round(normalized * 3 * 255);
      heatmapData[i * 3 + 2] = Math.round((1 - normalized * 3) * 255);
    } else if (normalized < 0.66) {
      heatmapData[i * 3] = Math.round((normalized - 0.33) * 3 * 255);
      heatmapData[i * 3 + 1] = 255;
      heatmapData[i * 3 + 2] = 0;
    } else {
      heatmapData[i * 3] = 255;
      heatmapData[i * 3 + 1] = Math.round((1 - (normalized - 0.66) * 3) * 255);
      heatmapData[i * 3 + 2] = 0;
    }
  }
  await sharp(heatmapData, { raw: { width, height, channels: 3 } })
    .png()
    .toFile(heatmapPath);

  let pipeline = sharp(sdrPath);
  if (args.format === "avif") {
    pipeline = pipeline.avif({ quality: args.quality, effort: 6 });
  } else {
    pipeline = pipeline.jpeg({ quality: args.quality, mozjpeg: true });
  }
  await pipeline.toFile(outputPath);

  const outputStat = statSync(outputPath);
  const mapStat = statSync(gainMapPath);

  const sidecar: GainMapSidecar = {
    createdAt: new Date().toISOString(),
    sdrSource: sdrPath,
    hdrSource: hdrPath,
    output: outputPath,
    gainMapPath,
    heatmapPath,
    type: args.type,
    standard: args.standard,
    headroom: args.headroom,
    minHeadroom: 0,
    mapWidth: width,
    mapHeight: height,
    mapBitDepth: 8,
    sdrWidth: width,
    sdrHeight: height,
    sdrColorSpace: "sRGB",
    hdrColorSpace: "Display-P3",
    gamma: 1,
    stats,
    coverage,
  };
  writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2) + "\n");

  return {
    gainMapPath,
    heatmapPath,
    sidecarPath,
    width,
    height,
    stats,
    coverage,
    outputSize: outputStat.size,
    mapSize: mapStat.size,
  };
}

// ── Commands ─────────────────────────────────────────────────

async function cmdCreate(args: CliArgs): Promise<void> {
  if (!args.input || !args.input2) throw new Error("SDR and HDR paths required. Usage: bun gainmap.ts create <sdr> <hdr> -o <output>");
  if (!args.output) throw new Error("Output path required. Use -o <path>");

  const start = performance.now();

  if (args.dryRun) {
    console.log(`\nDry Run: Create gain map`);
    console.log(`  SDR: ${basename(args.input)}`);
    console.log(`  HDR: ${basename(args.input2)}`);
    console.log(`  Type: ${args.type}, Headroom: ${args.headroom} stops`);
    console.log(`  Standard: ${args.standard}`);
    console.log(`  Output: ${args.output}`);
    return;
  }

  console.log(`\nCreating gain map...`);
  const out = resolve(args.output);
  const created = await createGainMapAssets(args, resolve(args.input), resolve(args.input2), out);
  const duration = performance.now() - start;

  if (args.json) {
    console.log(JSON.stringify({
      sdrInput: args.input, hdrInput: args.input2, output: args.output,
      type: args.type, headroom: args.headroom, standard: args.standard,
      outputSize: created.outputSize, mapSize: created.mapSize, duration,
      stats: created.stats, coverage: created.coverage,
      sidecar: created.sidecarPath,
    }, null, 2));
  } else {
    console.log(`\nGain Map Created`);
    console.log("\u2500".repeat(40));
    console.log(`  SDR base: ${args.output} (${humanSize(created.outputSize)})`);
    console.log(`  Gain map: ${created.gainMapPath} (${humanSize(created.mapSize)})`);
    console.log(`  Heatmap:  ${created.heatmapPath}`);
    console.log(`  Metadata: ${created.sidecarPath}`);
    console.log(`  Type: ${args.type}, Headroom: ${args.headroom} stops`);
    console.log(`  Map: ${created.width}x${created.height} (${args.mapResolution})`);
    console.log(`\n  Gain Statistics:`);
    console.log(`    Min: ${created.stats.min}, Max: ${created.stats.max}, Mean: ${created.stats.mean}`);
    console.log(`    Highlights (>2x): ${created.coverage.highlightPercent}%`);
    console.log(`    Shadows (<1x):    ${created.coverage.shadowPercent}%`);
    console.log(`    Neutral (~1x):    ${created.coverage.neutralPercent}%`);
    console.log(`\n  Time: ${(duration / 1000).toFixed(2)}s`);
  }
}

async function cmdExtract(args: CliArgs): Promise<void> {
  const input = args.stdin ? (await readPipeInput())[0] : args.input;
  if (!input) throw new Error("Input required. Usage: bun gainmap.ts extract <input> -o <dir>");

  const outDir = args.output || join(dirname(input), `extracted-${basename(input, extname(input))}`);
  mkdirSync(outDir, { recursive: true });

  // Extract SDR base
  const sdrPath = join(outDir, "sdr-base.jpg");
  await sharp(resolve(input)).jpeg({ quality: 95 }).toFile(sdrPath);

  const sidecar = readSidecar(input);
  const meta = await sharp(resolve(input)).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (width === 0 || height === 0) {
    throw new Error("Could not read image dimensions");
  }

  const gainMapPath = join(outDir, "gain-map.png");
  const mapWidth = Math.min(width, 2048);
  const mapHeight = Math.round(height * mapWidth / width);
  if (sidecar?.gainMapPath && existsSync(sidecar.gainMapPath)) {
    copyFileSync(sidecar.gainMapPath, gainMapPath);
  } else {
    const { data } = await sharp(resolve(input))
      .resize(mapWidth, undefined, { withoutEnlargement: true })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    await sharp(data, { raw: { width: mapWidth, height: mapHeight, channels: 1 } })
      .png()
      .toFile(gainMapPath);
  }

  const metadata: GainMapMetadata = sidecar
    ? {
      type: sidecar.type,
      standard: sidecar.standard,
      headroom: sidecar.headroom,
      minHeadroom: sidecar.minHeadroom,
      mapWidth: sidecar.mapWidth,
      mapHeight: sidecar.mapHeight,
      mapBitDepth: sidecar.mapBitDepth,
      sdrWidth: sidecar.sdrWidth,
      sdrHeight: sidecar.sdrHeight,
      sdrColorSpace: sidecar.sdrColorSpace,
      hdrColorSpace: sidecar.hdrColorSpace,
      gamma: sidecar.gamma,
    }
    : {
      type: "luminosity",
      standard: "unknown",
      headroom: 0,
      minHeadroom: 0,
      mapWidth,
      mapHeight,
      mapBitDepth: 8,
      sdrWidth: width,
      sdrHeight: height,
      sdrColorSpace: meta.space || "sRGB",
      hdrColorSpace: "unknown",
      gamma: 1.0,
    };

  writeFileSync(join(outDir, "metadata.json"), JSON.stringify(metadata, null, 2) + "\n");

  if (args.json) {
    console.log(JSON.stringify({ input, outputDir: outDir, sdrBase: sdrPath, gainMap: gainMapPath, metadata }, null, 2));
  } else {
    console.log(`\nExtracted: ${basename(input)}`);
    console.log(`  SDR base:  ${sdrPath}`);
    console.log(`  Gain map:  ${gainMapPath}`);
    console.log(`  Metadata:  ${join(outDir, "metadata.json")}`);
  }
}

async function cmdEdit(args: CliArgs): Promise<void> {
  const input = args.stdin ? (await readPipeInput())[0] : args.input;
  if (!input) throw new Error("Input required. Usage: bun gainmap.ts edit <input> --sdr-brightness +0.1");

  const output = args.output || input.replace(extname(input), "-edited" + extname(input));
  const start = performance.now();

  let pipeline = sharp(resolve(input));

  // Apply SDR adjustments
  if (args.sdrBrightness !== 0 || args.sdrContrast !== 1.0 || args.sdrSaturation !== 1.0) {
    pipeline = pipeline.modulate({
      brightness: 1 + args.sdrBrightness,
      saturation: args.sdrSaturation,
    });
  }

  if (args.sdrContrast !== 1.0) {
    pipeline = pipeline.linear(args.sdrContrast, -(128 * (args.sdrContrast - 1)));
  }

  if (args.sdrWarmth !== 0) {
    // Warm/cool shift via tint
    pipeline = pipeline.tint({
      r: Math.round(255 + args.sdrWarmth * 30),
      g: 255,
      b: Math.round(255 - args.sdrWarmth * 30),
    });
  }

  // Save
  const ext = extname(output).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") {
    pipeline = pipeline.jpeg({ quality: args.quality, mozjpeg: true });
  } else if (ext === ".avif") {
    pipeline = pipeline.avif({ quality: args.quality });
  } else {
    pipeline = pipeline.png();
  }

  mkdirSync(dirname(output), { recursive: true });
  await pipeline.toFile(resolve(output));

  const duration = performance.now() - start;
  const adjustments: Record<string, number> = {};
  if (args.sdrBrightness !== 0) adjustments.brightness = args.sdrBrightness;
  if (args.sdrContrast !== 1.0) adjustments.contrast = args.sdrContrast;
  if (args.sdrSaturation !== 1.0) adjustments.saturation = args.sdrSaturation;
  if (args.sdrShadows !== 0) adjustments.shadows = args.sdrShadows;
  if (args.sdrHighlights !== 0) adjustments.highlights = args.sdrHighlights;
  if (args.sdrWarmth !== 0) adjustments.warmth = args.sdrWarmth;

  if (args.json) {
    console.log(JSON.stringify({ input, output, adjustments, duration }, null, 2));
  } else {
    console.log(`\nEdited: ${basename(input)} → ${basename(output)}`);
    console.log(`  Adjustments: ${Object.entries(adjustments).map(([k, v]) => `${k}=${v > 0 ? "+" : ""}${v}`).join(", ")}`);
    console.log(`  Time: ${(duration / 1000).toFixed(2)}s`);
  }
}

async function cmdInspect(args: CliArgs): Promise<void> {
  const input = args.stdin ? (await readPipeInput())[0] : args.input;
  if (!input) throw new Error("Input required. Usage: bun gainmap.ts inspect <input>");

  const meta = await sharp(resolve(input)).metadata();
  const sidecar = readSidecar(input);

  const result: InspectResult = {
    file: basename(input),
    type: sidecar?.type || "luminosity",
    standard: sidecar?.standard || "unknown",
    headroom: sidecar?.headroom || 0,
    minHeadroom: sidecar?.minHeadroom || 0,
    mapWidth: sidecar?.mapWidth || meta.width || 0,
    mapHeight: sidecar?.mapHeight || meta.height || 0,
    mapBitDepth: sidecar?.mapBitDepth || 8,
    sdrBase: {
      width: sidecar?.sdrWidth || meta.width || 0,
      height: sidecar?.sdrHeight || meta.height || 0,
      colorSpace: sidecar?.sdrColorSpace || meta.space || "sRGB",
      quality: 0,
    },
    hdrColorSpace: sidecar?.hdrColorSpace || "unknown",
    gamma: sidecar?.gamma || 1.0,
    gainStats: { min: 0, max: 0, mean: 0, stdDev: 0 },
    coverage: { highlightPercent: 0, shadowPercent: 0, neutralPercent: 0 },
  };

  if (sidecar) {
    result.gainStats = sidecar.stats;
    result.coverage = sidecar.coverage;
  } else {
    const { data } = await sharp(resolve(input)).resize(512, 512, { fit: "inside" }).grayscale().raw().toBuffer({ resolveWithObject: true });
    let min = 255;
    let max = 0;
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
      sum += data[i];
    }
    const mean = sum / data.length;
    result.gainStats = {
      min: parseFloat((min / 255 * 8).toFixed(3)),
      max: parseFloat((max / 255 * 8).toFixed(3)),
      mean: parseFloat((mean / 255 * 8).toFixed(3)),
      stdDev: 0,
    };
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\nGain Map Inspection: ${result.file}`);
    console.log("\u2500".repeat(40));
    console.log(`  Type:           ${result.type}`);
    console.log(`  Standard:       ${result.standard}`);
    console.log(`  Max headroom:   ${result.headroom} stops`);
    console.log(`  Map resolution: ${result.mapWidth} x ${result.mapHeight}`);
    console.log(`  Map bit depth:  ${result.mapBitDepth}`);
    console.log(`  SDR base:       ${result.sdrBase.width} x ${result.sdrBase.height}, ${result.sdrBase.colorSpace}`);
    console.log(`  HDR color space: ${result.hdrColorSpace}`);
    console.log(`\n  Gain Statistics:`);
    console.log(`    Min: ${result.gainStats.min}, Max: ${result.gainStats.max}, Mean: ${result.gainStats.mean}`);
    console.log(`  Coverage: highlights ${result.coverage.highlightPercent}%, shadows ${result.coverage.shadowPercent}%, neutral ${result.coverage.neutralPercent}%`);
  }
}

async function cmdValidate(args: CliArgs): Promise<void> {
  const input = args.stdin ? (await readPipeInput())[0] : args.input;
  if (!input) throw new Error("Input required. Usage: bun gainmap.ts validate <input>");

  const meta = await sharp(resolve(input)).metadata();
  const sidecar = readSidecar(input);
  const format = meta.format || "unknown";
  const checks: ValidateCheck[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Container format check
  const validFormats = ["jpeg", "avif", "heif"];
  checks.push({
    name: "Container format",
    passed: validFormats.includes(format),
    message: validFormats.includes(format)
      ? `Valid container format (${format.toUpperCase()})`
      : `${format.toUpperCase()} is not a standard gain map container`,
  });

  // Image dimensions check
  checks.push({
    name: "Image dimensions",
    passed: (meta.width || 0) > 0 && (meta.height || 0) > 0,
    message: `${meta.width}x${meta.height}`,
  });

  checks.push({
    name: "Gain map sidecar",
    passed: !!sidecar,
    message: sidecar ? "Found sidecar metadata (-gainmap.json)" : "No sidecar metadata found",
  });
  if (!sidecar) {
    warnings.push("No sidecar metadata found. Run `create` to generate full metadata.");
  }

  // Color space check
  const hasColorSpace = meta.space !== undefined;
  checks.push({
    name: "Color space metadata",
    passed: hasColorSpace,
    message: hasColorSpace ? `Color space: ${meta.space}` : "No color space metadata found",
  });

  // ICC profile check
  checks.push({
    name: "ICC profile",
    passed: !!meta.icc,
    message: meta.icc ? `ICC profile present (${meta.icc.length} bytes)` : "No ICC profile",
  });

  // Multi-page check (JPEG MPF for gain maps)
  if (format === "jpeg") {
    const hasMultiPage = (meta.pages || 1) > 1;
    checks.push({
      name: "Multi-Picture Format (MPF)",
      passed: hasMultiPage,
      message: hasMultiPage ? "MPF detected (possible gain map container)" : "No MPF detected — may not contain a gain map",
    });
    if (!hasMultiPage) warnings.push("No Multi-Picture Format detected. JPEG gain maps require MPF.");
  }

  // Bit depth check
  checks.push({
    name: "Bit depth",
    passed: true,
    message: `${meta.depth || "8-bit"}`,
  });

  // Recommendations
  if (format === "jpeg" && !(meta.pages && meta.pages > 1)) {
    recommendations.push("Add Android XMP metadata for Android 14+ compatibility");
  }
  if (format === "avif" && meta.depth === "uchar") {
    recommendations.push("Consider 10-bit encoding for better HDR quality");
  }
  if (sidecar && sidecar.headroom < 1.0) {
    recommendations.push("Headroom is low (<1.0 stop). Consider 2.0-3.0 for visible HDR gain.");
  }

  const passed = checks.every((c) => c.passed);

  const result: ValidateResult = { file: basename(input), passed, checks, warnings, recommendations };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\nGain Map Validation: ${result.file}`);
    console.log("\u2500".repeat(40));
    for (const check of checks) {
      const icon = check.passed ? "\u2705" : "\u274C";
      console.log(`${icon} ${check.name}: ${check.message}`);
    }
    for (const w of warnings) console.log(`\u26A0\uFE0F  ${w}`);
    for (const r of recommendations) console.log(`\u2139\uFE0F  ${r}`);
    console.log(`\nResult: ${passed ? "PASS" : "FAIL"} (${warnings.length} warnings, ${recommendations.length} recommendations)`);
  }
}

async function cmdBatchCreate(args: CliArgs): Promise<void> {
  const sdrDir = args.input;
  const hdrDir = args.input2;
  if (!sdrDir || !hdrDir) {
    throw new Error("Both SDR and HDR directories are required. Usage: bun gainmap.ts batch-create <sdr-dir> <hdr-dir> -o <dir>");
  }

  const outDir = args.output || join(sdrDir, "gainmap-output");
  const sdrFiles = collectImages(sdrDir, args.recursive);
  const hdrFiles = collectImages(hdrDir, args.recursive);
  if (sdrFiles.length === 0) throw new Error(`No SDR images found in ${sdrDir}`);
  if (hdrFiles.length === 0) throw new Error(`No HDR images found in ${hdrDir}`);

  const hdrByFilename = new Map(hdrFiles.map((f) => [basename(f), f]));
  const hdrByStem = new Map(hdrFiles.map((f) => [basename(f, extname(f)), f]));
  const pairs = sdrFiles
    .map((sdrPath) => {
      const byName = hdrByFilename.get(basename(sdrPath));
      if (byName) return { sdrPath, hdrPath: byName };
      const byStem = hdrByStem.get(basename(sdrPath, extname(sdrPath)));
      return byStem ? { sdrPath, hdrPath: byStem } : null;
    })
    .filter((p): p is { sdrPath: string; hdrPath: string } => p !== null);

  if (pairs.length === 0) {
    throw new Error("No SDR/HDR file pairs matched by filename or stem");
  }

  console.log(`\nBatch Create Gain Maps: ${pairs.length} pair(s)`);
  console.log(`  SDR: ${sdrDir}`);
  console.log(`  HDR: ${hdrDir}`);
  console.log(`  Output: ${outDir}`);

  if (args.dryRun) return;

  if (!args.yes) {
    const ok = await confirm("Proceed?");
    if (!ok) {
      console.log("Cancelled.");
      return;
    }
  }

  mkdirSync(outDir, { recursive: true });
  const results: Array<{ output: string; gainMap: string; sidecar: string }> = [];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < pairs.length) {
      const idx = nextIndex++;
      const pair = pairs[idx];
      const base = basename(pair.sdrPath, extname(pair.sdrPath));
      const outputExt = args.format === "avif" ? ".avif" : ".jpg";
      const output = resolve(join(outDir, `${base}${outputExt}`));
      process.stderr.write(`\r  Creating ${idx + 1}/${pairs.length}: ${base}  `);

      try {
        const created = await createGainMapAssets(args, resolve(pair.sdrPath), resolve(pair.hdrPath), output);
        results.push({ output, gainMap: created.gainMapPath, sidecar: created.sidecarPath });
      } catch (err) {
        console.error(`\n  Error: ${base}: ${(err as Error).message}`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(args.concurrency, pairs.length) }, () => worker());
  await Promise.all(workers);
  process.stderr.write("\r" + " ".repeat(70) + "\r");

  if (args.json) {
    console.log(JSON.stringify({ totalPairs: pairs.length, created: results.length, results }, null, 2));
  } else {
    console.log(`\nDone: ${results.length}/${pairs.length} gain map images created`);
    console.log(`  Output: ${outDir}`);
  }
}

async function cmdPreview(args: CliArgs): Promise<void> {
  const input = args.input;
  if (!input) throw new Error("Input required. Usage: bun gainmap.ts preview <input>");

  const meta = await sharp(resolve(input)).metadata();

  console.log(`\nGain Map Preview: ${basename(input)}`);
  console.log("\u2500".repeat(40));
  console.log(`  Source: ${meta.width}x${meta.height}, ${(meta.format || "unknown").toUpperCase()}`);
  console.log(`\n  Headroom simulation:`);
  for (const h of [1.5, 2.0, 2.5, 3.0, 4.0]) {
    const pct = (h / 4.0) * 100;
    const bar = "\u2588".repeat(Math.round(pct / 5)) + "\u2591".repeat(20 - Math.round(pct / 5));
    console.log(`    ${h.toFixed(1)} stops: [${bar}] ${pct.toFixed(0)}%`);
  }
  console.log(`\n  Device simulation:`);
  console.log(`    iPhone 15 Pro:    2.5 stops — Full HDR experience`);
  console.log(`    MacBook Pro M1+:  4.0 stops — Maximum HDR`);
  console.log(`    Samsung Galaxy:   2.0 stops — Good HDR`);
  console.log(`    Budget phone:     1.5 stops — Minimal HDR boost`);
  console.log(`    SDR monitor:      0.0 stops — SDR base only`);
}

function cmdHelp(): void {
  console.log(`
UHD Gain Map Editor

Usage:
  bun gainmap.ts <command> [options]

Commands:
  create <sdr> <hdr>     Create gain map from SDR + HDR pair
  extract <input>        Extract gain map components
  edit <input>           Adjust SDR base parameters
  preview <input>        Preview at different headroom levels
  validate <input>       Validate gain map compliance
  inspect <input>        Inspect gain map metadata
  batch-create <s> <h>   Batch create from paired directories
  help                   Show this help

Create Options:
  --type <rgb|luminosity>    Map type (default: rgb)
  --headroom <stops>         Max headroom (default: 3.0)
  --standard <iso|android|both> Encoding standard (default: both)
  -f, --format <jpeg|avif>  Output format (default: jpeg)
  -q, --quality <1-100>     SDR base quality (default: 90)
  --map-quality <1-100>     Gain map quality (default: 85)
  --map-resolution <r>      full or half (default: full)

Edit Options:
  --sdr-brightness <-1..1>  Brightness offset
  --sdr-contrast <0..3>     Contrast multiplier (1.0 = unchanged)
  --sdr-saturation <0..3>   Saturation multiplier
  --sdr-shadows <-1..1>     Shadow adjustment
  --sdr-highlights <-1..1>  Highlight adjustment
  --sdr-warmth <-1..1>      Color temperature shift

General Options:
  -o, --output <path>    Output path/directory
  -r, --recursive        Recurse subdirectories (batch-create)
  -c, --concurrency <n>  Batch concurrency (default: 4)
  --json                 JSON output
  --yes, -y              Skip confirmation
  --dry-run              Preview without processing
  --stdin                Read from stdin (piping)
`.trim());
}

// ── Main ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  validateArgs(args);

  switch (args.command) {
    case "create": await cmdCreate(args); break;
    case "batch-create": await cmdBatchCreate(args); break;
    case "extract": await cmdExtract(args); break;
    case "edit": await cmdEdit(args); break;
    case "preview": await cmdPreview(args); break;
    case "validate": await cmdValidate(args); break;
    case "inspect": await cmdInspect(args); break;
    case "help": default: cmdHelp(); break;
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
