/**
 * Reads page.html, styles.css, and client.js from disk,
 * injects session data, and returns the assembled HTML string.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { SessionMeta, SelectionSet } from "../types.ts";
import { formatCost } from "../cost.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE_HTML = readFileSync(join(HERE, "page.html"), "utf-8");
const STYLES_CSS = readFileSync(join(HERE, "styles.css"), "utf-8");
const CLIENT_JS = readFileSync(join(HERE, "client.js"), "utf-8");

// ── Helpers ──────────────────────────────────────────────────

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface ReviewImage {
  filename: string;
  prompt: string;
  model: string;
  width: number;
  height: number;
  round: number;
  jobIndex: number;
}

function flattenImages(meta: SessionMeta): ReviewImage[] {
  const out: ReviewImage[] = [];
  for (let ji = 0; ji < meta.jobs.length; ji++) {
    const job = meta.jobs[ji];
    for (const img of job.images) {
      out.push({
        filename: img.filename,
        prompt: job.prompt,
        model: job.model,
        width: img.width,
        height: img.height,
        round: job.round,
        jobIndex: ji,
      });
    }
  }
  return out;
}

function buildSelectionsMap(
  selections: SelectionSet | null,
): Record<string, { status: string; newPrompt?: string; numImages?: number }> {
  const map: Record<string, { status: string; newPrompt?: string; numImages?: number }> = {};
  if (selections) {
    for (const s of selections.selections) {
      map[s.filename] = { status: s.status, newPrompt: s.newPrompt, numImages: s.numImages };
    }
  }
  return map;
}

// ── Public API ───────────────────────────────────────────────

export function buildReviewHtml(meta: SessionMeta, selections: SelectionSet | null): string {
  const images = flattenImages(meta);
  const selMap = buildSelectionsMap(selections);

  const js = CLIENT_JS
    .replace("__IMAGES__", JSON.stringify(images))
    .replace("__SELECTIONS__", JSON.stringify(selMap));

  return PAGE_HTML
    .replace(/\{\{SESSION_ID\}\}/g, esc(meta.id))
    .replace("{{IMAGE_COUNT}}", String(images.length))
    .replace("{{JOB_COUNT}}", String(meta.jobs.length))
    .replace("{{TOTAL_COST}}", esc(formatCost(meta.totalCost)))
    .replace("{{CSS}}", STYLES_CSS)
    .replace("{{JS}}", js);
}
