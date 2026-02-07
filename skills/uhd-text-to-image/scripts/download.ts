import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import type { DownloadedImage } from "./types.ts";

/**
 * Download an image from a URL to the local filesystem.
 */
export async function downloadImage(
  url: string,
  filename: string,
  outDir: string,
): Promise<DownloadedImage> {
  mkdirSync(outDir, { recursive: true });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const localPath = join(outDir, filename);
  writeFileSync(localPath, Buffer.from(buffer));

  const contentType = response.headers.get("content-type") || "image/png";

  // Try to extract dimensions from content-type or default to 0
  // The API response typically includes width/height in the result data
  return {
    url,
    localPath,
    width: 0,
    height: 0,
    contentType,
  };
}

/**
 * Download multiple images, returning results with dimensions filled in
 * from the API response data.
 */
export async function downloadImages(
  images: Array<{ url: string; width?: number; height?: number; content_type?: string }>,
  filenames: string[],
  outDir: string,
): Promise<DownloadedImage[]> {
  const results: DownloadedImage[] = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const filename = filenames[i];
    const downloaded = await downloadImage(img.url, filename, outDir);
    // Override with API-provided dimensions
    downloaded.width = img.width || 0;
    downloaded.height = img.height || 0;
    if (img.content_type) downloaded.contentType = img.content_type;
    results.push(downloaded);
  }

  return results;
}
