/**
 * Review server — Bun HTTP server that serves the review picker
 * and handles selection/close APIs.
 *
 * Supports both single-session and multi-session modes.
 */

import { spawn } from "child_process";
import { basename, join } from "path";
import { buildReviewHtml } from "./template.ts";
import { finalizeSession } from "../finalize.ts";
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
    if (raw.numImages !== undefined) {
      if (!Number.isInteger(raw.numImages) || (raw.numImages as number) <= 0 || (raw.numImages as number) > 6) {
        throw new Error(`Selection ${idx + 1}: 'numImages' must be an integer between 1 and 6`);
      }
    }
    entry.newPrompt = typeof raw.newPrompt === "string" ? raw.newPrompt : undefined;
    entry.numImages = typeof raw.numImages === "number" ? raw.numImages : 1;
  }

  return entry;
}

function parseSelectionsBody(body: unknown): { sessionId: string; entries: SelectionEntry[] } {
  if (!isObject(body)) {
    throw new Error("Payload must be an object");
  }

  if (typeof body.sessionId !== "string" || body.sessionId.trim().length === 0) {
    throw new Error("'sessionId' must be a non-empty string");
  }

  if (!Array.isArray(body.selections)) {
    throw new Error("Payload must contain a 'selections' array");
  }

  const entries = (body.selections as unknown[]).map((entry, idx) => sanitizeSelection(entry, idx));
  return { sessionId: body.sessionId.trim(), entries };
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

/** Match /sessions/:sessionId/images/:filename */
function matchSessionImageRoute(pathname: string): { sessionId: string; filename: string } | null {
  const prefix = "/sessions/";
  if (!pathname.startsWith(prefix)) return null;

  const rest = pathname.slice(prefix.length);
  const imagesIdx = rest.indexOf("/images/");
  if (imagesIdx === -1) return null;

  const sessionId = decodeURIComponent(rest.slice(0, imagesIdx));
  const filename = decodeURIComponent(rest.slice(imagesIdx + "/images/".length));

  if (sessionId.length === 0 || filename.length === 0) return null;
  if (basename(filename) !== filename) return null;

  return { sessionId, filename };
}

/**
 * Start the review server.
 * - sessionIds: array of session IDs to review
 * - mode: "single" or "multi"
 */
export async function startReviewServer(
  sessionIds: string[],
  mode: "single" | "multi",
): Promise<void> {
  // Validate all sessions exist upfront
  const validSessionIds = new Set(sessionIds);

  const server = Bun.serve({
    port: 0,
    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url);

      // ── GET / — serve HTML ──────────────────────────────
      if (url.pathname === "/") {
        const sessionsData = sessionIds.map((id) => ({
          meta: readSessionMeta(id),
          selections: readSelections(id),
        }));
        return new Response(buildReviewHtml(sessionsData, mode), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // ── GET /sessions/:id/images/:file ──────────────────
      const imageMatch = matchSessionImageRoute(url.pathname);
      if (imageMatch) {
        if (!validSessionIds.has(imageMatch.sessionId)) {
          return new Response("Session not found", { status: 404 });
        }
        const imagesDir = getImagesDir(imageMatch.sessionId);
        const file = Bun.file(join(imagesDir, imageMatch.filename));
        if (await file.exists()) return new Response(file);
        return new Response("Not found", { status: 404 });
      }

      // ── POST /api/selections — save per-session ─────────
      if (url.pathname === "/api/selections" && req.method === "POST") {
        try {
          const body = await req.json();
          const { sessionId, entries } = parseSelectionsBody(body);
          if (!validSessionIds.has(sessionId)) {
            return Response.json({ ok: false, error: "Session not in review set" }, { status: 400 });
          }
          saveSelections(sessionId, entries);
          return Response.json({ ok: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Invalid payload";
          return Response.json({ ok: false, error: message }, { status: 400 });
        }
      }

      // ── POST /api/done — shut down server ───────────────
      if (url.pathname === "/api/done" && req.method === "POST") {
        setTimeout(() => {
          server.stop();
          console.log("\nReview server stopped.");
          process.exit(0);
        }, 500);

        return Response.json({ ok: true, message: "Server shutting down." });
      }

      // ── POST /api/finalize — finalize a session ─────────
      if (url.pathname === "/api/finalize" && req.method === "POST") {
        try {
          const body: unknown = await req.json();
          if (!isObject(body) || typeof body.sessionId !== "string") {
            return Response.json({ ok: false, error: "'sessionId' is required" }, { status: 400 });
          }
          const sessionId = body.sessionId.trim();
          if (!validSessionIds.has(sessionId)) {
            return Response.json({ ok: false, error: "Session not in review set" }, { status: 400 });
          }
          const dest = typeof body.dest === "string" ? body.dest : ".";
          const copied = finalizeSession(sessionId, dest);
          return Response.json({ ok: true, copied: copied.length, files: copied });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Finalize failed";
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      }

      return new Response("Not found", { status: 404 });
    },
  });

  const url = `http://localhost:${server.port}`;
  console.log(`\nReview server running at ${url}`);
  if (mode === "single") {
    console.log(`Session: ${sessionIds[0]}`);
  } else {
    console.log(`Sessions: ${sessionIds.length}`);
  }
  console.log("Press Ctrl+C to stop.\n");

  openBrowser(url);

  process.on("SIGINT", () => {
    console.log("\nShutting down review server...");
    server.stop();
    process.exit(0);
  });
}
