import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema";

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "chm.sqlite");

let db: Database.Database | null = null;

export function resolveDbPath(): string {
  return process.env.DATABASE_PATH ?? DEFAULT_DB_PATH;
}

export class SchemaVersionError extends Error {
  constructor(found: string | undefined, expected: number) {
    super(
      `Database schema version ${found ?? "(none)"} does not match code version ${expected}. ` +
        `Run \`npm run db:reset\` (development/tests only) to recreate the database.`,
    );
    this.name = "SchemaVersionError";
  }
}

/**
 * Open (or create) the database. Fresh files get the schema and version stamp.
 * Existing files must carry the exact SCHEMA_VERSION; otherwise start is refused.
 * CREATE TABLE IF NOT EXISTS alone is not trusted to detect an obsolete schema.
 */
export function openDatabase(dbPath: string): Database.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const conn = new Database(dbPath);
  conn.pragma("journal_mode = WAL");
  conn.pragma("foreign_keys = ON");

  const hadTables =
    (conn.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'users'").get() as { n: number })
      .n > 0;

  if (!hadTables) {
    conn.exec(SCHEMA_SQL);
    conn
      .prepare("INSERT INTO meta(key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(String(SCHEMA_VERSION));
    return conn;
  }

  const hasMeta =
    (conn.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'meta'").get() as { n: number })
      .n > 0;
  const found = hasMeta
    ? (conn.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get() as { value: string } | undefined)?.value
    : undefined;
  if (found !== String(SCHEMA_VERSION)) {
    conn.close();
    throw new SchemaVersionError(found, SCHEMA_VERSION);
  }
  return conn;
}

export function getDb(): Database.Database {
  if (db) return db;
  db = openDatabase(resolveDbPath());
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/** Test/script helper: swap the singleton for a specific file (e.g. a temp DB). */
export function useDatabaseFile(dbPath: string): Database.Database {
  closeDb();
  process.env.DATABASE_PATH = dbPath;
  return getDb();
}

export type Db = Database.Database;
