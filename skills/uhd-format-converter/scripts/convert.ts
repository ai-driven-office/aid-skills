#!/usr/bin/env bun
/**
 * UHD Format Converter CLI
 *
 * Usage:
 *   bun convert.ts convert <input> -f <format> [options]
 *   bun convert.ts batch <dir> -f <format> [options]
 *   bun convert.ts compare <input> [--quality 60,75,85,95]
 *   bun convert.ts negotiate <input> --target <browsers>
 *   bun convert.ts help
 */

import sharp from "sharp";
import { statSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join, basename, extname, resolve, dirname } from "path";
import { createInterface } from "readline";
import type {
  CliArgs,
  ImageFormat,
  FormatConfig,
  ConvertJob,
  ConvertResult,
  CompareResult,
  CompareEntry,
  NegotiateResult,
  NegotiateEntry,
  PipeInput,
} from "./types.ts";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".avif", ".webp", ".tiff", ".tif", ".heif", ".heic", ".jxl"]);

const FORMATS: Record<ImageFormat, FormatConfig> = {
  avif: { id: "avif", displayName: "AVIF", extensions: [".avif"], mimeType: "image/avif", supportsHdr: true, supportsLossless: true, supportsAlpha: true, maxBitDepth: 12, defaultQuality: 75, defaultEffort: 6 },
  webp: { id: "webp", displayName: "WebP", extensions: [".webp"], mimeType: "image/webp", supportsHdr: false, supportsLossless: true, supportsAlpha: true, maxBitDepth: 8, defaultQuality: 80, defaultEffort: 6 },
  jpeg: { id: "jpeg", displayName: "JPEG", extensions: [".jpg", ".jpeg"], mimeType: "image/jpeg", supportsHdr: false, supportsLossless: false, supportsAlpha: false, maxBitDepth: 8, defaultQuality: 82, defaultEffort: 0 },
  png: { id: "png", displayName: "PNG", extensions: [".png"], mimeType: "image/png", supportsHdr: false, supportsLossless: true, supportsAlpha: true, maxBitDepth: 16, defaultQuality: 100, defaultEffort: 6 },
  jxl: { id: "jxl", displayName: "JPEG XL", extensions: [".jxl"], mimeType: "image/jxl", supportsHdr: true, supportsLossless: true, supportsAlpha: true, maxBitDepth: 32, defaultQuality: 75, defaultEffort: 7 },
  heif: { id: "heif", displayName: "HEIF", extensions: [".heif", ".heic"], mimeType: "image/heif", supportsHdr: true, supportsLossless: false, supportsAlpha: false, maxBitDepth: 10, defaultQuality: 80, defaultEffort: 0 },
  tiff: { id: "tiff", displayName: "TIFF", extensions: [".tiff", ".tif"], mimeType: "image/tiff", supportsHdr: false, supportsLossless: true, supportsAlpha: true, maxBitDepth: 32, defaultQuality: 100, defaultEffort: 0 },
};

// ── Arg Parsing ──────────────────────────────────────────────

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    command: "help",
    quality: -1, // sentinel: use format default
    lossless: false,
    effort: -1,
    strip: false,
    keepMetadata: true,
    recursive: false,
    preserveStructure: false,
    skipExisting: false,
    concurrency: 4,
    generate: false,
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
      case "-f": case "--format": args.format = argv[++i] as ImageFormat; break;
      case "-q": case "--quality": args.quality = parseInt(argv[++i], 10); break;
      case "--bit-depth": args.bitDepth = parseInt(argv[++i], 10) as 8 | 10 | 12 | 16; break;
      case "--color-space": args.colorSpace = argv[++i] as any; break;
      case "--lossless": args.lossless = true; break;
      case "--effort": args.effort = parseInt(argv[++i], 10); break;
      case "--chroma": args.chroma = argv[++i] as any; break;
      case "--strip": args.strip = true; args.keepMetadata = false; break;
      case "--keep-metadata": args.keepMetadata = true; break;
      case "--recursive": case "-r": args.recursive = true; break;
      case "--preserve-structure": args.preserveStructure = true; break;
      case "--skip-existing": args.skipExisting = true; break;
      case "-c": case "--concurrency": args.concurrency = parseInt(argv[++i], 10); break;
      case "--target": args.target = argv[++i]; break;
      case "--generate": args.generate = true; break;
      case "--quality-levels": args.qualities = argv[++i].split(",").map(Number); break;
      case "-o": case "--output": args.output = argv[++i]; break;
      case "--json": args.json = true; break;
      case "--yes": case "-y": args.yes = true; break;
      case "--dry-run": args.dryRun = true; break;
      case "--stdin": args.stdin = true; break;
      default: if (!arg.startsWith("-")) positional.push(arg); break;
    }
    i++;
  }

  const cmd = positional[0];
  if (cmd === "convert" || cmd === "c") {
    args.command = "convert";
    args.input = positional[1];
  } else if (cmd === "batch" || cmd === "b") {
    args.command = "batch";
    args.input = positional[1];
  } else if (cmd === "compare" || cmd === "cmp") {
    args.command = "compare";
    args.input = positional[1];
  } else if (cmd === "negotiate" || cmd === "neg") {
    args.command = "negotiate";
    args.input = positional[1];
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

function outputPath(input: string, format: ImageFormat, outDir?: string, suffix?: string): string {
  const base = basename(input, extname(input));
  const ext = FORMATS[format].extensions[0];
  const name = suffix ? `${base}${suffix}${ext}` : `${base}${ext}`;
  return outDir ? join(outDir, name) : join(dirname(input), name);
}

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`\n${message} [y/N]: `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
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

// ── Conversion Engine ────────────────────────────────────────

async function convertImage(job: ConvertJob): Promise<ConvertResult> {
  const start = performance.now();
  const inputStat = statSync(job.input);
  let pipeline = sharp(job.input);

  // Apply color space conversion if requested
  if (job.colorSpace === "display-p3") {
    pipeline = pipeline.toColorspace("srgb"); // sharp uses srgb internally, p3 via ICC
  }

  // Strip metadata if requested
  if (job.strip) {
    pipeline = pipeline.withMetadata({ orientation: undefined });
  } else {
    pipeline = pipeline.withMetadata();
  }

  // Apply format-specific encoding
  const quality = job.quality > 0 ? job.quality : FORMATS[job.format].defaultQuality;
  const effort = job.effort >= 0 ? job.effort : FORMATS[job.format].defaultEffort;

  switch (job.format) {
    case "avif":
      pipeline = pipeline.avif({ quality: job.lossless ? undefined : quality, effort, lossless: job.lossless });
      break;
    case "webp":
      pipeline = pipeline.webp({ quality: job.lossless ? undefined : quality, effort, lossless: job.lossless });
      break;
    case "jpeg":
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case "png":
      pipeline = pipeline.png({ effort, compressionLevel: Math.round(effort) });
      break;
    case "tiff":
      pipeline = pipeline.tiff({ quality });
      break;
    case "heif":
      pipeline = pipeline.heif({ quality });
      break;
    case "jxl":
      pipeline = pipeline.jxl({ quality: job.lossless ? undefined : quality, effort, lossless: job.lossless });
      break;
  }

  mkdirSync(dirname(job.output), { recursive: true });
  const outputInfo = await pipeline.toFile(job.output);
  const outputStat = statSync(job.output);
  const duration = performance.now() - start;
  const reduction = inputStat.size - outputStat.size;

  return {
    input: job.input,
    output: job.output,
    inputFormat: extname(job.input).slice(1).toUpperCase(),
    outputFormat: job.format,
    inputSize: inputStat.size,
    outputSize: outputStat.size,
    reduction,
    reductionPercent: `${((reduction / inputStat.size) * 100).toFixed(1)}%`,
    width: outputInfo.width,
    height: outputInfo.height,
    duration,
  };
}

// ── Commands ─────────────────────────────────────────────────

async function cmdConvert(args: CliArgs): Promise<void> {
  const input = args.stdin ? (await readPipeInput())[0] : args.input;
  if (!input) throw new Error("Input file required. Usage: bun convert.ts convert <input> -f <format>");
  if (!args.format) throw new Error("Output format required. Use -f avif|webp|jpeg|png|jxl|heif|tiff");

  const output = args.output || outputPath(input, args.format);

  const job: ConvertJob = {
    input: resolve(input),
    output: resolve(output),
    format: args.format,
    quality: args.quality,
    bitDepth: args.bitDepth,
    colorSpace: args.colorSpace,
    lossless: args.lossless,
    effort: args.effort,
    chroma: args.chroma,
    strip: args.strip,
  };

  if (args.dryRun) {
    const formatConf = FORMATS[args.format];
    console.log(`\nDry Run: ${basename(input)} → ${formatConf.displayName}`);
    console.log(`  Quality: ${args.quality > 0 ? args.quality : formatConf.defaultQuality}`);
    console.log(`  Lossless: ${args.lossless}`);
    console.log(`  Output: ${output}`);
    return;
  }

  const result = await convertImage(job);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\n${basename(result.input)} → ${basename(result.output)}`);
    console.log(`  ${humanSize(result.inputSize)} → ${humanSize(result.outputSize)} (${result.reductionPercent} reduction)`);
    console.log(`  ${result.width}x${result.height}, ${(result.duration / 1000).toFixed(2)}s`);
  }
}

async function cmdBatch(args: CliArgs): Promise<void> {
  const dir = args.input;
  if (!dir) throw new Error("Directory required. Usage: bun convert.ts batch <dir> -f <format>");
  if (!args.format) throw new Error("Output format required. Use -f avif|webp|jpeg|png|jxl|heif|tiff");

  const outDir = args.output || join(dir, `converted-${args.format}`);
  const files = collectImages(dir, args.recursive);

  if (files.length === 0) {
    console.log("No image files found.");
    return;
  }

  console.log(`\nBatch Convert: ${files.length} images → ${FORMATS[args.format].displayName}`);
  console.log(`  Output: ${outDir}`);

  if (!args.yes && !args.dryRun) {
    const ok = await confirm("Proceed?");
    if (!ok) { console.log("Cancelled."); return; }
  }

  if (args.dryRun) return;

  mkdirSync(outDir, { recursive: true });
  const results: ConvertResult[] = [];
  let totalInput = 0;
  let totalOutput = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const out = outputPath(file, args.format, outDir);

    if (args.skipExisting && existsSync(out)) {
      process.stderr.write(`\r  Skipping ${basename(file)} (exists)  `);
      continue;
    }

    process.stderr.write(`\r  Converting ${i + 1}/${files.length}: ${basename(file)}  `);

    try {
      const result = await convertImage({
        input: resolve(file),
        output: resolve(out),
        format: args.format,
        quality: args.quality,
        lossless: args.lossless,
        effort: args.effort,
        strip: args.strip,
        chroma: args.chroma,
      });
      results.push(result);
      totalInput += result.inputSize;
      totalOutput += result.outputSize;
    } catch (err) {
      console.error(`\n  Error: ${basename(file)}: ${(err as Error).message}`);
    }
  }

  process.stderr.write("\r" + " ".repeat(60) + "\r");

  if (args.json) {
    console.log(JSON.stringify({ results, totalInput, totalOutput, reduction: `${(((totalInput - totalOutput) / totalInput) * 100).toFixed(1)}%` }, null, 2));
  } else {
    console.log(`\nDone: ${results.length}/${files.length} images converted`);
    console.log(`  Total: ${humanSize(totalInput)} → ${humanSize(totalOutput)} (${(((totalInput - totalOutput) / totalInput) * 100).toFixed(1)}% reduction)`);
    console.log(`  Output: ${outDir}`);
  }
}

async function cmdCompare(args: CliArgs): Promise<void> {
  const input = args.stdin ? (await readPipeInput())[0] : args.input;
  if (!input) throw new Error("Input file required. Usage: bun convert.ts compare <input>");

  const inputStat = statSync(resolve(input));
  const meta = await sharp(resolve(input)).metadata();
  const qualities = args.qualities || [75, 85, 95];
  const formats: ImageFormat[] = ["avif", "webp", "jpeg", "jxl"];

  const outDir = args.output || join(dirname(input), `compare-${basename(input, extname(input))}`);
  mkdirSync(outDir, { recursive: true });

  const results: CompareEntry[] = [];

  for (const fmt of formats) {
    for (const q of qualities) {
      if (fmt === "png") continue; // PNG is lossless only
      const out = join(outDir, `${basename(input, extname(input))}-${fmt}-q${q}${FORMATS[fmt].extensions[0]}`);
      try {
        await convertImage({
          input: resolve(input),
          output: resolve(out),
          format: fmt,
          quality: q,
          lossless: false,
          effort: FORMATS[fmt].defaultEffort,
          strip: false,
        });
        const outStat = statSync(out);
        results.push({
          format: fmt,
          quality: q,
          size: outStat.size,
          sizeHuman: humanSize(outStat.size),
          reductionPercent: `${(((inputStat.size - outStat.size) / inputStat.size) * 100).toFixed(1)}%`,
          path: out,
        });
      } catch {}
    }

    // Lossless variant for formats that support it
    if (FORMATS[fmt].supportsLossless) {
      const out = join(outDir, `${basename(input, extname(input))}-${fmt}-lossless${FORMATS[fmt].extensions[0]}`);
      try {
        await convertImage({ input: resolve(input), output: resolve(out), format: fmt, quality: 100, lossless: true, effort: FORMATS[fmt].defaultEffort, strip: false });
        const outStat = statSync(out);
        results.push({ format: fmt, quality: 100, size: outStat.size, sizeHuman: humanSize(outStat.size), reductionPercent: `${(((inputStat.size - outStat.size) / inputStat.size) * 100).toFixed(1)}%`, path: out });
      } catch {}
    }
  }

  const compareResult: CompareResult = {
    input: basename(input),
    inputSize: inputStat.size,
    width: meta.width || 0,
    height: meta.height || 0,
    results,
  };

  if (args.json) {
    console.log(JSON.stringify(compareResult, null, 2));
  } else {
    console.log(`\nFormat Comparison: ${basename(input)} (${meta.width}x${meta.height}, ${humanSize(inputStat.size)})`);
    console.log("\u2500".repeat(55));

    const header = `${"Format".padEnd(8)} ${qualities.map((q) => `Q${q}`.padEnd(12)).join("")}${"Lossless".padEnd(12)}`;
    console.log(header);

    for (const fmt of formats) {
      let row = FORMATS[fmt].displayName.padEnd(8);
      for (const q of qualities) {
        const entry = results.find((r) => r.format === fmt && r.quality === q);
        row += (entry ? entry.sizeHuman : "\u2014").padEnd(12);
      }
      const lossless = results.find((r) => r.format === fmt && r.quality === 100);
      row += (lossless ? lossless.sizeHuman : "\u2014").padEnd(12);
      console.log(row);
    }

    const best = results.filter((r) => !r.path.includes("lossless")).sort((a, b) => a.size - b.size)[0];
    if (best) {
      console.log(`\nBest lossy: ${FORMATS[best.format].displayName} @ Q${best.quality} (${best.sizeHuman}, ${best.reductionPercent} reduction)`);
    }
    console.log(`Output: ${outDir}`);
  }
}

async function cmdNegotiate(args: CliArgs): Promise<void> {
  const input = args.stdin ? (await readPipeInput())[0] : args.input;
  if (!input) throw new Error("Input file required. Usage: bun convert.ts negotiate <input> --target <browsers>");

  const target = args.target || "modern";
  const recommendations: NegotiateEntry[] = [];
  let primary: ImageFormat = "avif";
  let fallback: ImageFormat = "webp";
  const universal: ImageFormat = "jpeg";

  if (target === "modern") {
    recommendations.push(
      { browser: "Chrome 85+", recommendedFormat: "avif", reason: "Full AVIF support, best compression" },
      { browser: "Edge 85+", recommendedFormat: "avif", reason: "Chromium-based, full AVIF" },
      { browser: "Safari 16.4+", recommendedFormat: "avif", reason: "AVIF support added" },
      { browser: "Firefox 93+", recommendedFormat: "avif", reason: "AVIF support" },
      { browser: "Older browsers", recommendedFormat: "webp", reason: "WebP fallback (98% support)" },
    );
  } else if (target === "universal") {
    primary = "webp";
    fallback = "jpeg";
    recommendations.push(
      { browser: "Modern browsers", recommendedFormat: "webp", reason: "98% browser support" },
      { browser: "Legacy browsers", recommendedFormat: "jpeg", reason: "Universal compatibility" },
    );
  } else {
    // Parse custom target
    const targets = target.split(",").map((t) => t.trim().toLowerCase());
    for (const t of targets) {
      if (t.includes("chrome") || t.includes("edge")) {
        recommendations.push({ browser: t, recommendedFormat: "avif", reason: "Full AVIF support" });
      } else if (t.includes("safari")) {
        recommendations.push({ browser: t, recommendedFormat: "avif", reason: "AVIF support in Safari 16.4+" });
      } else if (t.includes("firefox")) {
        recommendations.push({ browser: t, recommendedFormat: "avif", reason: "AVIF support in Firefox 93+" });
      }
    }
  }

  const result: NegotiateResult = { input: basename(input), primaryFormat: primary, fallbackFormat: fallback, universalFormat: universal, recommendations };

  if (args.generate && args.output) {
    mkdirSync(args.output, { recursive: true });
    const generatedFiles: string[] = [];

    for (const fmt of [primary, fallback, universal]) {
      const out = outputPath(input, fmt, args.output);
      if (!existsSync(out)) {
        await convertImage({ input: resolve(input), output: resolve(out), format: fmt, quality: FORMATS[fmt].defaultQuality, lossless: false, effort: FORMATS[fmt].defaultEffort, strip: false });
      }
      generatedFiles.push(out);
    }
    result.generatedFiles = generatedFiles;
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\nFormat Negotiation: ${basename(input)}`);
    console.log("\u2500".repeat(40));
    console.log(`  Primary:   ${FORMATS[primary].displayName}`);
    console.log(`  Fallback:  ${FORMATS[fallback].displayName}`);
    console.log(`  Universal: ${FORMATS[universal].displayName}\n`);
    for (const rec of recommendations) {
      console.log(`  ${rec.browser.padEnd(20)} → ${FORMATS[rec.recommendedFormat].displayName.padEnd(10)} (${rec.reason})`);
    }
    if (result.generatedFiles) {
      console.log(`\nGenerated files:`);
      for (const f of result.generatedFiles) console.log(`  ${f}`);
    }
    console.log();
  }
}

function cmdHelp(): void {
  console.log(`
UHD Format Converter

Usage:
  bun convert.ts <command> [options]

Commands:
  convert <input>        Convert a single image
  batch <dir>            Batch convert directory
  compare <input>        Generate all formats and compare
  negotiate <input>      Recommend formats for target browsers
  help                   Show this help

Format Options:
  -f, --format <fmt>     Target: avif, webp, jpeg, png, jxl, heif, tiff
  -q, --quality <1-100>  Quality level (default: format-specific)
  --bit-depth <8|10|12>  Output bit depth
  --color-space <space>  srgb, display-p3, rec2020
  --lossless             Lossless encoding
  --effort <0-9>         Encoding effort (speed vs compression)
  --chroma <420|422|444> Chroma subsampling
  --strip                Remove all metadata
  --keep-metadata        Preserve metadata (default)

Batch Options:
  -o, --output <dir>     Output directory
  -r, --recursive        Recurse into subdirectories
  --preserve-structure   Keep directory structure in output
  --skip-existing        Skip files that already exist
  -c <n>                 Concurrency (default: 4)

Negotiate Options:
  --target <browsers>    modern, universal, or "chrome,safari,firefox"
  --generate             Generate all recommended formats
  -o <dir>               Output directory for generated files

General Options:
  --json                 JSON output
  --yes, -y              Skip confirmation
  --dry-run              Preview without converting
  --stdin                Read input from stdin (piping)

Piping:
  echo '{"path":"photo.jpg"}' | bun convert.ts convert --stdin -f avif
`.trim());
}

// ── Main ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  switch (args.command) {
    case "convert": await cmdConvert(args); break;
    case "batch": await cmdBatch(args); break;
    case "compare": await cmdCompare(args); break;
    case "negotiate": await cmdNegotiate(args); break;
    case "help": default: cmdHelp(); break;
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
