import { copyFileSync, existsSync, mkdirSync } from "fs";
import { basename, extname, join } from "path";
import { getImagesDir, readSelections, readSessionMeta, writeSessionMeta } from "./session.ts";

function resolveUniqueDestinationPath(destDir: string, filename: string): string {
  const base = basename(filename);
  const ext = extname(base);
  const stem = ext ? base.slice(0, -ext.length) : base;

  let candidate = join(destDir, base);
  let counter = 1;
  while (existsSync(candidate)) {
    candidate = join(destDir, `${stem}-${counter}${ext}`);
    counter++;
  }

  return candidate;
}

/**
 * Copy selected ("keep") images from a session to a destination directory.
 * Updates session status to "finalized".
 */
export function finalizeSession(sessionId: string, dest: string): string[] {
  const meta = readSessionMeta(sessionId);
  const selections = readSelections(sessionId);
  const imagesDir = getImagesDir(sessionId);

  mkdirSync(dest, { recursive: true });

  let filesToCopy: string[];
  if (selections) {
    filesToCopy = selections.selections
      .filter((s) => s.status === "keep")
      .map((s) => basename(s.filename));
  } else {
    filesToCopy = meta.jobs.flatMap((j) => j.images.map((img) => basename(img.filename)));
  }

  filesToCopy = Array.from(new Set(filesToCopy));

  const copied: string[] = [];
  for (const filename of filesToCopy) {
    const src = join(imagesDir, filename);
    if (!existsSync(src)) {
      console.error(`Warning: image not found, skipping: ${filename}`);
      continue;
    }

    const destPath = resolveUniqueDestinationPath(dest, filename);
    copyFileSync(src, destPath);
    copied.push(destPath);
  }

  meta.status = "finalized";
  writeSessionMeta(sessionId, meta);

  return copied;
}
