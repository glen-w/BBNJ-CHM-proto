import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import { SCHEMA_SQL } from "./schema";

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "chm.sqlite");

let db: Database.Database | null = null;

function resolveDbPath(): string {
  return process.env.DATABASE_PATH ?? DEFAULT_DB_PATH;
}

export function getDb(): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);

  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
