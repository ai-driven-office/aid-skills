import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import type { SessionMeta, SelectionSet } from "./types.ts";
import { slugifyPrompt } from "./naming.ts";

const UHD_DIR = ".uhd";
const SESSIONS_DIR = join(UHD_DIR, "sessions");

/** Get the sessions root directory */
export function getSessionsDir(): string {
  return SESSIONS_DIR;
}

/** Generate a session ID: YYYYMMDD-HHMMSS-<slug> */
export function generateSessionId(hint: string): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const slug = slugifyPrompt(hint).slice(0, 30);
  return `${date}-${time}-${slug}`;
}

/** Get the directory path for a session */
export function getSessionDir(sessionId: string): string {
  return join(SESSIONS_DIR, sessionId);
}

/** Get the images directory for a session */
export function getImagesDir(sessionId: string): string {
  return join(getSessionDir(sessionId), "images");
}

/** Create a new session directory and return its ID */
export function createSession(hint: string, command: string): { id: string; dir: string; imagesDir: string } {
  const id = generateSessionId(hint);
  const dir = getSessionDir(id);
  const imagesDir = getImagesDir(id);
  mkdirSync(imagesDir, { recursive: true });

  const meta: SessionMeta = {
    id,
    createdAt: new Date().toISOString(),
    command,
    status: "generated",
    jobs: [],
    totalCost: 0,
  };
  writeSessionMeta(id, meta);

  return { id, dir, imagesDir };
}

/** Read session metadata */
export function readSessionMeta(sessionId: string): SessionMeta {
  const metaPath = join(getSessionDir(sessionId), "meta.json");
  if (!existsSync(metaPath)) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  return JSON.parse(readFileSync(metaPath, "utf-8"));
}

/** Write session metadata */
export function writeSessionMeta(sessionId: string, meta: SessionMeta): void {
  const metaPath = join(getSessionDir(sessionId), "meta.json");
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
}

/** Read selections for a session */
export function readSelections(sessionId: string): SelectionSet | null {
  const selPath = join(getSessionDir(sessionId), "selections.json");
  if (!existsSync(selPath)) return null;
  return JSON.parse(readFileSync(selPath, "utf-8"));
}

/** Write selections for a session */
export function writeSelections(sessionId: string, selections: SelectionSet): void {
  const selPath = join(getSessionDir(sessionId), "selections.json");
  writeFileSync(selPath, JSON.stringify(selections, null, 2) + "\n");
}

/** List all session IDs (sorted newest first) */
export function listSessions(): string[] {
  if (!existsSync(SESSIONS_DIR)) return [];
  return readdirSync(SESSIONS_DIR)
    .filter((name) => !name.startsWith("."))
    .sort()
    .reverse();
}

/** Get the most recent session ID */
export function getLatestSession(): string | null {
  const sessions = listSessions();
  return sessions.length > 0 ? sessions[0] : null;
}

/** Delete a session */
export function deleteSession(sessionId: string): void {
  const dir = getSessionDir(sessionId);
  if (!existsSync(dir)) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  rmSync(dir, { recursive: true, force: true });
}

/** Delete all sessions */
export function deleteAllSessions(): void {
  if (existsSync(SESSIONS_DIR)) {
    rmSync(SESSIONS_DIR, { recursive: true, force: true });
  }
}

/** Resolve a session ID — use provided, or fall back to latest */
export function resolveSessionId(sessionId?: string): string {
  if (sessionId) {
    // Allow partial match
    const sessions = listSessions();
    const match = sessions.find((s) => s === sessionId || s.startsWith(sessionId));
    if (!match) throw new Error(`Session not found: ${sessionId}`);
    return match;
  }
  const latest = getLatestSession();
  if (!latest) throw new Error("No sessions found. Run 'generate' first.");
  return latest;
}
