#!/usr/bin/env bun
/**
 * UHD — Image Generation CLI
 *
 * Usage:
 *   bun uhd.ts generate <prompt> [options]
 *   bun uhd.ts batch <manifest.json> [options]
 *   bun uhd.ts compare <prompt> [options]
 *   bun uhd.ts review [session-id]
 *   bun uhd.ts refine [session-id]
 *   bun uhd.ts finalize [session-id] --dest <dir>
 *   bun uhd.ts sessions
 *   bun uhd.ts clean [session-id | --all]
 *   bun uhd.ts status <request-id>
 *   bun uhd.ts help
 */

import { basename } from "path";
import { createInterface } from "readline";
import { estimateJobCost, estimateTotalCost } from "./cost.ts";
import { finalizeSession } from "./finalize.ts";
import { parseManifest, resolveManifestJobs } from "./manifest.ts";
import { autoSelectModel, MODELS } from "./models.ts";
import { slugifyPrompt } from "./naming.ts";
import { printPlan, printPlanJson, printResults, printResultsJson, printSessions, printStatus } from "./output.ts";
import { checkStatus, executeBatch, executeJob } from "./queue.ts";
import { startReviewServer } from "./review/server.ts";
import {
  createSession,
  deleteAllSessions,
  deleteSession,
  generateSessionId,
  getImagesDir,
  listSessions,
  readSelections,
  readSessionMeta,
  resolveSessionId,
  writeSelections,
  writeSessionMeta,
} from "./session.ts";
import type { CliArgs, JobDefinition, ModelId, SessionJob } from "./types.ts";

const VALID_MODELS = new Set(["auto", "seedream", "banana"]);
const VALID_RESOLUTIONS = new Set(["1K", "2K", "4K"]);
const VALID_FORMATS = new Set(["png", "jpeg", "webp"]);

// ── Arg Parsing ──────────────────────────────────────────────

function parseOptionValue(argv: string[], i: number, flag: string): string {
  const value = argv[i + 1];
  if (value === undefined || value.startsWith("-")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    command: "help",
    model: "auto",
    numImages: 1,
    imageSize: "auto_2K",
    resolution: "2K",
    aspectRatio: "auto",
    outputFormat: "png",
    enableWebSearch: false,
    yes: false,
    json: false,
    dryRun: false,
    concurrency: 4,
  };

  const positional: string[] = [];
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];

    switch (arg) {
      case "--model":
      case "-m":
        args.model = parseOptionValue(argv, i, arg) as ModelId | "auto";
        i++;
        break;
      case "--num":
      case "-n":
        args.numImages = parseInt(parseOptionValue(argv, i, arg), 10);
        i++;
        break;
      case "--size":
        args.imageSize = parseOptionValue(argv, i, arg);
        i++;
        break;
      case "--resolution":
        args.resolution = parseOptionValue(argv, i, arg);
        i++;
        break;
      case "--aspect":
        args.aspectRatio = parseOptionValue(argv, i, arg);
        i++;
        break;
      case "--format":
        args.outputFormat = parseOptionValue(argv, i, arg) as CliArgs["outputFormat"];
        i++;
        break;
      case "--web-search":
        args.enableWebSearch = true;
        break;
      case "--seed":
        args.seed = parseInt(parseOptionValue(argv, i, arg), 10);
        i++;
        break;
      case "--dest":
      case "-d":
        args.dest = parseOptionValue(argv, i, arg);
        i++;
        break;
      case "--session":
        args.sessionId = parseOptionValue(argv, i, arg);
        i++;
        break;
      case "--yes":
      case "-y":
        args.yes = true;
        break;
      case "--json":
        args.json = true;
        args.yes = true;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--concurrency":
      case "-c":
        args.concurrency = parseInt(parseOptionValue(argv, i, arg), 10);
        i++;
        break;
      case "--name":
        args.name = parseOptionValue(argv, i, arg);
        i++;
        break;
      case "--all":
        args.cleanAll = true;
        break;
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
  if (cmd === "generate" || cmd === "gen" || cmd === "g") {
    args.command = "generate";
    args.prompt = positional.slice(1).join(" ");
  } else if (cmd === "batch" || cmd === "b") {
    args.command = "batch";
    args.manifestPath = positional[1];
  } else if (cmd === "compare" || cmd === "cmp") {
    args.command = "compare";
    args.prompt = positional.slice(1).join(" ");
  } else if (cmd === "review" || cmd === "r") {
    args.command = "review";
    args.sessionId = args.sessionId || positional[1];
  } else if (cmd === "refine") {
    args.command = "refine";
    args.sessionId = args.sessionId || positional[1];
  } else if (cmd === "finalize" || cmd === "fin") {
    args.command = "finalize";
    args.sessionId = args.sessionId || positional[1];
  } else if (cmd === "sessions" || cmd === "ls") {
    args.command = "sessions";
  } else if (cmd === "clean" || cmd === "rm") {
    args.command = "clean";
    args.sessionId = args.sessionId || positional[1];
  } else if (cmd === "status" || cmd === "s") {
    args.command = "status";
    args.requestId = positional[1];
  } else {
    args.command = "help";
  }

  return args;
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}

function validateArgs(args: CliArgs): void {
  if (!VALID_MODELS.has(args.model)) {
    throw new Error(`Invalid --model '${args.model}'. Use auto, seedream, or banana.`);
  }
  if (!VALID_FORMATS.has(args.outputFormat)) {
    throw new Error(`Invalid --format '${args.outputFormat}'. Use png, jpeg, or webp.`);
  }
  if (!VALID_RESOLUTIONS.has(args.resolution)) {
    throw new Error(`Invalid --resolution '${args.resolution}'. Use 1K, 2K, or 4K.`);
  }
  assertPositiveInteger(args.numImages, "--num");
  assertPositiveInteger(args.concurrency, "--concurrency");

  if (args.seed !== undefined && !Number.isInteger(args.seed)) {
    throw new Error("--seed must be an integer");
  }

  if (args.command === "clean" && args.cleanAll && args.sessionId) {
    throw new Error("Use either a session ID or --all, not both.");
  }
}

// ── Confirmation Prompt ──────────────────────────────────────

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`\n${message} [y/N]: `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

function cleanupSessionSafe(sessionId: string): void {
  try {
    deleteSession(sessionId);
  } catch {
    // Best effort cleanup for cancelled runs.
  }
}

function previewSessionTarget(hint: string): { sessionId: string; imagesDir: string } {
  const sessionId = generateSessionId(hint);
  return { sessionId, imagesDir: getImagesDir(sessionId) };
}

function showPlan(args: CliArgs, jobs: JobDefinition[], imagesDir: string, sessionId: string): void {
  if (args.json) {
    printPlanJson(jobs, imagesDir, sessionId);
  } else {
    printPlan(jobs, imagesDir, sessionId);
  }
}

// ── Build Jobs ───────────────────────────────────────────────

function buildSingleJob(args: CliArgs): JobDefinition {
  const model: ModelId = args.model === "auto"
    ? autoSelectModel(args.prompt!)
    : args.model;

  const maxImages = MODELS[model].maxImages;
  if (args.numImages > maxImages) {
    throw new Error(`${MODELS[model].displayName} supports max ${maxImages} images per call`);
  }

  return {
    prompt: args.prompt!,
    model,
    numImages: args.numImages,
    name: args.name,
    imageSize: args.imageSize,
    resolution: args.resolution,
    aspectRatio: args.aspectRatio,
    enableWebSearch: args.enableWebSearch,
    outputFormat: args.outputFormat,
    seed: args.seed,
  };
}

function buildCompareJobs(args: CliArgs): JobDefinition[] {
  const maxCompareImages = Math.min(MODELS.seedream.maxImages, MODELS.banana.maxImages);
  if (args.numImages > maxCompareImages) {
    throw new Error(`Compare mode supports max ${maxCompareImages} images per model`);
  }

  return [
    {
      prompt: args.prompt!,
      model: "seedream",
      numImages: args.numImages,
      name: args.name ? `${args.name}-seedream` : `${slugifyPrompt(args.prompt!)}-seedream`,
      imageSize: args.imageSize,
      resolution: args.resolution,
      aspectRatio: args.aspectRatio,
      enableWebSearch: false,
      outputFormat: args.outputFormat,
      seed: args.seed,
    },
    {
      prompt: args.prompt!,
      model: "banana",
      numImages: args.numImages,
      name: args.name ? `${args.name}-banana` : `${slugifyPrompt(args.prompt!)}-banana`,
      imageSize: args.imageSize,
      resolution: args.resolution,
      aspectRatio: args.aspectRatio,
      enableWebSearch: args.enableWebSearch,
      outputFormat: args.outputFormat,
      seed: args.seed,
    },
  ];
}

/** Convert a JobResult into SessionJob entries */
function jobResultToSession(
  job: JobDefinition,
  result: { images: Array<{ url: string; localPath: string; width: number; height: number }>; requestId: string; duration: number },
  round: number,
): SessionJob {
  return {
    prompt: job.prompt,
    model: job.model,
    numImages: job.numImages,
    cost: estimateJobCost(job),
    round,
    params: {
      imageSize: job.imageSize,
      resolution: job.resolution,
      aspectRatio: job.aspectRatio,
      outputFormat: job.outputFormat,
      ...(job.enableWebSearch && { enableWebSearch: true }),
      ...(job.seed !== undefined && { seed: job.seed }),
    },
    images: result.images.map((img) => ({
      filename: basename(img.localPath),
      width: img.width,
      height: img.height,
      requestId: result.requestId,
      url: img.url,
    })),
  };
}

// ── Commands ─────────────────────────────────────────────────

async function cmdGenerate(args: CliArgs): Promise<void> {
  if (!args.prompt) {
    throw new Error("Prompt is required. Usage: bun uhd.ts generate <prompt>");
  }

  const job = buildSingleJob(args);
  const jobs = [job];
  const preview = previewSessionTarget(args.prompt);

  if (args.dryRun) {
    showPlan(args, jobs, preview.imagesDir, preview.sessionId);
    return;
  }

  const session = createSession(args.prompt, "generate");
  if (!args.json) {
    printPlan(jobs, session.imagesDir, session.id);
  }

  if (!args.yes) {
    const ok = await confirm("Proceed?");
    if (!ok) {
      cleanupSessionSafe(session.id);
      console.log("Cancelled.");
      return;
    }
  }

  const result = await executeJob(job, session.imagesDir, (status) => {
    if (!args.json) process.stderr.write(`\r  ${status}  `);
  });

  const meta = readSessionMeta(session.id);
  meta.jobs.push(jobResultToSession(job, result, 0));
  meta.totalCost = estimateTotalCost(jobs);
  writeSessionMeta(session.id, meta);

  if (!args.json) {
    process.stderr.write("\r" + " ".repeat(40) + "\r");
    printResults([result], session.id);
  } else {
    printResultsJson([result], session.id);
  }
}

async function cmdBatch(args: CliArgs): Promise<void> {
  if (!args.manifestPath) {
    throw new Error("Manifest path is required. Usage: bun uhd.ts batch <manifest.json>");
  }

  const manifest = parseManifest(args.manifestPath);
  const jobs = resolveManifestJobs(manifest);
  const preview = previewSessionTarget(jobs[0].prompt);

  if (args.dryRun) {
    showPlan(args, jobs, preview.imagesDir, preview.sessionId);
    return;
  }

  const session = createSession(jobs[0].prompt, "batch");
  if (!args.json) {
    printPlan(jobs, session.imagesDir, session.id);
  }

  if (!args.yes) {
    const ok = await confirm("Proceed?");
    if (!ok) {
      cleanupSessionSafe(session.id);
      console.log("Cancelled.");
      return;
    }
  }

  const results = await executeBatch(jobs, session.imagesDir, args.concurrency, (idx, status) => {
    if (!args.json) process.stderr.write(`\r  Job ${idx + 1}/${jobs.length}: ${status}  `);
  });

  const meta = readSessionMeta(session.id);
  for (let i = 0; i < results.length; i++) {
    meta.jobs.push(jobResultToSession(jobs[i], results[i], 0));
  }
  meta.totalCost = estimateTotalCost(jobs);
  writeSessionMeta(session.id, meta);

  if (!args.json) {
    process.stderr.write("\r" + " ".repeat(60) + "\r");
    printResults(results, session.id);
  } else {
    printResultsJson(results, session.id);
  }
}

async function cmdCompare(args: CliArgs): Promise<void> {
  if (!args.prompt) {
    throw new Error("Prompt is required. Usage: bun uhd.ts compare <prompt>");
  }

  const jobs = buildCompareJobs(args);
  const preview = previewSessionTarget(args.prompt);

  if (args.dryRun) {
    showPlan(args, jobs, preview.imagesDir, preview.sessionId);
    return;
  }

  const session = createSession(args.prompt, "compare");
  if (!args.json) {
    printPlan(jobs, session.imagesDir, session.id);
  }

  if (!args.yes) {
    const ok = await confirm("Proceed?");
    if (!ok) {
      cleanupSessionSafe(session.id);
      console.log("Cancelled.");
      return;
    }
  }

  const results = await executeBatch(jobs, session.imagesDir, 2, (idx, status) => {
    if (!args.json) {
      const name = MODELS[jobs[idx].model].displayName;
      process.stderr.write(`\r  ${name}: ${status}  `);
    }
  });

  const meta = readSessionMeta(session.id);
  for (let i = 0; i < results.length; i++) {
    meta.jobs.push(jobResultToSession(jobs[i], results[i], 0));
  }
  meta.totalCost = estimateTotalCost(jobs);
  writeSessionMeta(session.id, meta);

  if (!args.json) {
    process.stderr.write("\r" + " ".repeat(60) + "\r");
    printResults(results, session.id);
  } else {
    printResultsJson(results, session.id);
  }
}

async function cmdReview(args: CliArgs): Promise<void> {
  const sessionId = resolveSessionId(args.sessionId);
  await startReviewServer(sessionId);
}

async function cmdRefine(args: CliArgs): Promise<void> {
  const sessionId = resolveSessionId(args.sessionId);
  const meta = readSessionMeta(sessionId);
  const selections = readSelections(sessionId);

  if (!selections) {
    throw new Error("No selections found. Run 'review' first to select images.");
  }

  const regenEntries = selections.selections.filter((s) => s.status === "regenerate");
  if (regenEntries.length === 0) {
    console.log("No images marked for regeneration.");
    return;
  }

  const currentRound = Math.max(0, ...meta.jobs.map((j) => j.round));
  const nextRound = currentRound + 1;
  const jobs: JobDefinition[] = [];

  for (const entry of regenEntries) {
    let originalJob = meta.jobs[0];
    for (const job of meta.jobs) {
      if (job.images.some((img) => img.filename === entry.filename)) {
        originalJob = job;
        break;
      }
    }

    if (!originalJob) {
      throw new Error(`Could not resolve original job for ${entry.filename}`);
    }

    const prompt = entry.newPrompt && entry.newPrompt.trim().length > 0
      ? entry.newPrompt.trim()
      : originalJob.prompt;
    const numImages = entry.numImages || 1;
    const maxImages = MODELS[originalJob.model].maxImages;
    if (numImages > maxImages) {
      throw new Error(`${MODELS[originalJob.model].displayName} supports max ${maxImages} images per call`);
    }

    jobs.push({
      prompt,
      model: originalJob.model as ModelId,
      numImages,
      imageSize: originalJob.params.imageSize as string,
      resolution: originalJob.params.resolution as string,
      aspectRatio: originalJob.params.aspectRatio as string,
      enableWebSearch: !!originalJob.params.enableWebSearch,
      outputFormat: (originalJob.params.outputFormat as "png" | "jpeg" | "webp") || "png",
      seed: originalJob.params.seed as number | undefined,
    });
  }

  const imagesDir = getImagesDir(sessionId);

  if (!args.json) {
    console.log(`\n=== UHD Refinement (Round ${nextRound}) ===\n`);
    console.log(`Session: ${sessionId}`);
    console.log(`Regenerating ${regenEntries.length} job(s)...\n`);
    printPlan(jobs, imagesDir, sessionId);
  } else if (args.dryRun) {
    printPlanJson(jobs, imagesDir, sessionId);
  }

  if (args.dryRun) return;

  if (!args.yes) {
    const ok = await confirm("Proceed with refinement?");
    if (!ok) {
      console.log("Cancelled.");
      return;
    }
  }

  const results = await executeBatch(jobs, imagesDir, args.concurrency, (idx, status) => {
    if (!args.json) process.stderr.write(`\r  Regen ${idx + 1}/${jobs.length}: ${status}  `);
  });

  for (let i = 0; i < results.length; i++) {
    meta.jobs.push(jobResultToSession(jobs[i], results[i], nextRound));
  }
  meta.totalCost += estimateTotalCost(jobs);
  meta.status = "refined";
  writeSessionMeta(sessionId, meta);

  const newImages = results.flatMap((r) => r.images);
  const updatedSelections = selections.selections.filter((s) => s.status !== "regenerate");
  for (const img of newImages) {
    updatedSelections.push({
      filename: basename(img.localPath),
      status: "keep",
    });
  }

  selections.selections = updatedSelections;
  selections.round = nextRound;
  selections.timestamp = new Date().toISOString();
  writeSelections(sessionId, selections);

  if (!args.json) {
    process.stderr.write("\r" + " ".repeat(60) + "\r");
    printResults(results, sessionId);
    console.log(`\nRun 'bun uhd.ts review ${sessionId}' to review all images.`);
  } else {
    printResultsJson(results, sessionId);
  }
}

async function cmdFinalize(args: CliArgs): Promise<void> {
  const sessionId = resolveSessionId(args.sessionId);
  const dest = args.dest || ".";

  const copied = finalizeSession(sessionId, dest);

  if (copied.length === 0) {
    console.log("No images to finalize.");
  } else {
    console.log(`\nFinalized ${copied.length} image(s) to ${dest}/`);
    for (const path of copied) {
      console.log(`  ${path}`);
    }
  }
}

function cmdSessions(): void {
  const sessionIds = listSessions();
  if (sessionIds.length === 0) {
    console.log("No sessions found.");
    return;
  }

  const metas = sessionIds.map((id) => readSessionMeta(id));
  printSessions(metas);
}

async function cmdClean(args: CliArgs): Promise<void> {
  if (args.cleanAll) {
    if (!args.yes) {
      const ok = await confirm("Delete ALL sessions?");
      if (!ok) {
        console.log("Cancelled.");
        return;
      }
    }
    deleteAllSessions();
    console.log("All sessions deleted.");
    return;
  }

  const sessionId = resolveSessionId(args.sessionId);
  if (!args.yes) {
    const ok = await confirm(`Delete session ${sessionId}?`);
    if (!ok) {
      console.log("Cancelled.");
      return;
    }
  }
  deleteSession(sessionId);
  console.log(`Session ${sessionId} deleted.`);
}

async function cmdStatus(args: CliArgs): Promise<void> {
  if (!args.requestId) {
    throw new Error("request-id is required. Usage: bun uhd.ts status <request-id>");
  }

  try {
    const status = await checkStatus(args.requestId, MODELS.seedream.endpoint);
    printStatus(status);
  } catch {
    try {
      const status = await checkStatus(args.requestId, MODELS.banana.endpoint);
      printStatus(status);
    } catch {
      throw new Error(`Could not find request: ${args.requestId}`);
    }
  }
}

function cmdHelp(): void {
  console.log(`
UHD — Image Generation CLI

Usage:
  bun uhd.ts <command> [options]

Commands:
  generate <prompt>        Generate image(s) from a text prompt
  batch <manifest.json>    Generate from a JSON manifest file
  compare <prompt>         Generate same prompt with both models
  review [session-id]      Open browser review picker
  refine [session-id]      Regenerate images marked for regen
  finalize [session-id]    Copy selected images to destination
  sessions                 List all sessions
  clean [session-id]       Delete a session (or --all)
  status <request-id>      Check queue status of a request
  help                     Show this help

Generation Options:
  --model, -m <model>      Model: seedream, banana, or auto (default: auto)
  --num, -n <count>        Number of images (default: 1)
  --size <size>            Seedream image_size (default: auto_2K)
  --resolution <res>       Banana resolution: 1K, 2K, 4K (default: 2K)
  --aspect <ratio>         Banana aspect ratio (default: auto)
  --format <fmt>           Output format: png, jpeg, webp (default: png)
  --web-search             Enable Banana web search (+$0.015/image)
  --seed <number>          Seed for reproducibility
  --name <name>            Override output filename base

Session Options:
  --session <id>           Specify session ID (default: latest)
  --dest, -d <dir>         Destination directory for finalize (default: .)
  --all                    Delete all sessions (with clean)

General Options:
  --yes, -y                Skip confirmation prompt
  --json                   JSON output (implies --yes)
  --dry-run                Show plan without executing
  --concurrency, -c <n>    Max concurrent jobs for batch/refine (default: 4)

Environment:
  FAL_KEY                  Required. Your fal.ai API key.

Workflow:
  1. Generate    bun uhd.ts generate "A sunset over the ocean" --num 2
  2. Review      bun uhd.ts review          # opens browser picker
  3. Refine      bun uhd.ts refine          # regen marked images
  4. Finalize    bun uhd.ts finalize -d .   # copy to project

Examples:
  bun uhd.ts generate "A white kitten in a teacup" --num 2
  bun uhd.ts generate "Badge with 'AI Summit'" -m banana --web-search
  bun uhd.ts compare "A cozy cafe at sunset" --dry-run
  bun uhd.ts compare "A cozy cafe at sunset" --dry-run --json
  bun uhd.ts batch manifest.json -c 4
  bun uhd.ts review
  bun uhd.ts finalize --dest ./images
  bun uhd.ts sessions
  bun uhd.ts clean --all
`.trim());
}

// ── Main ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  validateArgs(args);

  const needsKey = ["generate", "batch", "compare", "status", "refine"];
  if (needsKey.includes(args.command) && !args.dryRun && !process.env.FAL_KEY) {
    throw new Error("FAL_KEY environment variable is required. Set it with: export FAL_KEY=your-api-key");
  }

  switch (args.command) {
    case "generate":
      await cmdGenerate(args);
      break;
    case "batch":
      await cmdBatch(args);
      break;
    case "compare":
      await cmdCompare(args);
      break;
    case "review":
      await cmdReview(args);
      break;
    case "refine":
      await cmdRefine(args);
      break;
    case "finalize":
      await cmdFinalize(args);
      break;
    case "sessions":
      cmdSessions();
      break;
    case "clean":
      await cmdClean(args);
      break;
    case "status":
      await cmdStatus(args);
      break;
    case "help":
    default:
      cmdHelp();
      break;
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
