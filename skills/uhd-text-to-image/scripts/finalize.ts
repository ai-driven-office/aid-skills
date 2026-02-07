import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join, basename } from "path";
import { readSessionMeta, readSelections, writeSessionMeta, getImagesDir } from "./session.ts";

/**
 * Copy selected ("keep") images from a session to a destination directory.
 * Updates session status to "finalized".
 */
export function finalizeSession(sessionId: string, dest: string): string[] {
  const meta = readSessionMeta(sessionId);
  const selections = readSelections(sessionId);
  const imagesDir = getImagesDir(sessionId);

  mkdirSync(dest, { recursive: true });

  // Determine which files to copy
  let filesToCopy: string[];

  if (selections) {
    // Copy only files marked as "keep"
    filesToCopy = selections.selections
      .filter((s) => s.status === "keep")
      .map((s) => s.filename);
  } else {
    // No selections — copy all images
    filesToCopy = meta.jobs.flatMap((j) => j.images.map((img) => img.filename));
  }

  const copied: string[] = [];
  for (const filename of filesToCopy) {
    const src = join(imagesDir, filename);
    if (!existsSync(src)) {
      console.error(`Warning: image not found, skipping: ${filename}`);
      continue;
    }
    const destPath = join(dest, basename(filename));
    copyFileSync(src, destPath);
    copied.push(destPath);
  }

  // Update session status
  meta.status = "finalized";
  writeSessionMeta(sessionId, meta);

  return copied;
}
