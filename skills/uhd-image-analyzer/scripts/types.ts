// Types for UHD Image Analyzer

export type Command = "inspect" | "metadata" | "hdr" | "compat" | "batch" | "report" | "diff" | "help";

export interface CliArgs {
  command: Command;
  input?: string;
  input2?: string;
  output?: string;
  recursive: boolean;
  filter?: "hdr" | "sdr";
  summary: boolean;
  json: boolean;
  quiet: boolean;
  stdin: boolean;
}

export interface ImageInfo {
  path: string;
  filename: string;
  format: string;
  mimeType: string;
  width: number;
  height: number;
  fileSize: number;
  fileSizeHuman: string;
  colorSpace: string;
  bitDepth: number;
  channels: number;
  hasAlpha: boolean;
  iccProfile?: IccProfile;
  hdr: HdrInfo;
  exif?: ExifData;
  compression: CompressionInfo;
}

export interface IccProfile {
  name: string;
  description?: string;
  colorSpace: string;
}

export interface HdrInfo {
  capable: boolean;
  reason: string;
  gainMap: GainMapInfo | null;
  colorSpace: string;
  transferFunction?: string;
  maxHeadroom?: number;
  estimatedDR?: number;
}

export interface GainMapInfo {
  present: boolean;
  type?: "iso-21496-1" | "apple" | "android-xmp" | "unknown";
  headroom?: number;
  mapType?: "rgb" | "luminosity";
}

export interface ExifData {
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: number;
  dateTime?: string;
  gps?: { lat: number; lon: number };
  software?: string;
  [key: string]: unknown;
}

export interface CompressionInfo {
  codec: string;
  qualityEstimate?: number;
  effort?: number;
  lossless: boolean;
}

export interface CompatEntry {
  browser: string;
  version: string;
  support: "full" | "partial" | "none";
  note: string;
}

export interface CompatReport {
  file: string;
  format: string;
  hdr: boolean;
  desktop: CompatEntry[];
  mobile: CompatEntry[];
  recommendedFallback: string;
  hdrAudiencePercent: number;
}

export interface BatchResult {
  total: number;
  analyzed: number;
  errors: number;
  images: ImageInfo[];
  summary?: BatchSummary;
}

export interface BatchSummary {
  totalSize: number;
  avgSize: number;
  formats: Record<string, number>;
  hdrCount: number;
  sdrCount: number;
  colorSpaces: Record<string, number>;
  bitDepths: Record<number, number>;
}

export interface DiffResult {
  file1: ImageInfo;
  file2: ImageInfo;
  differences: DiffEntry[];
}

export interface DiffEntry {
  field: string;
  value1: string | number;
  value2: string | number;
  significant: boolean;
}

/** Piping input from another UHD skill */
export interface PipeInput {
  path?: string;
  paths?: string[];
}
