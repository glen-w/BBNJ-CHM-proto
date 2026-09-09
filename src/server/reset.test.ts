import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { closeDb, getDb } from "@/lib/db";
import { DomainError, isDomainError } from "@/server/errors";
import { assertResetAllowed, deleteDatabaseFiles, resetSandbox, sandboxResetEnabled } from "@/server/reset";
import { createHarness, expectDomainCode } from "@/test/helpers";

describe("DomainError", () => {
  it("is identifiable and carries a code", () => {
    const err = new DomainError("forbidden", "nope", { path: "/mgr" });
    expect(isDomainError(err)).toBe(true);
    expect(isDomainError(new Error("nope"))).toBe(false);
    expect(err.code).toBe("forbidden");
    expect(err.details).toEqual({ path: "/mgr" });
  });
});

describe("assertResetAllowed", () => {
  it("blocks production resets unless --force is passed", () => {
    expect(() => assertResetAllowed({ nodeEnv: "production", force: false })).toThrow(/db:reset is refused/);
    expect(() => assertResetAllowed({ nodeEnv: "production", force: true })).not.toThrow();
    expect(() => assertResetAllowed({ nodeEnv: "development", force: false })).not.toThrow();
  });
});

describe("sandboxResetEnabled", () => {
  it("only allows sandbox reset when SANDBOX_RESET=1 and NODE_ENV != production", () => {
    expect(sandboxResetEnabled({ SANDBOX_RESET: "1", NODE_ENV: "development" })).toBe(true);
    expect(sandboxResetEnabled({ SANDBOX_RESET: "1", NODE_ENV: "production" })).toBe(false);
    expect(sandboxResetEnabled({ SANDBOX_RESET: "0", NODE_ENV: "development" })).toBe(false);
    expect(sandboxResetEnabled({})).toBe(false);
  });
});

describe("resetSandbox", () => {
  it("requires Secretariat role and sandboxResetEnabled", () => {
    const h = createHarness();
    try {
      expectDomainCode(() => resetSandbox(h.party(), { SANDBOX_RESET: "1", NODE_ENV: "development" }), "forbidden");
      expectDomainCode(() => resetSandbox(h.pub(), { SANDBOX_RESET: "1", NODE_ENV: "development" }), "forbidden");
      expectDomainCode(() => resetSandbox(h.secretariat(), { SANDBOX_RESET: "0", NODE_ENV: "development" }), "forbidden");
    } finally {
      h.cleanup();
    }
  });

  it("recreates and re-seeds database when authorized and enabled", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chm-sandbox-"));
    const dbPath = path.join(dir, "sandbox.sqlite");
    const oldDbPath = process.env.DATABASE_PATH;
    process.env.DATABASE_PATH = dbPath;
    const h = createHarness();
    try {
      const res = resetSandbox(h.secretariat(), { SANDBOX_RESET: "1", NODE_ENV: "development" });
      expect(res.dbPath).toBe(dbPath);
      const db = getDb();
      const usersCount = (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
      expect(usersCount).toBeGreaterThanOrEqual(4);
    } finally {
      closeDb();
      h.cleanup();
      fs.rmSync(dir, { recursive: true, force: true });
      if (oldDbPath === undefined) delete process.env.DATABASE_PATH;
      else process.env.DATABASE_PATH = oldDbPath;
    }
  });
});

describe("deleteDatabaseFiles", () => {
  it("removes the sqlite file plus WAL/SHM sidecars", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chm-reset-"));
    const dbPath = path.join(dir, "chm.sqlite");
    fs.writeFileSync(dbPath, "x");
    fs.writeFileSync(dbPath + "-wal", "x");
    fs.writeFileSync(dbPath + "-shm", "x");
    const removed = deleteDatabaseFiles(dbPath);
    expect(removed).toHaveLength(3);
    expect(fs.existsSync(dbPath)).toBe(false);
    expect(deleteDatabaseFiles(dbPath)).toEqual([]);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
