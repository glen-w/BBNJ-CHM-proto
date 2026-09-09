/**
 * Isolated SQLite harness for Vitest. Each call opens a fresh file under
 * os.tmpdir() so tests never touch data/chm.sqlite or the app singleton.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { User } from "@/lib/contracts/events";
import { openDatabase, type Db } from "@/lib/db";
import { DomainError } from "@/server/errors";
import { anonymous, principalFor, type Principal } from "@/server/policy";
import { SEED_USERS } from "@/server/seed";
import { upsertUser } from "@/server/users";

export const OTHER_PARTY: User = {
  id: "00000000-0000-4000-8000-000000000099",
  username: "party.other",
  displayName: "Other Party NFP",
  roles: ["party"],
  partyCode: "ZZZ",
  active: true,
};

export const VALID_MGR: Record<string, unknown> = {
  title: "Test cruise ALPHA",
  locationHint: "CCZ",
  objectives: "Baseline sampling for the unit suite.",
};

export function expectDomainCode(fn: () => unknown, code: DomainError["code"]): DomainError {
  try {
    fn();
  } catch (err) {
    if (!(err instanceof DomainError)) throw err;
    if (err.code !== code) {
      throw new Error(`expected DomainError(${code}), got DomainError(${err.code}): ${err.message}`);
    }
    return err;
  }
  throw new Error(`expected DomainError(${code}), but the call succeeded`);
}

export async function expectDomainCodeAsync(fn: () => Promise<unknown>, code: DomainError["code"]): Promise<DomainError> {
  try {
    await fn();
  } catch (err) {
    if (!(err instanceof DomainError)) throw err;
    if (err.code !== code) {
      throw new Error(`expected DomainError(${code}), got DomainError(${err.code}): ${err.message}`);
    }
    return err;
  }
  throw new Error(`expected DomainError(${code}), but the call succeeded`);
}

export function createHarness(): {
  db: Db;
  dir: string;
  dbPath: string;
  party: () => Principal;
  secretariat: () => Principal;
  pub: () => Principal;
  stb: () => Principal;
  nonstate: () => Principal;
  otherParty: () => Principal;
  anon: () => Principal;
  key: () => string;
  cleanup: () => void;
} {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chm-vitest-"));
  const dbPath = path.join(dir, "t.sqlite");
  const db = openDatabase(dbPath);
  for (const u of SEED_USERS) upsertUser(db, u);
  upsertUser(db, OTHER_PARTY);

  const byName = (username: string): Principal => {
    const u = username === OTHER_PARTY.username ? OTHER_PARTY : SEED_USERS.find((x) => x.username === username);
    if (!u) throw new Error(`unknown seed user ${username}`);
    return principalFor(u);
  };

  return {
    db,
    dir,
    dbPath,
    party: () => byName("party.nfp"),
    secretariat: () => byName("secretariat"),
    pub: () => byName("public"),
    stb: () => byName("stb"),
    nonstate: () => byName("nonstate.uploader"),
    otherParty: () => byName(OTHER_PARTY.username),
    anon: () => anonymous(),
    key: () => crypto.randomUUID(),
    cleanup() {
      db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

export type Harness = ReturnType<typeof createHarness>;
