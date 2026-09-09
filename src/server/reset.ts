/**
 * Destructive reset — development and tests only. Never part of startup.
 */
import fs from "node:fs";

export function assertResetAllowed(opts: { nodeEnv: string | undefined; force: boolean }): void {
  if (opts.nodeEnv === "production" && !opts.force) {
    throw new Error("db:reset is refused when NODE_ENV=production. Pass --force only if you really mean it.");
  }
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
