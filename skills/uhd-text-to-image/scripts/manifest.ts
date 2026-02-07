import { readFileSync } from "fs";
import type { BatchManifest, JobDefinition, ManifestJobEntry, ModelId } from "./types.ts";
import { autoSelectModel, MODELS } from "./models.ts";

const VALID_MODELS = new Set(["auto", "seedream", "banana"]);
const VALID_OUTPUT_FORMATS = new Set(["png", "jpeg", "webp"]);
const VALID_RESOLUTIONS = new Set(["1K", "2K", "4K"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function validateCommonEntryShape(
  entry: unknown,
  label: string,
  requirePrompt: boolean,
): void {
  if (!isObject(entry)) {
    throw new Error(`${label} must be an object`);
  }

  if (requirePrompt) {
    if (typeof entry.prompt !== "string" || entry.prompt.trim().length === 0) {
      throw new Error(`${label}: 'prompt' is required and must be a non-empty string`);
    }
  } else if (entry.prompt !== undefined && (typeof entry.prompt !== "string" || entry.prompt.trim().length === 0)) {
    throw new Error(`${label}: 'prompt' must be a non-empty string`);
  }

  if (entry.model !== undefined && (typeof entry.model !== "string" || !VALID_MODELS.has(entry.model))) {
    throw new Error(`${label}: 'model' must be one of auto, seedream, banana`);
  }

  if (entry.numImages !== undefined) {
    if (!Number.isInteger(entry.numImages) || Number(entry.numImages) <= 0) {
      throw new Error(`${label}: 'numImages' must be a positive integer`);
    }
  }

  if (entry.outputFormat !== undefined && (typeof entry.outputFormat !== "string" || !VALID_OUTPUT_FORMATS.has(entry.outputFormat))) {
    throw new Error(`${label}: 'outputFormat' must be one of png, jpeg, webp`);
  }

  if (entry.resolution !== undefined && (typeof entry.resolution !== "string" || !VALID_RESOLUTIONS.has(entry.resolution))) {
    throw new Error(`${label}: 'resolution' must be one of 1K, 2K, 4K`);
  }

  if (entry.seed !== undefined && !Number.isInteger(entry.seed)) {
    throw new Error(`${label}: 'seed' must be an integer`);
  }
}

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

  if (!isObject(data)) {
    throw new Error("Manifest must be a JSON object");
  }

  if (data.defaults !== undefined) {
    validateCommonEntryShape(data.defaults, "Manifest defaults", false);
  }

  if (!Array.isArray(data.jobs) || data.jobs.length === 0) {
    throw new Error("Manifest must have a non-empty 'jobs' array");
  }

  data.jobs.forEach((entry, idx) => {
    validateCommonEntryShape(entry, `Job ${idx + 1}`, true);
  });

  return data as BatchManifest;
}

/**
 * Convert manifest entries into fully resolved JobDefinitions.
 */
export function resolveManifestJobs(manifest: BatchManifest): JobDefinition[] {
  const defaults = manifest.defaults || {};

  return manifest.jobs.map((entry, idx) => {
    const merged: ManifestJobEntry = { ...defaults, ...entry };
    const modelChoice = merged.model || "auto";
    const resolvedModel: ModelId =
      modelChoice === "auto" ? autoSelectModel(merged.prompt) : modelChoice;
    const numImages = merged.numImages || 1;
    const maxImages = MODELS[resolvedModel].maxImages;

    if (numImages > maxImages) {
      throw new Error(
        `Job ${idx + 1}: ${MODELS[resolvedModel].displayName} supports max ${maxImages} images per call`,
      );
    }

    return {
      prompt: merged.prompt,
      model: resolvedModel,
      numImages,
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
