#!/usr/bin/env bun
/**
 * UHD Image Upscaler CLI
 *
 * Usage:
 *   bun upscale.ts upscale <input> [output] [options]
 *   bun upscale.ts batch <dir> [options]
 *   bun upscale.ts compare <input>
 *   bun upscale.ts help
 */

import sharp from "sharp";
import { statSync, readdirSync, mkdirSync } from "fs";
import { join, basename, extname, resolve, dirname } from "path";
import { createInterface } from "readline";
import type {
  CliArgs,
  ModelId,
  ModelConfig,
  ScaleFactor,
  UpscaleResult,
  CompareResult,
  CompareEntry,
  PipeInput,
} from "./types.ts";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".avif", ".webp", ".tiff", ".tif", ".heif", ".heic"]);

// ── Models ───────────────────────────────────────────────────

const MODELS: Record<Exclude<ModelId, "auto">, ModelConfig> = {
  clarity: {
    id: "clarity",
    endpoint: "fal-ai/clarity-upscaler",
    displayName: "Clarity Upscaler",
    costPerImage: 0.10,
    supports4x: true,
    description: "Best for photographs — faces, landscapes, products",
  },
  "real-esrgan": {
    id: "real-esrgan",
    endpoint: "fal-ai/real-esrgan",
    displayName: "Real-ESRGAN",
    costPerImage: 0.05,
    supports4x: true,
    description: "General purpose — illustrations, anime, screenshots",
  },
  "aura-sr": {
    id: "aura-sr",
    endpoint: "fal-ai/aura-sr",
    displayName: "Aura SR",
    costPerImage: 0.08,
    supports4x: false,
    description: "AI-generated images — fixes artifacts while upscaling",
  },
  creative: {
    id: "creative",
    endpoint: "fal-ai/creative-upscaler",
    displayName: "Creative Upscaler",
    costPerImage: 0.12,
    supports4x: true,
    description: "Artistic enhancement — adds detail, impressionistic",
  },
};

// ── Arg Parsing ──────────────────────────────────────────────

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    command: "help",
    scale: 2,
    model: "auto",
    format: "png",
    creativity: 0.5,
    concurrency: 2,
    recursive: false,
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
      case "-s": case "--scale": args.scale = parseInt(argv[++i], 10) as ScaleFactor; break;
      case "--model": case "-m": args.model = argv[++i] as ModelId; break;
      case "-f": case "--format": args.format = argv[++i] as any; break;
      case "--creativity": args.creativity = parseFloat(argv[++i]); break;
      case "-c": case "--concurrency": args.concurrency = parseInt(argv[++i], 10); break;
      case "-r": case "--recursive": args.recursive = true; break;
      case "-o": case "--output": args.output = argv[++i]; break;
      case "--json": args.json = true; args.yes = true; break;
      case "--yes": case "-y": args.yes = true; break;
      case "--dry-run": args.dryRun = true; break;
      case "--stdin": args.stdin = true; break;
      default: if (!arg.startsWith("-")) positional.push(arg); break;
    }
    i++;
  }

  const cmd = positional[0];
  if (cmd === "upscale" || cmd === "up" || cmd === "u") {
    args.command = "upscale"; args.input = positional[1]; if (positional[2] && !positional[2].startsWith("-")) args.output = positional[2];
  } else if (cmd === "batch" || cmd === "b") {
    args.command = "batch"; args.input = positional[1];
  } else if (cmd === "compare" || cmd === "cmp") {
    args.command = "compare"; args.input = positional[1];
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

function resolveModel(model: ModelId, inputPath: string): Exclude<ModelId, "auto"> {
  if (model !== "auto") return model;

  // Check for AI-generated image signatures
  // In a real implementation, we'd check EXIF/metadata for generation tool markers
  const ext = extname(inputPath).toLowerCase();
  const name = basename(inputPath).toLowerCase();

  // Heuristic: if filename suggests AI generation
  if (name.includes("gen") || name.includes("ai-") || name.includes("dalle") || name.includes("midjourney") || name.includes("sd-")) {
    return "aura-sr";
  }

  return "clarity";
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

// ── Upscale Engine ───────────────────────────────────────────

async function upscaleImage(inputPath: string, outputPath: string, model: Exclude<ModelId, "auto">, scale: ScaleFactor, format: string, creativity?: number): Promise<UpscaleResult> {
  const start = performance.now();
  const inputStat = statSync(inputPath);
  const inputMeta = await sharp(inputPath).metadata();

  if (!process.env.FAL_KEY) {
    throw new Error("FAL_KEY environment variable is required. Set with: export FAL_KEY=your-api-key");
  }

  const modelConfig = MODELS[model];
  if (scale === 4 && !modelConfig.supports4x) {
    throw new Error(`${modelConfig.displayName} does not support 4x upscaling. Use --scale 2.`);
  }

  const { fal } = await import("@fal-ai/client");
  fal.config({ credentials: process.env.FAL_KEY });

  // Convert to base64
  const imageBuffer = await sharp(inputPath).png().toBuffer();
  const base64 = `data:image/png;base64,${imageBuffer.toString("base64")}`;

  // Call fal.ai
  const input: Record<string, unknown> = {
    image_url: base64,
    scale,
  };

  // Model-specific parameters
  if (model === "creative" && creativity !== undefined) {
    input.creativity = creativity;
    input.prompt = "high quality, detailed, sharp";
  }

  const result = await fal.subscribe(modelConfig.endpoint, { input }) as any;

  // Extract image URL from response
  const imageUrl = result.data?.image?.url || result.image?.url || result.data?.images?.[0]?.url;
  if (!imageUrl) throw new Error("No image URL in API response");

  // Download and save
  const response = await fetch(imageUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  mkdirSync(dirname(outputPath), { recursive: true });

  let pipeline = sharp(buffer);
  switch (format) {
    case "jpeg": pipeline = pipeline.jpeg({ quality: 95, mozjpeg: true }); break;
    case "webp": pipeline = pipeline.webp({ quality: 90 }); break;
    default: pipeline = pipeline.png(); break;
  }

  const outputInfo = await pipeline.toFile(outputPath);
  const outputStat = statSync(outputPath);
  const duration = performance.now() - start;

  return {
    input: inputPath,
    output: outputPath,
    model,
    scale,
    inputWidth: inputMeta.width || 0,
    inputHeight: inputMeta.height || 0,
    outputWidth: outputInfo.width,
    outputHeight: outputInfo.height,
    inputSize: inputStat.size,
    outputSize: outputStat.size,
    cost: modelConfig.costPerImage,
    duration,
    requestId: result.requestId || "unknown",
  };
}

// ── Commands ─────────────────────────────────────────────────

async function cmdUpscale(args: CliArgs): Promise<void> {
  const input = args.stdin ? (await readPipeInput())[0] : args.input;
  if (!input) throw new Error("Input required. Usage: bun upscale.ts upscale <input> [output]");

  const model = resolveModel(args.model, input);
  const modelConfig = MODELS[model];
  const ext = args.format === "jpeg" ? ".jpg" : `.${args.format}`;
  const output = args.output || input.replace(extname(input), `-${args.scale}x${ext}`);

  if (args.dryRun) {
    console.log(`\nDry Run: Upscale ${basename(input)}`);
    console.log(`  Model: ${modelConfig.displayName}`);
    console.log(`  Scale: ${args.scale}x`);
    console.log(`  Cost: ${formatCost(modelConfig.costPerImage)}`);
    console.log(`  Output: ${output}`);
    return;
  }

  if (!args.yes) {
    console.log(`\nUpscale: ${basename(input)} → ${args.scale}x`);
    console.log(`  Model: ${modelConfig.displayName} (${modelConfig.description})`);
    console.log(`  Cost: ${formatCost(modelConfig.costPerImage)}`);
    const ok = await confirm("Proceed?");
    if (!ok) { console.log("Cancelled."); return; }
  }

  process.stderr.write(`  Upscaling with ${modelConfig.displayName}...`);

  const result = await upscaleImage(resolve(input), resolve(output), model, args.scale, args.format, args.creativity);

  process.stderr.write("\r" + " ".repeat(50) + "\r");

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\n${basename(result.input)} → ${basename(result.output)}`);
    console.log(`  Model: ${MODELS[result.model].displayName}`);
    console.log(`  Scale: ${result.inputWidth}x${result.inputHeight} → ${result.outputWidth}x${result.outputHeight} (${result.scale}x)`);
    console.log(`  Size: ${humanSize(result.inputSize)} → ${humanSize(result.outputSize)}`);
    console.log(`  Cost: ${formatCost(result.cost)}`);
    console.log(`  Time: ${(result.duration / 1000).toFixed(1)}s`);
  }
}

async function cmdBatch(args: CliArgs): Promise<void> {
  const dir = args.input;
  if (!dir) throw new Error("Directory required. Usage: bun upscale.ts batch <dir>");

  const files = collectImages(dir, args.recursive);
  if (files.length === 0) { console.log("No image files found."); return; }

  const outDir = args.output || join(dir, `upscaled-${args.scale}x`);
  const model = args.model === "auto" ? "clarity" : args.model as Exclude<ModelId, "auto">;
  const modelConfig = MODELS[model];
  const totalCost = files.length * modelConfig.costPerImage;

  console.log(`\nBatch Upscale: ${files.length} images`);
  console.log(`  Model: ${modelConfig.displayName}`);
  console.log(`  Scale: ${args.scale}x`);
  console.log(`  Est. cost: ${formatCost(totalCost)}`);
  console.log(`  Output: ${outDir}`);

  if (args.dryRun) return;

  if (!args.yes) {
    const ok = await confirm("Proceed?");
    if (!ok) { console.log("Cancelled."); return; }
  }

  mkdirSync(outDir, { recursive: true });
  let totalActualCost = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = args.format === "jpeg" ? ".jpg" : `.${args.format}`;
    const output = join(outDir, basename(file, extname(file)) + `-${args.scale}x${ext}`);
    process.stderr.write(`\r  Upscaling ${i + 1}/${files.length}: ${basename(file)}  `);

    try {
      const result = await upscaleImage(resolve(file), resolve(output), model, args.scale, args.format, args.creativity);
      totalActualCost += result.cost;
    } catch (err) {
      console.error(`\n  Error: ${basename(file)}: ${(err as Error).message}`);
    }
  }

  process.stderr.write("\r" + " ".repeat(60) + "\r");
  console.log(`\nDone: ${files.length} images upscaled ${args.scale}x`);
  console.log(`  Total cost: ${formatCost(totalActualCost)}`);
  console.log(`  Output: ${outDir}`);
}

async function cmdCompare(args: CliArgs): Promise<void> {
  const input = args.stdin ? (await readPipeInput())[0] : args.input;
  if (!input) throw new Error("Input required. Usage: bun upscale.ts compare <input>");

  const inputMeta = await sharp(resolve(input)).metadata();
  const models = Object.keys(MODELS) as Array<Exclude<ModelId, "auto">>;
  const outDir = args.output || join(dirname(input), `compare-${basename(input, extname(input))}`);
  mkdirSync(outDir, { recursive: true });

  const totalCost = models.reduce((sum, m) => sum + MODELS[m].costPerImage, 0);

  console.log(`\nCompare Upscale: ${basename(input)}`);
  console.log(`  Models: ${models.map((m) => MODELS[m].displayName).join(", ")}`);
  console.log(`  Scale: ${args.scale}x`);
  console.log(`  Total cost: ${formatCost(totalCost)}`);

  if (!args.yes) {
    const ok = await confirm("Proceed?");
    if (!ok) { console.log("Cancelled."); return; }
  }

  const results: CompareEntry[] = [];

  for (const model of models) {
    const modelConfig = MODELS[model];
    if (args.scale === 4 && !modelConfig.supports4x) {
      console.log(`  Skipping ${modelConfig.displayName} (no 4x support)`);
      continue;
    }

    process.stderr.write(`\r  ${modelConfig.displayName}...`);

    try {
      const ext = args.format === "jpeg" ? ".jpg" : `.${args.format}`;
      const output = join(outDir, `${model}-${basename(input, extname(input))}-${args.scale}x${ext}`);
      const result = await upscaleImage(resolve(input), resolve(output), model, args.scale, args.format, args.creativity);

      results.push({
        model,
        displayName: modelConfig.displayName,
        output: result.output,
        size: result.outputSize,
        sizeHuman: humanSize(result.outputSize),
        cost: result.cost,
        duration: result.duration,
      });
    } catch (err) {
      console.error(`\n  Error with ${modelConfig.displayName}: ${(err as Error).message}`);
    }
  }

  process.stderr.write("\r" + " ".repeat(50) + "\r");

  const compareResult: CompareResult = {
    input: basename(input),
    inputWidth: inputMeta.width || 0,
    inputHeight: inputMeta.height || 0,
    outputWidth: (inputMeta.width || 0) * args.scale,
    outputHeight: (inputMeta.height || 0) * args.scale,
    scale: args.scale,
    results,
    totalCost: results.reduce((s, r) => s + r.cost, 0),
    outputDir: outDir,
  };

  if (args.json) {
    console.log(JSON.stringify(compareResult, null, 2));
  } else {
    console.log(`\nUpscale Comparison: ${basename(input)} (${inputMeta.width}x${inputMeta.height} → ${compareResult.outputWidth}x${compareResult.outputHeight})`);
    console.log("\u2500".repeat(55));
    console.log(`${"Model".padEnd(20)} ${"Time".padEnd(10)} ${"Size".padEnd(10)} ${"Cost".padEnd(8)}`);
    for (const r of results) {
      console.log(`${r.displayName.padEnd(20)} ${((r.duration / 1000).toFixed(1) + "s").padEnd(10)} ${r.sizeHuman.padEnd(10)} ${formatCost(r.cost).padEnd(8)}`);
    }
    console.log(`\nTotal cost: ${formatCost(compareResult.totalCost)}`);
    console.log(`Output: ${outDir}`);
  }
}

function cmdHelp(): void {
  console.log(`
UHD Image Upscaler

Usage:
  bun upscale.ts <command> [options]

Commands:
  upscale <input> [out]  Upscale a single image
  batch <dir>            Batch upscale directory
  compare <input>        Compare all models side-by-side
  help                   Show this help

Options:
  -s, --scale <2|4>      Scale factor (default: 2)
  -m, --model <model>    clarity, real-esrgan, aura-sr, creative, auto (default: auto)
  -f, --format <fmt>     Output: png, jpeg, webp (default: png)
  --creativity <0-1>     Creative model intensity (default: 0.5)
  -o, --output <path>    Output path/directory
  -c <n>                 Batch concurrency (default: 2)
  -r, --recursive        Recurse subdirectories (batch)

General Options:
  --json                 JSON output (implies --yes)
  --yes, -y              Skip confirmation
  --dry-run              Preview without upscaling
  --stdin                Read from stdin (piping)

Models:
  clarity       Best for photos — faces, landscapes, products (~$0.10/img)
  real-esrgan   General purpose — illustrations, anime (~$0.05/img)
  aura-sr       AI-generated images — fixes artifacts (~$0.08/img)
  creative      Artistic enhancement + upscale (~$0.12/img)

Environment:
  FAL_KEY                Required. Your fal.ai API key.

Piping:
  echo '{"path":"photo.jpg"}' | bun upscale.ts upscale --stdin -s 2
`.trim());
}

// ── Main ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  switch (args.command) {
    case "upscale": await cmdUpscale(args); break;
    case "batch": await cmdBatch(args); break;
    case "compare": await cmdCompare(args); break;
    case "help": default: cmdHelp(); break;
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
