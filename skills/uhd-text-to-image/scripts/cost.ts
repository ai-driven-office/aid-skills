import type { JobDefinition } from "./types.ts";
import { MODELS } from "./models.ts";

/** Calculate cost for a single job */
export function estimateJobCost(job: JobDefinition): number {
  const model = MODELS[job.model];
  let perImage = model.costPerImage;

  // Banana 4K doubles the cost
  if (job.model === "banana" && job.resolution === "4K" && model.costPerImage4K) {
    perImage = model.costPerImage4K;
  }

  let total = perImage * job.numImages;

  // Web search addon
  if (job.enableWebSearch && model.webSearchCost) {
    total += model.webSearchCost * job.numImages;
  }

  return total;
}

/** Calculate total cost for multiple jobs */
export function estimateTotalCost(jobs: JobDefinition[]): number {
  return jobs.reduce((sum, job) => sum + estimateJobCost(job), 0);
}

/** Format cost as USD string */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}
