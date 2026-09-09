import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { SchemaVersionError, closeDb, getDb, openDatabase, resolveDbPath, useDatabaseFile } from "@/lib/db";
import { SCHEMA_VERSION } from "@/lib/db/schema";

function tmpFile(name: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chm-db-"));
  return { dir, dbPath: path.join(dir, name) };
}

describe("openDatabase", () => {
  it("creates schema and stamps SCHEMA_VERSION on a fresh file", () => {
    const { dir, dbPath } = tmpFile("fresh.sqlite");
    const db = openDatabase(dbPath);
    const ver = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get() as { value: string };
    expect(ver.value).toBe(String(SCHEMA_VERSION));
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[];
    expect(tables.map((t) => t.name)).toEqual(
      expect.arrayContaining(["users", "events", "mgr_batches", "eia_activities", "cbtmt_records", "access_refusals"]),
    );
    const fk = db.pragma("foreign_keys", { simple: true });
    expect(fk).toBe(1);
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("refuses to open a file whose schema_version does not match code", () => {
    const { dir, dbPath } = tmpFile("stale.sqlite");
    const db = openDatabase(dbPath);
    db.prepare("UPDATE meta SET value = ? WHERE key = 'schema_version'").run(String(SCHEMA_VERSION + 100));
    db.close();
    expect(() => openDatabase(dbPath)).toThrow(SchemaVersionError);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("getDb / useDatabaseFile", () => {
  const previous = process.env.DATABASE_PATH;
  afterEach(() => {
    closeDb();
    if (previous === undefined) delete process.env.DATABASE_PATH;
    else process.env.DATABASE_PATH = previous;
  });

  it("defaults to data/chm.sqlite and reuses the singleton", () => {
    delete process.env.DATABASE_PATH;
    expect(resolveDbPath()).toMatch(/data\/chm\.sqlite$/);
    const { dir, dbPath } = tmpFile("singleton.sqlite");
    const a = useDatabaseFile(dbPath);
    const b = getDb();
    expect(a).toBe(b);
    a.prepare("INSERT INTO meta(key, value) VALUES ('ping', '1')").run();
    expect((getDb().prepare("SELECT value FROM meta WHERE key = 'ping'").get() as { value: string }).value).toBe("1");
    closeDb();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
