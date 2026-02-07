// Types for UHD SDR-to-HDR Converter

export type Command = "convert" | "batch" | "preview" | "analyze" | "capabilities" | "help";

export type ConvertMethod = "gainmap" | "ai" | "auto";
export type GainMapType = "rgb" | "luminosity";
export type OutputFormat = "avif" | "jxl" | "jpeg" | "ultrahdr-jpeg";
export type ColorSpace = "display-p3" | "rec2020";
export type HdrTransfer = "pq" | "hlg" | "sdr";

export interface CliArgs {
  command: Command;
  input?: string;
  output?: string;
  method: ConvertMethod;
  headroom: number;
  mapType: GainMapType;
  gamma: number;
  highlightBoost: number;
  shadowLift: number;
  format: OutputFormat;
  bitDepth: 8 | 10 | 12;
  colorSpace: ColorSpace;
  transfer: HdrTransfer;
  peakNits: number;
  strength: number;
  aiModel: string;
  recursive: boolean;
  concurrency: number;
  json: boolean;
  yes: boolean;
  dryRun: boolean;
  stdin: boolean;
}

export interface ConvertJob {
  input: string;
  output: string;
  method: ConvertMethod;
  gainMapOptions: GainMapOptions;
  aiOptions: AiOptions;
  format: OutputFormat;
  bitDepth: number;
  colorSpace: ColorSpace;
}

export interface GainMapOptions {
  headroom: number;
  mapType: GainMapType;
  gamma: number;
  highlightBoost: number;
  shadowLift: number;
}

export interface AiOptions {
  strength: number;
  model: string;
}

export interface ConvertResult {
  input: string;
  output: string;
  method: ConvertMethod;
  inputFormat: string;
  outputFormat: OutputFormat;
  inputSize: number;
  outputSize: number;
  headroom: number;
  colorSpace: ColorSpace;
  bitDepth: number;
  transfer: HdrTransfer;
  encoder: string;
  duration: number;
  cost?: number;
  cicp?: { primaries: number; transfer: number; matrix: number };
  warning?: string;
}

export interface AnalyzeResult {
  file: string;
  width: number;
  height: number;
  format: string;
  bitDepth: number;
  colorSpace: string;
  currentDR: number;
  histogram: HistogramAnalysis;
  potential: "high" | "medium" | "low";
  recommendedMethod: ConvertMethod;
  recommendedHeadroom: number;
  suggestedCommand: string;
  quality: number;
}

export interface HistogramAnalysis {
  shadowPercent: number;
  midtonePercent: number;
  highlightPercent: number;
  shadowClipping: boolean;
  highlightClipping: boolean;
  dynamicRange: number;
  peakBrightness: number;
}

export interface PreviewConfig {
  input: string;
  headroomLevels: number[];
  port: number;
}

/** Piping input from another UHD skill */
export interface PipeInput {
  path?: string;
  paths?: string[];
}
