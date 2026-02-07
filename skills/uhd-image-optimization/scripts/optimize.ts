#!/usr/bin/env bun
/**
 * UHD Image Optimizer CLI
 *
 * Usage:
 *   bun optimize.ts optimize <input> --preset web|print|social
 *   bun optimize.ts web <input> -o <dir> [--breakpoints ...] [--lqip blurhash]
 *   bun optimize.ts batch <dir> --preset web -o <dir>
 *   bun optimize.ts audit <dir|file>
 *   bun optimize.ts report <dir> -o <file>
 *   bun optimize.ts help
 */

import sharp from "sharp";
import { statSync, readdirSync, existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, basename, extname, resolve, dirname } from "path";
import { createInterface } from "readline";
import type {
  CliArgs,
  Preset,
  PresetConfig,
  PlatformProfile,
  LqipType,
  ImageFormat,
  OptimizeResult,
  VariantResult,
  LqipResult,
  AuditResult,
  AuditReport,
  PipeInput,
} from "./types.ts";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".avif", ".webp", ".tiff", ".tif", ".heif", ".heic", ".jxl"]);

// ── Presets ──────────────────────────────────────────────────

const PRESETS: Record<Preset, PresetConfig> = {
  web: {
    id: "web",
    displayName: "Web (CWV Optimized)",
    formats: ["avif", "webp", "jpeg"],
    qualities: { avif: 75, webp: 80, jpeg: 82, png: 100, tiff: 100 },
    maxWidth: 1920,
    breakpoints: [320, 640, 960, 1280, 1920],
    lqip: "blurhash",
    stripMetadata: true,
    preserveMetadata: ["copyright"],
    effort: 6,
  },
  print: {
    id: "print",
    displayName: "Print (Max Quality)",
    formats: ["tiff", "png"],
    qualities: { avif: 100, webp: 100, jpeg: 100, png: 100, tiff: 100 },
    maxWidth: 99999,
    breakpoints: [],
    stripMetadata: false,
    preserveMetadata: [],
    effort: 0,
  },
  social: {
    id: "social",
    displayName: "Social Media",
    formats: ["jpeg", "avif"],
    qualities: { avif: 80, webp: 85, jpeg: 88, png: 100, tiff: 100 },
    maxWidth: 1440,
    breakpoints: [],
    stripMetadata: true,
    preserveMetadata: ["copyright"],
    effort: 6,
  },
  custom: {
    id: "custom",
    displayName: "Custom",
    formats: ["avif"],
    qualities: { avif: 75, webp: 80, jpeg: 82, png: 100, tiff: 100 },
    maxWidth: 1920,
    breakpoints: [],
    stripMetadata: false,
    preserveMetadata: [],
    effort: 6,
  },
};

const DEFAULT_PLATFORMS: Record<string, PlatformProfile> = {
  instagram: { name: "Instagram", maxWidth: 1080, maxHeight: 1350, aspectRatios: ["1:1", "4:5", "1.91:1"], formats: ["jpeg", "avif"], quality: 88, hdrSupport: true },
  threads: { name: "Threads", maxWidth: 1080, maxHeight: 1350, aspectRatios: ["1:1", "4:5"], formats: ["jpeg"], quality: 88, hdrSupport: true },
  twitter: { name: "X/Twitter", maxWidth: 1200, maxHeight: 675, aspectRatios: ["16:9", "2:1"], formats: ["jpeg", "webp"], quality: 85, hdrSupport: false },
  facebook: { name: "Facebook", maxWidth: 1200, maxHeight: 630, aspectRatios: ["1.91:1", "1:1"], formats: ["jpeg"], quality: 85, hdrSupport: false },
  linkedin: { name: "LinkedIn", maxWidth: 1200, maxHeight: 627, aspectRatios: ["1.91:1"], formats: ["jpeg"], quality: 85, hdrSupport: false },
  youtube: { name: "YouTube Thumbnail", maxWidth: 1280, maxHeight: 720, aspectRatios: ["16:9"], formats: ["jpeg"], quality: 90, hdrSupport: false },
};

// ── Arg Parsing ──────────────────────────────────────────────

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    command: "help",
    preset: "web",
    breakpoints: [],
    formats: [],
    maxWidth: 0,
    qualityAvif: 0,
    qualityWebp: 0,
    qualityJpeg: 0,
    html: false,
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
      case "--preset": case "-p": args.preset = argv[++i] as Preset; break;
      case "--breakpoints": args.breakpoints = argv[++i].split(",").map(Number); break;
      case "--formats": args.formats = argv[++i].split(",") as ImageFormat[]; break;
      case "--lqip": args.lqip = argv[++i] as LqipType; break;
      case "--max-width": args.maxWidth = parseInt(argv[++i], 10); break;
      case "--quality-avif": args.qualityAvif = parseInt(argv[++i], 10); break;
      case "--quality-webp": args.qualityWebp = parseInt(argv[++i], 10); break;
      case "--quality-jpeg": args.qualityJpeg = parseInt(argv[++i], 10); break;
      case "--html": args.html = true; break;
      case "--recursive": case "-r": args.recursive = true; break;
      case "-c": case "--concurrency": args.concurrency = parseInt(argv[++i], 10); break;
      case "-o": case "--output": args.output = argv[++i]; break;
      case "--platform": args.platform = argv[++i]; break;
      case "--json": args.json = true; break;
      case "--yes": case "-y": args.yes = true; break;
      case "--dry-run": args.dryRun = true; break;
      case "--stdin": args.stdin = true; break;
      default: if (!arg.startsWith("-")) positional.push(arg); break;
    }
    i++;
  }

  const cmd = positional[0];
  if (cmd === "optimize" || cmd === "opt") { args.command = "optimize"; args.input = positional[1]; }
  else if (cmd === "web" || cmd === "w") { args.command = "web"; args.input = positional[1]; args.preset = "web"; }
  else if (cmd === "batch" || cmd === "b") { args.command = "batch"; args.input = positional[1]; }
  else if (cmd === "audit" || cmd === "a") { args.command = "audit"; args.input = positional[1]; }
  else if (cmd === "report") { args.command = "report"; args.input = positional[1]; }

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

function loadPlatforms(): Record<string, PlatformProfile> {
  const customPath = join(process.cwd(), ".uhd", "platforms.json");
  if (existsSync(customPath)) {
    try {
      const custom = JSON.parse(readFileSync(customPath, "utf-8"));
      return { ...DEFAULT_PLATFORMS, ...custom };
    } catch {}
  }
  return DEFAULT_PLATFORMS;
}

// ── LQIP Generation ──────────────────────────────────────────

async function generateLqip(inputPath: string, type: LqipType): Promise<LqipResult> {
  if (type === "blurhash") {
    // Resize to tiny then extract raw pixel data for blurhash
    const { data, info } = await sharp(inputPath).resize(32, 32, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    // Simple blurhash-like encoding (compact representation)
    // In production, use the blurhash package
    const base64 = data.subarray(0, 64).toString("base64").slice(0, 28);
    return { type: "blurhash", value: base64, size: base64.length };
  }

  if (type === "micro") {
    const microPath = inputPath.replace(extname(inputPath), "-lqip.webp");
    await sharp(inputPath).resize(16).webp({ quality: 20 }).toFile(microPath);
    const stat = statSync(microPath);
    return { type: "micro", value: microPath, path: microPath, size: stat.size };
  }

  if (type === "css") {
    // Generate a 2-color CSS gradient from dominant colors
    const { dominant } = await sharp(inputPath).resize(2, 2).stats();
    const color = `rgb(${dominant.r},${dominant.g},${dominant.b})`;
    const value = `background:${color}`;
    return { type: "css", value, size: value.length };
  }

  // SVG trace - simplified as a solid color rect
  const { dominant } = await sharp(inputPath).resize(1, 1).stats();
  const meta = await sharp(inputPath).metadata();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}"><rect fill="rgb(${dominant.r},${dominant.g},${dominant.b})" width="100%" height="100%"/></svg>`;
  return { type: "svg", value: svg, size: svg.length };
}

// ── Optimization Engine ──────────────────────────────────────

async function optimizeImage(input: string, outDir: string, preset: PresetConfig, args: CliArgs): Promise<OptimizeResult> {
  const inputStat = statSync(resolve(input));
  const meta = await sharp(resolve(input)).metadata();
  const inputWidth = meta.width || 0;
  const inputHeight = meta.height || 0;
  const baseName = basename(input, extname(input));

  mkdirSync(outDir, { recursive: true });

  const variants: VariantResult[] = [];
  const formats = args.formats.length > 0 ? args.formats : preset.formats;
  const breakpoints = args.breakpoints.length > 0 ? args.breakpoints : preset.breakpoints;
  const maxWidth = args.maxWidth > 0 ? args.maxWidth : preset.maxWidth;

  for (const fmt of formats) {
    const quality = getQuality(fmt, preset, args);

    if (breakpoints.length > 0) {
      // Generate responsive variants
      for (const bp of breakpoints) {
        if (bp > inputWidth) continue; // Don't upscale
        const width = Math.min(bp, maxWidth);
        const outPath = join(outDir, `${baseName}-${width}w.${fmt === "jpeg" ? "jpg" : fmt}`);

        let pipeline = sharp(resolve(input)).resize(width, undefined, { withoutEnlargement: true });
        pipeline = applyFormat(pipeline, fmt, quality, preset.effort);
        if (preset.stripMetadata) pipeline = pipeline.withMetadata({ orientation: undefined });

        const info = await pipeline.toFile(outPath);
        const outStat = statSync(outPath);
        variants.push({ path: outPath, format: fmt, width: info.width, height: info.height, size: outStat.size, sizeHuman: humanSize(outStat.size), breakpoint: bp });
      }
    }

    // Full-size variant (capped at maxWidth)
    const fullWidth = Math.min(inputWidth, maxWidth);
    const outPath = join(outDir, `${baseName}.${fmt === "jpeg" ? "jpg" : fmt}`);
    let pipeline = sharp(resolve(input)).resize(fullWidth, undefined, { withoutEnlargement: true });
    pipeline = applyFormat(pipeline, fmt, quality, preset.effort);
    if (preset.stripMetadata) pipeline = pipeline.withMetadata({ orientation: undefined });

    const info = await pipeline.toFile(outPath);
    const outStat = statSync(outPath);
    variants.push({ path: outPath, format: fmt, width: info.width, height: info.height, size: outStat.size, sizeHuman: humanSize(outStat.size) });
  }

  // LQIP
  let lqip: LqipResult | undefined;
  const lqipType = args.lqip || preset.lqip;
  if (lqipType) {
    lqip = await generateLqip(resolve(input), lqipType);
    if (lqip.type === "blurhash" || lqip.type === "css") {
      writeFileSync(join(outDir, `${baseName}-lqip.txt`), lqip.value);
    }
  }

  const totalOutputSize = variants.reduce((sum, v) => sum + v.size, 0);
  const primarySize = variants.find((v) => !v.breakpoint)?.size || totalOutputSize;

  // Generate manifest
  const manifest = { source: basename(input), variants, lqip };
  writeFileSync(join(outDir, `${baseName}-manifest.json`), JSON.stringify(manifest, null, 2));

  // Generate HTML if requested
  if (args.html) {
    const html = generatePictureElement(baseName, variants, lqip);
    writeFileSync(join(outDir, `${baseName}.html`), html);
  }

  return {
    input: basename(input),
    inputSize: inputStat.size,
    outputDir: outDir,
    variants,
    lqip,
    totalOutputSize,
    savings: inputStat.size - primarySize,
    savingsPercent: `${(((inputStat.size - primarySize) / inputStat.size) * 100).toFixed(1)}%`,
  };
}

function getQuality(fmt: ImageFormat, preset: PresetConfig, args: CliArgs): number {
  if (fmt === "avif" && args.qualityAvif > 0) return args.qualityAvif;
  if (fmt === "webp" && args.qualityWebp > 0) return args.qualityWebp;
  if (fmt === "jpeg" && args.qualityJpeg > 0) return args.qualityJpeg;
  return preset.qualities[fmt] || 80;
}

function applyFormat(pipeline: sharp.Sharp, fmt: ImageFormat, quality: number, effort: number): sharp.Sharp {
  switch (fmt) {
    case "avif": return pipeline.avif({ quality, effort });
    case "webp": return pipeline.webp({ quality, effort });
    case "jpeg": return pipeline.jpeg({ quality, mozjpeg: true });
    case "png": return pipeline.png({ compressionLevel: Math.round(effort) });
    case "tiff": return pipeline.tiff({ quality });
    default: return pipeline;
  }
}

function generatePictureElement(baseName: string, variants: VariantResult[], lqip?: LqipResult): string {
  const formatGroups: Record<string, VariantResult[]> = {};
  for (const v of variants) {
    if (!formatGroups[v.format]) formatGroups[v.format] = [];
    formatGroups[v.format].push(v);
  }

  let html = `<picture>\n`;
  const formatOrder: ImageFormat[] = ["avif", "webp", "jpeg"];

  for (const fmt of formatOrder) {
    const group = formatGroups[fmt];
    if (!group) continue;

    const withBp = group.filter((v) => v.breakpoint).sort((a, b) => (a.breakpoint || 0) - (b.breakpoint || 0));
    if (withBp.length > 0) {
      const srcset = withBp.map((v) => `${basename(v.path)} ${v.width}w`).join(", ");
      const sizes = withBp.map((v) => `(max-width: ${v.width}px) ${v.width}px`).join(", ");
      const mimeType = fmt === "jpeg" ? "image/jpeg" : `image/${fmt}`;

      if (fmt === "jpeg") {
        html += `  <img src="${basename(group.find((v) => !v.breakpoint)?.path || group[0].path)}" srcset="${srcset}" sizes="${sizes}" alt="" loading="lazy"`;
        if (lqip?.type === "css") html += ` style="${lqip.value}"`;
        html += ` />\n`;
      } else {
        html += `  <source type="${mimeType}" srcset="${srcset}" sizes="${sizes}" />\n`;
      }
    }
  }

  // Fallback img if not already added
  const fallback = variants.find((v) => v.format === "jpeg" && !v.breakpoint);
  if (fallback && !html.includes("<img")) {
    html += `  <img src="${basename(fallback.path)}" alt="" loading="lazy" />\n`;
  }

  html += `</picture>`;
  return html;
}

// ── Audit Engine ─────────────────────────────────────────────

async function auditImage(filePath: string, targetBandwidth: number): Promise<AuditResult> {
  const stat = statSync(resolve(filePath));
  const meta = await sharp(resolve(filePath)).metadata();
  const loadTime = (stat.size * 8) / (targetBandwidth * 1024 * 1024); // seconds

  const suggestions: string[] = [];
  let status: "ok" | "warning" | "critical" = "ok";
  let estimatedOptimizedSize: number | undefined;

  // Check file size against CWV targets
  if (loadTime > 2.5) {
    status = "critical";
    suggestions.push("Image too large for target LCP threshold");
  } else if (loadTime > 1.0) {
    status = "warning";
  }

  // Check format
  const format = meta.format || "unknown";
  if (format === "jpeg" || format === "png") {
    suggestions.push(`Convert to AVIF (est. ${format === "png" ? "90" : "60"}% smaller)`);
    estimatedOptimizedSize = Math.round(stat.size * (format === "png" ? 0.1 : 0.4));
  }

  // Check dimensions
  if ((meta.width || 0) > 1920) {
    suggestions.push(`Resize from ${meta.width}px to 1920px max width`);
    const ratio = 1920 / (meta.width || 1920);
    estimatedOptimizedSize = Math.round((estimatedOptimizedSize || stat.size) * ratio * ratio);
  }

  // Check for missing responsive variants
  if (!filePath.includes("-") || !filePath.match(/\d+w\./)) {
    suggestions.push("Add responsive srcset variants");
  }

  return {
    file: basename(filePath),
    fileSize: stat.size,
    fileSizeHuman: humanSize(stat.size),
    width: meta.width || 0,
    height: meta.height || 0,
    format: format.toUpperCase(),
    loadTimeOnTarget: parseFloat(loadTime.toFixed(2)),
    targetBandwidth,
    status,
    suggestions,
    estimatedOptimizedSize,
    estimatedSavings: estimatedOptimizedSize ? `${(((stat.size - estimatedOptimizedSize) / stat.size) * 100).toFixed(0)}%` : undefined,
  };
}

// ── Commands ─────────────────────────────────────────────────

async function cmdOptimize(args: CliArgs): Promise<void> {
  const input = args.stdin ? (await readPipeInput())[0] : args.input;
  if (!input) throw new Error("Input required. Usage: bun optimize.ts optimize <input> --preset web");

  const preset = PRESETS[args.preset];
  const outDir = args.output || join(dirname(input), `optimized-${args.preset}`);

  if (args.platform) {
    const platforms = loadPlatforms();
    const platform = platforms[args.platform.toLowerCase()];
    if (platform) {
      preset.maxWidth = platform.maxWidth;
      preset.formats = platform.formats;
      preset.qualities.jpeg = platform.quality;
    }
  }

  if (args.dryRun) {
    console.log(`\nDry Run: Optimize ${basename(input)} with "${preset.displayName}" preset`);
    console.log(`  Formats: ${preset.formats.join(", ")}`);
    console.log(`  Max width: ${preset.maxWidth}px`);
    console.log(`  Breakpoints: ${preset.breakpoints.length > 0 ? preset.breakpoints.join(", ") : "none"}`);
    console.log(`  Output: ${outDir}`);
    return;
  }

  const result = await optimizeImage(input, outDir, preset, args);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\nOptimized: ${result.input}`);
    console.log(`  Preset: ${preset.displayName}`);
    console.log(`  Original: ${humanSize(result.inputSize)}`);
    console.log(`  Variants: ${result.variants.length}`);
    console.log(`  Savings: ${result.savingsPercent}`);
    console.log(`  Output: ${outDir}`);
    if (result.lqip) console.log(`  LQIP: ${result.lqip.type} (${result.lqip.size} bytes)`);
  }
}

async function cmdWeb(args: CliArgs): Promise<void> {
  args.preset = "web";
  await cmdOptimize(args);
}

async function cmdBatch(args: CliArgs): Promise<void> {
  const dir = args.input;
  if (!dir) throw new Error("Directory required. Usage: bun optimize.ts batch <dir> --preset web");

  const files = collectImages(dir, args.recursive);
  if (files.length === 0) { console.log("No image files found."); return; }

  const preset = PRESETS[args.preset];
  const outDir = args.output || join(dir, `optimized-${args.preset}`);

  console.log(`\nBatch Optimize: ${files.length} images with "${preset.displayName}" preset`);
  console.log(`  Output: ${outDir}`);

  if (!args.yes && !args.dryRun) {
    const ok = await confirm("Proceed?");
    if (!ok) { console.log("Cancelled."); return; }
  }

  if (args.dryRun) return;

  let totalInput = 0;
  let totalOutput = 0;

  for (let i = 0; i < files.length; i++) {
    process.stderr.write(`\r  Optimizing ${i + 1}/${files.length}: ${basename(files[i])}  `);
    try {
      const imgOutDir = join(outDir, basename(files[i], extname(files[i])));
      const result = await optimizeImage(files[i], imgOutDir, preset, args);
      totalInput += result.inputSize;
      totalOutput += result.variants.find((v) => !v.breakpoint)?.size || 0;
    } catch (err) {
      console.error(`\n  Error: ${basename(files[i])}: ${(err as Error).message}`);
    }
  }

  process.stderr.write("\r" + " ".repeat(60) + "\r");
  console.log(`\nDone: ${files.length} images optimized`);
  console.log(`  Total savings: ${humanSize(totalInput)} → ${humanSize(totalOutput)} (${(((totalInput - totalOutput) / totalInput) * 100).toFixed(1)}% reduction)`);
}

async function cmdAudit(args: CliArgs): Promise<void> {
  const input = args.stdin ? (await readPipeInput())[0] : args.input;
  if (!input) throw new Error("Path required. Usage: bun optimize.ts audit <dir|file>");

  const targetBandwidth = 1.6; // 4G Mbps
  const stat = statSync(resolve(input));
  const files = stat.isDirectory() ? collectImages(input, true) : [input];

  const audits: AuditResult[] = [];
  for (const file of files) {
    audits.push(await auditImage(file, targetBandwidth));
  }

  const report: AuditReport = {
    totalFiles: audits.length,
    totalSize: audits.reduce((s, a) => s + a.fileSize, 0),
    totalSizeHuman: humanSize(audits.reduce((s, a) => s + a.fileSize, 0)),
    ok: audits.filter((a) => a.status === "ok").length,
    warnings: audits.filter((a) => a.status === "warning").length,
    critical: audits.filter((a) => a.status === "critical").length,
    audits,
    potentialSavings: audits.reduce((s, a) => s + (a.estimatedOptimizedSize ? a.fileSize - a.estimatedOptimizedSize : 0), 0),
    potentialSavingsPercent: "0%",
  };
  const totalOriginal = audits.reduce((s, a) => s + a.fileSize, 0);
  report.potentialSavingsPercent = totalOriginal > 0 ? `${((report.potentialSavings / totalOriginal) * 100).toFixed(0)}%` : "0%";

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`\nImage Audit Report`);
    console.log("\u2500".repeat(40));
    console.log(`Target: LCP < 2.5s on 4G (${targetBandwidth} Mbps)\n`);

    for (const audit of audits) {
      const icon = audit.status === "ok" ? "\u2705" : audit.status === "warning" ? "\u26A0\uFE0F " : "\u274C";
      console.log(`${icon} ${audit.file.padEnd(25)} ${audit.fileSizeHuman.padEnd(10)} ${audit.loadTimeOnTarget > 2.5 ? `Would take ${audit.loadTimeOnTarget}s on 4G` : `OK (${audit.loadTimeOnTarget}s on 4G)`}`);
      for (const s of audit.suggestions) {
        console.log(`    \u2192 ${s}`);
      }
    }

    console.log(`\nSummary: ${report.ok} OK, ${report.warnings} warnings, ${report.critical} critical`);
    if (report.potentialSavings > 0) {
      console.log(`Potential savings: ${humanSize(report.potentialSavings)} (${report.potentialSavingsPercent})`);
    }
  }
}

async function cmdReport(args: CliArgs): Promise<void> {
  const dir = args.input;
  if (!dir) throw new Error("Directory required. Usage: bun optimize.ts report <dir> -o <file>");

  const files = collectImages(dir, true);
  const audits: AuditResult[] = [];
  for (const file of files) {
    audits.push(await auditImage(file, 1.6));
  }

  const formatDist: Record<string, number> = {};
  for (const a of audits) formatDist[a.format] = (formatDist[a.format] || 0) + 1;

  const totalSize = audits.reduce((s, a) => s + a.fileSize, 0);
  const potentialSavings = audits.reduce((s, a) => s + (a.estimatedOptimizedSize ? a.fileSize - a.estimatedOptimizedSize : 0), 0);

  if (args.output) {
    let md = `# Image Optimization Report\n\n`;
    md += `**Directory:** ${dir}\n`;
    md += `**Total files:** ${files.length}\n`;
    md += `**Total size:** ${humanSize(totalSize)}\n\n`;
    md += `## Format Distribution\n\n`;
    for (const [fmt, count] of Object.entries(formatDist)) md += `- ${fmt}: ${count} files\n`;
    md += `\n## Optimization Opportunities\n\n`;
    md += `| File | Size | Status | Suggestion |\n|------|------|--------|------------|\n`;
    for (const a of audits) {
      md += `| ${a.file} | ${a.fileSizeHuman} | ${a.status} | ${a.suggestions[0] || "OK"} |\n`;
    }
    md += `\n## Summary\n\n`;
    md += `- Potential savings: **${humanSize(potentialSavings)}** (${totalSize > 0 ? ((potentialSavings / totalSize) * 100).toFixed(0) : 0}%)\n`;
    writeFileSync(args.output, md);
    console.log(`Report written to ${args.output}`);
  } else {
    console.log(JSON.stringify({ directory: dir, totalFiles: files.length, totalSize, formatDistribution: formatDist, potentialSavings, audits }, null, 2));
  }
}

function cmdHelp(): void {
  console.log(`
UHD Image Optimizer

Usage:
  bun optimize.ts <command> [options]

Commands:
  optimize <input>       Optimize with preset
  web <input>            Web-specific optimization (srcset + LQIP)
  batch <dir>            Batch optimize directory
  audit <dir|file>       Audit against CWV targets
  report <dir>           Generate optimization report
  help                   Show this help

Preset Options:
  --preset <p>           web, print, social, custom (default: web)
  --platform <name>      Platform profile: instagram, twitter, facebook, etc.

Web Options:
  --breakpoints <n,...>  Responsive breakpoints (default: 320,640,960,1280,1920)
  --formats <f,...>      Output formats (default: preset-defined)
  --lqip <type>          LQIP: blurhash, thumbhash, css, svg, micro
  --max-width <px>       Maximum output width (default: 1920)
  --quality-avif <1-100> AVIF quality override
  --quality-webp <1-100> WebP quality override
  --quality-jpeg <1-100> JPEG quality override
  --html                 Generate <picture> element HTML

General Options:
  -o, --output <dir>     Output directory
  -r, --recursive        Recurse subdirectories
  --json                 JSON output
  --yes, -y              Skip confirmation
  --dry-run              Preview without processing
  --stdin                Read from stdin (piping)

Platforms:
  Configurable via .uhd/platforms.json. Built-in: instagram, threads,
  twitter, facebook, linkedin, youtube.
`.trim());
}

// ── Main ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  switch (args.command) {
    case "optimize": await cmdOptimize(args); break;
    case "web": await cmdWeb(args); break;
    case "batch": await cmdBatch(args); break;
    case "audit": await cmdAudit(args); break;
    case "report": await cmdReport(args); break;
    case "help": default: cmdHelp(); break;
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
