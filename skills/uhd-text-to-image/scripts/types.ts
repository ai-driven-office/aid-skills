// Shared types for UHD image generation CLI

export type ModelId = "seedream" | "banana";

export interface ModelConfig {
  id: ModelId;
  endpoint: string;
  displayName: string;
  maxImages: number;
  costPerImage: number;
  /** Cost per image at 4K resolution (banana only) */
  costPerImage4K?: number;
  /** Additional cost for web search (banana only) */
  webSearchCost?: number;
}

export interface JobDefinition {
  prompt: string;
  model: ModelId;
  numImages: number;
  /** Output filename base (without extension) */
  name?: string;
  // Seedream options
  imageSize?: string;
  // Banana options
  resolution?: string;
  aspectRatio?: string;
  enableWebSearch?: boolean;
  // Common
  outputFormat: "png" | "jpeg" | "webp";
  seed?: number;
}

export interface JobResult {
  job: JobDefinition;
  images: DownloadedImage[];
  requestId: string;
  duration: number;
}

export interface DownloadedImage {
  url: string;
  localPath: string;
  width: number;
  height: number;
  contentType: string;
}

export interface QueueStatus {
  requestId: string;
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  position?: number;
}

export interface BatchManifest {
  defaults?: Partial<ManifestJobEntry>;
  jobs: ManifestJobEntry[];
}

export interface ManifestJobEntry {
  prompt: string;
  name?: string;
  model?: ModelId | "auto";
  numImages?: number;
  imageSize?: string;
  resolution?: string;
  aspectRatio?: string;
  enableWebSearch?: boolean;
  outputFormat?: "png" | "jpeg" | "webp";
  seed?: number;
}

// ── Session Types ─────────────────────────────────────────────

export type SessionStatus = "generated" | "reviewed" | "refined" | "finalized";

export interface SessionImage {
  filename: string;
  width: number;
  height: number;
  requestId: string;
  url: string;
}

export interface SessionJob {
  prompt: string;
  model: ModelId;
  numImages: number;
  cost: number;
  round: number;
  params: Record<string, unknown>;
  images: SessionImage[];
}

export interface SessionMeta {
  id: string;
  createdAt: string;
  command: string;
  status: SessionStatus;
  jobs: SessionJob[];
  totalCost: number;
}

// ── Selection Types ───────────────────────────────────────────

export type SelectionStatus = "keep" | "reject" | "regenerate";

export interface SelectionEntry {
  filename: string;
  status: SelectionStatus;
  newPrompt?: string;
  numImages?: number;
}

export interface SelectionSet {
  timestamp: string;
  round: number;
  selections: SelectionEntry[];
}

// ── CLI Types ─────────────────────────────────────────────────

export type Command =
  | "generate"
  | "batch"
  | "compare"
  | "review"
  | "refine"
  | "finalize"
  | "sessions"
  | "clean"
  | "status"
  | "help";

export interface CliArgs {
  command: Command;
  prompt?: string;
  manifestPath?: string;
  requestId?: string;
  sessionId?: string;
  dest?: string;
  cleanAll?: boolean;
  model: ModelId | "auto";
  numImages: number;
  imageSize: string;
  resolution: string;
  aspectRatio: string;
  outputFormat: "png" | "jpeg" | "webp";
  enableWebSearch: boolean;
  seed?: number;
  yes: boolean;
  json: boolean;
  dryRun: boolean;
  concurrency: number;
  name?: string;
}
