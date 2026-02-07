/**
 * Review server — Bun HTTP server that serves the review picker
 * and handles selection/close APIs.
 */

import { spawn } from "child_process";
import { basename, join } from "path";
import { buildReviewHtml } from "./template.ts";
import { getImagesDir, readSelections, readSessionMeta, writeSelections, writeSessionMeta } from "../session.ts";
import type { SelectionEntry, SelectionSet } from "../types.ts";

const VALID_SELECTION_STATUSES = new Set(["keep", "reject", "regenerate"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function sanitizeSelection(raw: unknown, idx: number): SelectionEntry {
  if (!isObject(raw)) {
    throw new Error(`Selection ${idx + 1} must be an object`);
  }

  if (typeof raw.filename !== "string" || raw.filename.trim().length === 0) {
    throw new Error(`Selection ${idx + 1}: 'filename' must be a non-empty string`);
  }
  const filename = basename(raw.filename.trim());
  if (filename !== raw.filename.trim()) {
    throw new Error(`Selection ${idx + 1}: 'filename' must not contain path segments`);
  }

  if (typeof raw.status !== "string" || !VALID_SELECTION_STATUSES.has(raw.status)) {
    throw new Error(`Selection ${idx + 1}: 'status' must be keep, reject, or regenerate`);
  }

  const entry: SelectionEntry = {
    filename,
    status: raw.status as SelectionEntry["status"],
  };

  if (entry.status === "regenerate") {
    if (raw.newPrompt !== undefined && typeof raw.newPrompt !== "string") {
      throw new Error(`Selection ${idx + 1}: 'newPrompt' must be a string`);
    }
    if (raw.numImages !== undefined && (!Number.isInteger(raw.numImages) || raw.numImages <= 0 || raw.numImages > 6)) {
      throw new Error(`Selection ${idx + 1}: 'numImages' must be an integer between 1 and 6`);
    }
    entry.newPrompt = typeof raw.newPrompt === "string" ? raw.newPrompt : undefined;
    entry.numImages = typeof raw.numImages === "number" ? raw.numImages : 1;
  }

  return entry;
}

async function parseSelectionsRequest(req: Request): Promise<SelectionEntry[]> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new Error("Invalid JSON payload");
  }

  if (!isObject(body) || !Array.isArray(body.selections)) {
    throw new Error("Payload must be an object with a 'selections' array");
  }

  return body.selections.map((entry, idx) => sanitizeSelection(entry, idx));
}

/** Persist user selections and mark session as reviewed */
function saveSelections(sessionId: string, entries: SelectionEntry[]): void {
  const meta = readSessionMeta(sessionId);
  const maxRound = Math.max(0, ...meta.jobs.map((j) => j.round));
  const selectionSet: SelectionSet = {
    timestamp: new Date().toISOString(),
    round: maxRound,
    selections: entries,
  };

  writeSelections(sessionId, selectionSet);
  meta.status = "reviewed";
  writeSessionMeta(sessionId, meta);
}

/** Open a URL in the default browser (cross-platform) */
function openBrowser(url: string): void {
  if (process.platform === "darwin") {
    spawn("open", [url], { stdio: "ignore", detached: true }).unref();
    return;
  }

  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true }).unref();
    return;
  }

  spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
}

/**
 * Start the review server for a session.
 * Opens the browser automatically.
 */
export async function startReviewServer(sessionId: string): Promise<void> {
  const imagesDir = getImagesDir(sessionId);

  const server = Bun.serve({
    port: 0,
    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url);

      if (url.pathname === "/") {
        const meta = readSessionMeta(sessionId);
        const selections = readSelections(sessionId);
        return new Response(buildReviewHtml(meta, selections), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      if (url.pathname.startsWith("/images/")) {
        const requested = decodeURIComponent(url.pathname.slice("/images/".length));
        const filename = basename(requested);
        if (filename.length === 0 || filename !== requested) {
          return new Response("Invalid filename", { status: 400 });
        }

        const file = Bun.file(join(imagesDir, filename));
        if (await file.exists()) return new Response(file);
        return new Response("Not found", { status: 404 });
      }

      if (url.pathname === "/api/selections" && req.method === "POST") {
        try {
          const selections = await parseSelectionsRequest(req);
          saveSelections(sessionId, selections);
          return Response.json({ ok: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Invalid payload";
          return Response.json({ ok: false, error: message }, { status: 400 });
        }
      }

      if (url.pathname === "/api/close" && req.method === "POST") {
        try {
          const selections = await parseSelectionsRequest(req);
          saveSelections(sessionId, selections);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Invalid payload";
          return Response.json({ ok: false, error: message }, { status: 400 });
        }

        setTimeout(() => {
          server.stop();
          console.log("\nReview server stopped.");
          process.exit(0);
        }, 500);

        return Response.json({ ok: true, message: "Saved. Server shutting down." });
      }

      return new Response("Not found", { status: 404 });
    },
  });

  const url = `http://localhost:${server.port}`;
  console.log(`\nReview server running at ${url}`);
  console.log(`Session: ${sessionId}`);
  console.log("Press Ctrl+C to stop.\n");

  openBrowser(url);

  process.on("SIGINT", () => {
    console.log("\nShutting down review server...");
    server.stop();
    process.exit(0);
  });
}
