/**
 * Review server — Bun HTTP server that serves the review picker
 * and handles selection/close APIs.
 */

import { join } from "path";
import { spawn } from "child_process";
import {
  readSessionMeta, writeSessionMeta, writeSelections,
  getImagesDir, readSelections,
} from "../session.ts";
import type { SelectionEntry, SelectionSet } from "../types.ts";
import { buildReviewHtml } from "./template.ts";

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
  const cmd = process.platform === "darwin" ? "open"
    : process.platform === "win32" ? "start"
    : "xdg-open";
  spawn(cmd, [url], { stdio: "ignore", detached: true }).unref();
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

      // GET / — assembled HTML page (re-reads meta for fresh state)
      if (url.pathname === "/") {
        const meta = readSessionMeta(sessionId);
        const selections = readSelections(sessionId);
        return new Response(buildReviewHtml(meta, selections), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // GET /images/:name — serve generated images
      if (url.pathname.startsWith("/images/")) {
        const filename = decodeURIComponent(url.pathname.slice("/images/".length));
        const file = Bun.file(join(imagesDir, filename));
        if (await file.exists()) return new Response(file);
        return new Response("Not found", { status: 404 });
      }

      // POST /api/selections — save without closing
      if (url.pathname === "/api/selections" && req.method === "POST") {
        const { selections } = await req.json() as { selections: SelectionEntry[] };
        saveSelections(sessionId, selections);
        return Response.json({ ok: true });
      }

      // POST /api/close — save and shut down
      if (url.pathname === "/api/close" && req.method === "POST") {
        const { selections } = await req.json() as { selections: SelectionEntry[] };
        saveSelections(sessionId, selections);
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
  console.log(`Press Ctrl+C to stop.\n`);

  openBrowser(url);

  process.on("SIGINT", () => {
    console.log("\nShutting down review server...");
    server.stop();
    process.exit(0);
  });
}
