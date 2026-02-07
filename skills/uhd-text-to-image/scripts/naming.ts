import { existsSync } from "fs";
import { join } from "path";

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "shall", "can", "it", "its", "this",
  "that", "these", "those", "very", "just", "also",
]);

/**
 * Generate a smart filename from a prompt.
 * 1. Extract first 7 significant words (skip stop words)
 * 2. Slugify: lowercase, replace non-alnum with hyphens
 * 3. Truncate at 50 chars
 */
export function slugifyPrompt(prompt: string): string {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));

  const slug = words.slice(0, 7).join("-");
  return slug.slice(0, 50).replace(/-$/, "") || "image";
}

interface FilenameOptions {
  /** Reserve generated names in-process to avoid collisions across concurrent jobs */
  reserve?: boolean;
}

const RESERVED_FILENAMES = new Set<string>();

function sanitizeBaseName(baseName: string): string {
  const trimmed = baseName.trim();
  if (!trimmed) return "image";

  const sanitized = trimmed
    .replace(/[\\/]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .replace(/^\.+/, "");

  return sanitized.slice(0, 80) || "image";
}

/**
 * Generate filenames for a job, handling multi-image suffixes and collisions.
 */
export function generateFilenames(
  baseName: string,
  numImages: number,
  format: string,
  outDir: string,
  options: FilenameOptions = {},
): string[] {
  const safeBaseName = sanitizeBaseName(baseName);
  const shouldReserve = options.reserve === true;
  const names: string[] = [];
  for (let i = 0; i < numImages; i++) {
    const suffix = numImages > 1 ? `-${i + 1}` : "";
    let candidate = `${safeBaseName}${suffix}.${format}`;
    let counter = 1;
    while (existsSync(join(outDir, candidate)) || RESERVED_FILENAMES.has(candidate)) {
      candidate = `${safeBaseName}${suffix}-${counter}.${format}`;
      counter++;
    }
    if (shouldReserve) {
      RESERVED_FILENAMES.add(candidate);
    }
    names.push(candidate);
  }
  return names;
}
