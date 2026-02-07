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
  sessionId: string;
  filename: string;
  prompt: string;
  model: string;
  width: number;
  height: number;
  round: number;
  jobIndex: number;
}

interface SessionData {
  id: string;
  createdAt: string;
  command: string;
  status: string;
  totalCost: number;
  images: ReviewImage[];
  selections: Record<string, { status: string; newPrompt?: string; numImages?: number }>;
}

function flattenImages(meta: SessionMeta): ReviewImage[] {
  const out: ReviewImage[] = [];
  for (let ji = 0; ji < meta.jobs.length; ji++) {
    const job = meta.jobs[ji];
    for (const img of job.images) {
      out.push({
        sessionId: meta.id,
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

function buildSessionData(meta: SessionMeta, selections: SelectionSet | null): SessionData {
  return {
    id: meta.id,
    createdAt: meta.createdAt,
    command: meta.command,
    status: meta.status,
    totalCost: meta.totalCost,
    images: flattenImages(meta),
    selections: buildSelectionsMap(selections),
  };
}

// ── Public API ───────────────────────────────────────────────

export function buildReviewHtml(
  sessions: Array<{ meta: SessionMeta; selections: SelectionSet | null }>,
  mode: "single" | "multi",
): string {
  const sessionsData = sessions.map(({ meta, selections }) =>
    buildSessionData(meta, selections),
  );

  const totalImages = sessionsData.reduce((sum, s) => sum + s.images.length, 0);
  const totalCost = sessionsData.reduce((sum, s) => sum + s.totalCost, 0);

  const sessionsJson = JSON.stringify(sessionsData);
  const modeJson = JSON.stringify(mode);

  const js = CLIENT_JS
    .replaceAll("__SESSIONS_DATA__", () => sessionsJson)
    .replaceAll("__MODE__", () => modeJson);

  const title = mode === "single"
    ? `UHD Review — ${esc(sessionsData[0].id)}`
    : `UHD Review — ${sessionsData.length} sessions`;

  const headerTitle = mode === "single"
    ? `UHD Review <span>/ ${esc(sessionsData[0].id)}</span>`
    : `UHD Review`;

  const headerStats = mode === "single"
    ? `<span><b>${totalImages}</b> images</span>
       <span><b>${sessionsData[0].images.length > 0 ? sessions[0].meta.jobs.length : 0}</b> jobs</span>
       <span>Cost: <b>${esc(formatCost(totalCost))}</b></span>`
    : `<span><b>${sessionsData.length}</b> sessions</span>
       <span><b>${totalImages}</b> images</span>
       <span>Cost: <b>${esc(formatCost(totalCost))}</b></span>`;

  return PAGE_HTML
    .replace("{{TITLE}}", () => title)
    .replace("{{HEADER_TITLE}}", () => headerTitle)
    .replace("{{HEADER_STATS}}", () => headerStats)
    .replace("{{CSS}}", () => STYLES_CSS)
    .replace("{{JS}}", () => js);
}
