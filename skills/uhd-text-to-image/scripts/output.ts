import type { JobDefinition, JobResult, SessionMeta } from "./types.ts";
import { MODELS } from "./models.ts";
import { estimateJobCost, estimateTotalCost, formatCost } from "./cost.ts";
import { slugifyPrompt, generateFilenames } from "./naming.ts";

const LINE = "\u2500".repeat(40);

/** Display the generation plan for confirmation */
export function printPlan(
  jobs: JobDefinition[],
  outDir: string,
  sessionId?: string,
): void {
  console.log("\n=== UHD Generation Plan ===\n");

  if (sessionId) {
    console.log(`Session: ${sessionId}`);
    console.log();
  }

  let totalImages = 0;
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const model = MODELS[job.model];
    const baseName = job.name || slugifyPrompt(job.prompt);
    const filenames = generateFilenames(baseName, job.numImages, job.outputFormat, outDir);
    const cost = estimateJobCost(job);

    console.log(`Job ${i + 1}/${jobs.length}:`);
    console.log(`  Model:      ${model.displayName}`);
    console.log(`  Prompt:     "${truncate(job.prompt, 60)}"`);

    if (job.model === "seedream") {
      console.log(`  Size:       ${job.imageSize || "auto_2K"}`);
    } else {
      console.log(`  Resolution: ${job.resolution || "2K"}`);
      if (job.aspectRatio && job.aspectRatio !== "auto") {
        console.log(`  Aspect:     ${job.aspectRatio}`);
      }
      if (job.enableWebSearch) {
        console.log(`  Web search: enabled (+${formatCost(model.webSearchCost! * job.numImages)})`);
      }
    }

    console.log(`  Images:     ${job.numImages}`);
    console.log(`  Filenames:  ${filenames[0]}`);
    for (let j = 1; j < filenames.length; j++) {
      console.log(`              ${filenames[j]}`);
    }
    console.log(`  Cost:       ${formatCost(cost)} (${job.numImages} x ${formatCost(cost / job.numImages)})`);

    if (job.seed !== undefined) {
      console.log(`  Seed:       ${job.seed}`);
    }

    totalImages += job.numImages;
    if (i < jobs.length - 1) console.log();
  }

  const totalCost = estimateTotalCost(jobs);
  console.log(`\n${LINE}`);
  console.log(`Total: ${totalImages} image${totalImages !== 1 ? "s" : ""}, ${formatCost(totalCost)}`);
  console.log(`Output: ${outDir}`);
  console.log(LINE);
}

/** Print results after generation */
export function printResults(results: JobResult[], sessionId?: string): void {
  console.log("\n=== UHD Results ===\n");

  if (sessionId) {
    console.log(`Session: ${sessionId}\n`);
  }

  for (const result of results) {
    const model = MODELS[result.job.model];
    console.log(`${model.displayName} (${(result.duration / 1000).toFixed(1)}s):`);
    for (const img of result.images) {
      console.log(`  ${img.localPath} (${img.width}x${img.height})`);
    }
  }

  const totalImages = results.reduce((sum, r) => sum + r.images.length, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`\nDone: ${totalImages} image${totalImages !== 1 ? "s" : ""} in ${(totalDuration / 1000).toFixed(1)}s`);

  if (sessionId) {
    console.log(`\nNext: bun uhd.ts review ${sessionId}`);
  }
}

/** Output results as JSON */
export function printResultsJson(results: JobResult[], sessionId?: string): void {
  const output = {
    ...(sessionId && { sessionId }),
    results: results.map((r) => ({
      model: r.job.model,
      prompt: r.job.prompt,
      requestId: r.requestId,
      durationMs: r.duration,
      images: r.images.map((img) => ({
        path: img.localPath,
        url: img.url,
        width: img.width,
        height: img.height,
      })),
    })),
  };
  console.log(JSON.stringify(output, null, 2));
}

/** Print queue status */
export function printStatus(status: { requestId: string; status: string; position?: number }): void {
  console.log(`Request: ${status.requestId}`);
  console.log(`Status:  ${status.status}`);
  if (status.position !== undefined) {
    console.log(`Queue position: ${status.position}`);
  }
}

/** Print list of sessions */
export function printSessions(sessions: SessionMeta[]): void {
  if (sessions.length === 0) {
    console.log("No sessions found.");
    return;
  }

  console.log("\n=== UHD Sessions ===\n");
  for (const meta of sessions) {
    const imageCount = meta.jobs.reduce((sum, j) => sum + j.images.length, 0);
    console.log(`  ${meta.id}`);
    console.log(`    Status: ${meta.status}  |  ${imageCount} images  |  ${formatCost(meta.totalCost)}  |  ${meta.command}`);
  }
  console.log();
}

/** Print detailed session info */
export function printSessionInfo(meta: SessionMeta): void {
  console.log(`\n=== Session: ${meta.id} ===\n`);
  console.log(`  Status:   ${meta.status}`);
  console.log(`  Created:  ${meta.createdAt}`);
  console.log(`  Command:  ${meta.command}`);
  console.log(`  Cost:     ${formatCost(meta.totalCost)}`);
  console.log(`  Jobs:     ${meta.jobs.length}`);

  for (let i = 0; i < meta.jobs.length; i++) {
    const job = meta.jobs[i];
    console.log(`\n  Job ${i + 1} (round ${job.round}):`);
    console.log(`    Model:  ${job.model}`);
    console.log(`    Prompt: "${truncate(job.prompt, 50)}"`);
    console.log(`    Images: ${job.images.length}`);
    for (const img of job.images) {
      console.log(`      ${img.filename} (${img.width}x${img.height})`);
    }
  }
  console.log();
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 3) + "..." : str;
}
