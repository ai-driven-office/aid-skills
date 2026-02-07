// Types for UHD Format Converter

export type Command = "convert" | "batch" | "compare" | "negotiate" | "help";

export type ImageFormat = "avif" | "webp" | "jpeg" | "png" | "jxl" | "heif" | "tiff";
export type ChromaSubsampling = "420" | "422" | "444";
export type ColorSpace = "srgb" | "display-p3" | "rec2020" | "adobe-rgb";
export type BrowserTarget = "modern" | "universal" | string;

export interface CliArgs {
  command: Command;
  input?: string;
  output?: string;
  format?: ImageFormat;
  quality: number;
  bitDepth?: 8 | 10 | 12 | 16;
  colorSpace?: ColorSpace;
  lossless: boolean;
  effort: number;
  chroma?: ChromaSubsampling;
  strip: boolean;
  keepMetadata: boolean;
  recursive: boolean;
  preserveStructure: boolean;
  skipExisting: boolean;
  concurrency: number;
  target?: BrowserTarget;
  generate: boolean;
  qualities?: number[];
  json: boolean;
  yes: boolean;
  dryRun: boolean;
  stdin: boolean;
}

export interface FormatConfig {
  id: ImageFormat;
  displayName: string;
  extensions: string[];
  mimeType: string;
  supportsHdr: boolean;
  supportsLossless: boolean;
  supportsAlpha: boolean;
  maxBitDepth: number;
  defaultQuality: number;
  defaultEffort: number;
}

export interface ConvertJob {
  input: string;
  output: string;
  format: ImageFormat;
  quality: number;
  bitDepth?: number;
  colorSpace?: ColorSpace;
  lossless: boolean;
  effort: number;
  chroma?: ChromaSubsampling;
  strip: boolean;
  keepMetadata: boolean;
}

export interface ConvertResult {
  input: string;
  output: string;
  inputFormat: string;
  outputFormat: ImageFormat;
  inputSize: number;
  outputSize: number;
  reduction: number;
  reductionPercent: string;
  width: number;
  height: number;
  duration: number;
}

export interface CompareResult {
  input: string;
  inputSize: number;
  width: number;
  height: number;
  results: CompareEntry[];
}

export interface CompareEntry {
  format: ImageFormat;
  quality: number;
  size: number;
  sizeHuman: string;
  reductionPercent: string;
  path: string;
}

export interface NegotiateResult {
  input: string;
  primaryFormat: ImageFormat;
  fallbackFormat: ImageFormat;
  universalFormat: ImageFormat;
  recommendations: NegotiateEntry[];
  generatedFiles?: string[];
}

export interface NegotiateEntry {
  browser: string;
  recommendedFormat: ImageFormat;
  reason: string;
}

/** Piping input from another UHD skill */
export interface PipeInput {
  path?: string;
  paths?: string[];
}
