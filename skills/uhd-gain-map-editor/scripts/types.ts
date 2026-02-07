// Types for UHD Gain Map Editor

export type Command = "create" | "extract" | "edit" | "preview" | "validate" | "inspect" | "batch-create" | "help";

export type GainMapType = "rgb" | "luminosity";
export type GainMapStandard = "iso" | "android" | "both";
export type OutputFormat = "jpeg" | "avif";

export interface CliArgs {
  command: Command;
  input?: string;
  input2?: string;
  output?: string;
  type: GainMapType;
  headroom: number;
  standard: GainMapStandard;
  format: OutputFormat;
  quality: number;
  mapQuality: number;
  mapResolution: "full" | "half";
  sdrBrightness: number;
  sdrContrast: number;
  sdrSaturation: number;
  sdrShadows: number;
  sdrHighlights: number;
  sdrWarmth: number;
  recursive: boolean;
  concurrency: number;
  json: boolean;
  yes: boolean;
  dryRun: boolean;
  stdin: boolean;
}

export interface CreateJob {
  sdrInput: string;
  hdrInput: string;
  output: string;
  type: GainMapType;
  headroom: number;
  standard: GainMapStandard;
  format: OutputFormat;
  quality: number;
  mapQuality: number;
  mapResolution: "full" | "half";
}

export interface CreateResult {
  sdrInput: string;
  hdrInput: string;
  output: string;
  type: GainMapType;
  headroom: number;
  standard: GainMapStandard;
  outputSize: number;
  mapSize: number;
  duration: number;
  verification: VerificationResult;
}

export interface VerificationResult {
  passed: boolean;
  maxError: number;
  meanError: number;
  psnr: number;
}

export interface ExtractResult {
  input: string;
  outputDir: string;
  sdrBase: string;
  gainMap: string;
  heatmap: string;
  metadata: GainMapMetadata;
}

export interface GainMapMetadata {
  type: GainMapType;
  standard: string;
  headroom: number;
  minHeadroom: number;
  mapWidth: number;
  mapHeight: number;
  mapBitDepth: number;
  sdrWidth: number;
  sdrHeight: number;
  sdrColorSpace: string;
  hdrColorSpace: string;
  gamma: number;
}

export interface EditResult {
  input: string;
  output: string;
  adjustments: Record<string, number>;
  duration: number;
}

export interface InspectResult {
  file: string;
  type: GainMapType;
  standard: string;
  headroom: number;
  minHeadroom: number;
  mapWidth: number;
  mapHeight: number;
  mapBitDepth: number;
  sdrBase: { width: number; height: number; colorSpace: string; quality: number };
  hdrColorSpace: string;
  gamma: number;
  gainStats: GainStats;
  coverage: GainCoverage;
}

export interface GainStats {
  min: number;
  max: number;
  mean: number;
  stdDev: number;
}

export interface GainCoverage {
  highlightPercent: number;
  shadowPercent: number;
  neutralPercent: number;
}

export interface ValidateResult {
  file: string;
  passed: boolean;
  checks: ValidateCheck[];
  warnings: string[];
  recommendations: string[];
}

export interface ValidateCheck {
  name: string;
  passed: boolean;
  message: string;
}

/** Piping input from another UHD skill */
export interface PipeInput {
  path?: string;
  paths?: string[];
}
