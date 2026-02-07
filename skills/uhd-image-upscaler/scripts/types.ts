// Types for UHD Image Upscaler

export type Command = "upscale" | "batch" | "compare" | "help";

export type ModelId = "clarity" | "real-esrgan" | "aura-sr" | "creative" | "auto";
export type ScaleFactor = 2 | 4;
export type OutputFormat = "png" | "jpeg" | "webp";

export interface CliArgs {
  command: Command;
  input?: string;
  output?: string;
  scale: ScaleFactor;
  model: ModelId;
  format: OutputFormat;
  creativity: number;
  concurrency: number;
  recursive: boolean;
  json: boolean;
  yes: boolean;
  dryRun: boolean;
  stdin: boolean;
}

export interface ModelConfig {
  id: ModelId;
  endpoint: string;
  displayName: string;
  costPerImage: number;
  supports4x: boolean;
  description: string;
}

export interface UpscaleJob {
  input: string;
  output: string;
  scale: ScaleFactor;
  model: ModelId;
  format: OutputFormat;
  creativity?: number;
}

export interface UpscaleResult {
  input: string;
  output: string;
  model: ModelId;
  scale: ScaleFactor;
  inputWidth: number;
  inputHeight: number;
  outputWidth: number;
  outputHeight: number;
  inputSize: number;
  outputSize: number;
  cost: number;
  duration: number;
  requestId: string;
}

export interface CompareResult {
  input: string;
  inputWidth: number;
  inputHeight: number;
  outputWidth: number;
  outputHeight: number;
  scale: ScaleFactor;
  results: CompareEntry[];
  totalCost: number;
  outputDir: string;
}

export interface CompareEntry {
  model: ModelId;
  displayName: string;
  output: string;
  size: number;
  sizeHuman: string;
  cost: number;
  duration: number;
}

export interface BatchPlan {
  images: string[];
  scale: ScaleFactor;
  model: ModelId;
  estimatedCost: number;
  outputDir: string;
}

/** Piping input from another UHD skill */
export interface PipeInput {
  path?: string;
  paths?: string[];
}
