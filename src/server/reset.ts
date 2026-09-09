/**
 * Destructive reset — development and tests only. Never part of startup.
 */
import fs from "node:fs";

import { closeDb, getDb, resolveDbPath } from "@/lib/db";
import { DomainError } from "./errors";
import { requireCan, type Principal } from "./policy";
import { seedDatabase } from "./seed";

export function assertResetAllowed(opts: { nodeEnv: string | undefined; force: boolean }): void {
  if (opts.nodeEnv === "production" && !opts.force) {
    throw new Error("db:reset is refused when NODE_ENV=production. Pass --force only if you really mean it.");
  }
}

/**
 * UI reset is opt-in: SANDBOX_RESET=1 outside production, or SANDBOX_RESET=force
 * anywhere (a hosted webinar sandbox runs `next start` in production mode on
 * purpose). Checked at render and again in the action.
 */
type Env = Record<string, string | undefined>;

export function sandboxResetEnabled(env: Env = process.env): boolean {
  if (env.SANDBOX_RESET === "force") return true;
  return env.SANDBOX_RESET === "1" && env.NODE_ENV !== "production";
}

/**
 * In-process reset for the sandbox button: close the singleton, delete the
 * files, reopen (schema recreated), seed. Secretariat only; refused unless
 * sandboxResetEnabled(). Every other request sees the fresh database on its
 * next getDb() call.
 */
export function resetSandbox(actor: Principal, env: Env = process.env): { dbPath: string; removed: string[] } {
  requireCan(actor, "reset_sandbox", undefined, { path: "/audit" });
  if (!sandboxResetEnabled(env)) throw new DomainError("forbidden", "Sandbox reset is disabled — set SANDBOX_RESET=1 (or =force for a hosted sandbox)");
  const dbPath = resolveDbPath();
  closeDb();
  const removed = deleteDatabaseFiles(dbPath);
  seedDatabase(getDb());
  return { dbPath, removed };
}

export function deleteDatabaseFiles(dbPath: string): string[] {
  const removed: string[] = [];
  for (const suffix of ["", "-wal", "-shm"]) {
    const f = dbPath + suffix;
    if (fs.existsSync(f)) {
      fs.rmSync(f);
      removed.push(f);
    }
  }
  return removed;
}
