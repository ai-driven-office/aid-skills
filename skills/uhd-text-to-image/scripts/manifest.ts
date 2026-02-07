import { readFileSync } from "fs";
import type { BatchManifest, JobDefinition, ManifestJobEntry, ModelId } from "./types.ts";
import { autoSelectModel } from "./models.ts";

/**
 * Parse and validate a batch manifest JSON file.
 */
export function parseManifest(path: string): BatchManifest {
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    throw new Error(`Cannot read manifest file: ${path}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in manifest file: ${path}`);
  }

  const manifest = data as BatchManifest;

  if (!manifest.jobs || !Array.isArray(manifest.jobs) || manifest.jobs.length === 0) {
    throw new Error("Manifest must have a non-empty 'jobs' array");
  }

  for (let i = 0; i < manifest.jobs.length; i++) {
    const job = manifest.jobs[i];
    if (!job.prompt || typeof job.prompt !== "string") {
      throw new Error(`Job ${i + 1}: 'prompt' is required and must be a string`);
    }
  }

  return manifest;
}

/**
 * Convert manifest entries into fully resolved JobDefinitions.
 */
export function resolveManifestJobs(manifest: BatchManifest): JobDefinition[] {
  const defaults = manifest.defaults || {};

  return manifest.jobs.map((entry) => {
    const merged: ManifestJobEntry = { ...defaults, ...entry };
    const modelChoice = merged.model || "auto";
    const resolvedModel: ModelId =
      modelChoice === "auto" ? autoSelectModel(merged.prompt) : modelChoice;

    return {
      prompt: merged.prompt,
      model: resolvedModel,
      numImages: merged.numImages || 1,
      name: merged.name,
      imageSize: merged.imageSize || "auto_2K",
      resolution: merged.resolution || "2K",
      aspectRatio: merged.aspectRatio || "auto",
      enableWebSearch: merged.enableWebSearch || false,
      outputFormat: merged.outputFormat || "png",
      seed: merged.seed,
    };
  });
}
