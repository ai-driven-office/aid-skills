import { fal } from "@fal-ai/client";
import type { JobDefinition, JobResult } from "./types.ts";
import { MODELS } from "./models.ts";
import { slugifyPrompt, generateFilenames } from "./naming.ts";
import { downloadImages } from "./download.ts";

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 2000;

/** Build the API input payload from a JobDefinition */
function buildInput(job: JobDefinition): Record<string, unknown> {
  if (job.model === "seedream") {
    return {
      prompt: job.prompt,
      image_size: job.imageSize || "auto_2K",
      num_images: job.numImages,
      ...(job.seed !== undefined && { seed: job.seed }),
    };
  }

  return {
    prompt: job.prompt,
    resolution: job.resolution || "2K",
    aspect_ratio: job.aspectRatio || "auto",
    num_images: job.numImages,
    output_format: job.outputFormat,
    enable_web_search: job.enableWebSearch || false,
    ...(job.seed !== undefined && { seed: job.seed }),
  };
}

/**
 * Execute a single job using fal.subscribe() for real-time progress.
 */
export async function executeJob(
  job: JobDefinition,
  outDir: string,
  onProgress?: (status: string) => void,
): Promise<JobResult> {
  const model = MODELS[job.model];
  const input = buildInput(job);
  const start = Date.now();

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await fal.subscribe(model.endpoint, {
        input,
        logs: false,
        onQueueUpdate: (update) => {
          if (onProgress) {
            if (update.status === "IN_QUEUE") {
              onProgress(`Queued (position: ${(update as { queue_position?: number }).queue_position ?? "?"})`);
            } else if (update.status === "IN_PROGRESS") {
              onProgress("Generating...");
            }
          }
        },
      });

      const data = result.data as { images: Array<{ url: string; width?: number; height?: number; content_type?: string }> };
      const baseName = job.name || slugifyPrompt(job.prompt);
      const filenames = generateFilenames(baseName, data.images.length, job.outputFormat, outDir);
      const images = await downloadImages(data.images, filenames, outDir);

      return {
        job,
        images,
        requestId: result.requestId,
        duration: Date.now() - start,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry auth or permission errors
      const msg = lastError.message.toLowerCase();
      if (msg.includes("401") || msg.includes("403") || msg.includes("unauthorized") || msg.includes("forbidden")) {
        throw lastError;
      }

      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt);
        if (onProgress) onProgress(`Retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error("Job failed after retries");
}

/**
 * Execute multiple jobs with concurrency control.
 * Uses fal.queue.submit() + polling for batch operations.
 */
export async function executeBatch(
  jobs: JobDefinition[],
  outDir: string,
  concurrency: number,
  onProgress?: (jobIndex: number, status: string) => void,
): Promise<JobResult[]> {
  const results: JobResult[] = new Array(jobs.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < jobs.length) {
      const idx = nextIndex++;
      const job = jobs[idx];
      const progressCb = onProgress ? (s: string) => onProgress(idx, s) : undefined;

      if (progressCb) progressCb("Starting...");
      results[idx] = await executeJob(job, outDir, progressCb);
      if (progressCb) progressCb("Done");
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, jobs.length) }, () => worker());
  await Promise.all(workers);

  return results;
}

/**
 * Check the status of a queued request.
 */
export async function checkStatus(
  requestId: string,
  endpoint: string,
): Promise<{ requestId: string; status: string; position?: number }> {
  const status = await fal.queue.status(endpoint, {
    requestId,
    logs: false,
  });

  return {
    requestId,
    status: status.status,
    position: (status as { queue_position?: number }).queue_position,
  };
}
