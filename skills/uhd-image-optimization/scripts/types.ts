// Types for UHD Image Optimization

export type Command = "optimize" | "web" | "batch" | "audit" | "report" | "help";

export type Preset = "web" | "print" | "social" | "custom";
export type LqipType = "blurhash" | "thumbhash" | "css" | "svg" | "micro";
export type ImageFormat = "avif" | "webp" | "jpeg" | "png" | "tiff";

export interface CliArgs {
  command: Command;
  input?: string;
  output?: string;
  preset: Preset;
  breakpoints: number[];
  formats: ImageFormat[];
  lqip?: LqipType;
  maxWidth: number;
  qualityAvif: number;
  qualityWebp: number;
  qualityJpeg: number;
  html: boolean;
  recursive: boolean;
  concurrency: number;
  json: boolean;
  yes: boolean;
  dryRun: boolean;
  stdin: boolean;
  platform?: string;
}

export interface PresetConfig {
  id: Preset;
  displayName: string;
  formats: ImageFormat[];
  qualities: Record<ImageFormat, number>;
  maxWidth: number;
  breakpoints: number[];
  lqip?: LqipType;
  stripMetadata: boolean;
  preserveMetadata: string[];
  effort: number;
  colorSpace?: string;
}

export interface PlatformProfile {
  name: string;
  maxWidth: number;
  maxHeight: number;
  aspectRatios: string[];
  formats: ImageFormat[];
  quality: number;
  hdrSupport: boolean;
  notes?: string;
}

export interface OptimizeJob {
  input: string;
  outputDir: string;
  preset: PresetConfig;
  breakpoints: number[];
  formats: ImageFormat[];
  lqip?: LqipType;
  platform?: PlatformProfile;
}

export interface OptimizeResult {
  input: string;
  inputSize: number;
  outputDir: string;
  variants: VariantResult[];
  lqip?: LqipResult;
  totalOutputSize: number;
  savings: number;
  savingsPercent: string;
  manifest?: VariantManifest;
}

export interface VariantResult {
  path: string;
  format: ImageFormat;
  width: number;
  height: number;
  size: number;
  sizeHuman: string;
  breakpoint?: number;
}

export interface LqipResult {
  type: LqipType;
  value: string;
  path?: string;
  size: number;
}

export interface VariantManifest {
  source: string;
  variants: VariantResult[];
  lqip?: LqipResult;
  html?: string;
}

export interface AuditResult {
  file: string;
  fileSize: number;
  fileSizeHuman: string;
  width: number;
  height: number;
  format: string;
  loadTimeOnTarget: number;
  targetBandwidth: number;
  status: "ok" | "warning" | "critical";
  suggestions: string[];
  estimatedOptimizedSize?: number;
  estimatedSavings?: string;
}

export interface AuditReport {
  totalFiles: number;
  totalSize: number;
  totalSizeHuman: string;
  ok: number;
  warnings: number;
  critical: number;
  audits: AuditResult[];
  potentialSavings: number;
  potentialSavingsPercent: string;
  estimatedLcpImprovement?: string;
}

export interface ReportData {
  directory: string;
  totalFiles: number;
  totalSize: number;
  formatDistribution: Record<string, number>;
  opportunities: AuditResult[];
  estimatedSavings: number;
}

/** Piping input from another UHD skill */
export interface PipeInput {
  path?: string;
  paths?: string[];
}
