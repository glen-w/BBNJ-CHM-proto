import { afterEach, describe, expect, it } from "vitest";

import type { User } from "@/lib/contracts/events";
import { DomainError } from "@/server/errors";
import {
  ALL_ACTIONS,
  actorRoleOf,
  anonymous,
  can,
  hasRole,
  isSecretariat,
  listRefusals,
  principalFor,
  principalFromCookie,
  readPolicy,
  recordRefusal,
  recordVisibilityClause,
  requireCan,
  visibilityClause,
  whoCanSee,
} from "@/server/policy";
import { SEED_USERS } from "@/server/seed";
import { OTHER_PARTY, createHarness, expectDomainCode, type Harness } from "@/test/helpers";

const partyUser = SEED_USERS[0];
const secretariatUser = SEED_USERS[1];
const publicUser = SEED_USERS[2];
const stbUser = SEED_USERS[3];

describe("principals", () => {
  it("treats inactive users as anonymous", () => {
    const inactive: User = { ...partyUser, active: false };
    expect(principalFor(inactive)).toEqual({ kind: "anonymous" });
    expect(actorRoleOf(anonymous())).toBe("public");
    expect(actorRoleOf(principalFor(stbUser))).toBe("stb");
    expect(isSecretariat(principalFor(secretariatUser))).toBe(true);
    expect(hasRole(principalFor(partyUser), "party")).toBe(true);
  });
});

describe("can()", () => {
  it("refuses every action for anonymous", () => {
    for (const action of ALL_ACTIONS) {
      expect(can(anonymous(), action)).toBe(false);
    }
  });

  it("enforces ownership on submit/amend for Party users", () => {
    const party = principalFor(partyUser);
    expect(can(party, "submit")).toBe(true);
    expect(can(party, "submit", { ownerUserId: partyUser.id })).toBe(true);
    expect(can(party, "submit", { ownerUserId: OTHER_PARTY.id })).toBe(false);
    expect(can(party, "publish")).toBe(false);
    expect(can(principalFor(secretariatUser), "submit", { ownerUserId: OTHER_PARTY.id })).toBe(true);
  });

  it("gates publish/import/STB by role", () => {
    expect(can(principalFor(secretariatUser), "publish")).toBe(true);
    expect(can(principalFor(secretariatUser), "import")).toBe(true);
    expect(can(principalFor(stbUser), "comment_stb")).toBe(true);
    expect(can(principalFor(publicUser), "comment_stb")).toBe(false);
    expect(can(principalFor(partyUser), "suggest_match")).toBe(false);
    expect(can(principalFor(publicUser), "manage_subscription")).toBe(true);
  });
});

describe("readPolicy / visibility SQL", () => {
  it("gives secretariat all statuses and tiers", () => {
    const pol = readPolicy(principalFor(secretariatUser));
    expect(pol.all).toBe(true);
    expect(visibilityClause(pol, { status: "e.status", tier: "e.confidentiality", owner: "r.owner_user_id" })).toEqual({
      sql: "1 = 1",
      params: [],
    });
  });

  it("limits public to published + public tier", () => {
    const pol = readPolicy(principalFor(publicUser));
    expect(pol.statuses).toEqual(["published"]);
    expect(pol.tiers).toEqual(["public"]);
    expect(pol.ownerUserId).toBeUndefined();
  });

  it("lets a Party see own drafts via the owner OR in the clause", () => {
    const pol = readPolicy(principalFor(partyUser));
    expect(pol.ownerUserId).toBe(partyUser.id);
    const clause = recordVisibilityClause(pol, { id: "b.id", tier: "b.confidentiality", owner: "b.owner_user_id" });
    expect(clause.sql).toContain("b.owner_user_id = ?");
    expect(clause.params).toEqual(expect.arrayContaining(["published", partyUser.id, "public", partyUser.id]));
  });

  it("lets STB see restricted published rows but not confidential", () => {
    const pol = readPolicy(principalFor(stbUser));
    expect(pol.tiers).toEqual(["public", "restricted"]);
    expect(pol.statuses).toEqual(["published"]);
  });

  it("explains each confidentiality tier in plain language", () => {
    expect(whoCanSee("public")).toMatch(/anonymous/i);
    expect(whoCanSee("restricted")).toMatch(/Never in public/i);
    expect(whoCanSee("confidential")).toMatch(/STB and public never/i);
  });
});

describe("cookie + refusal log I/O", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("maps missing, malformed, unknown and inactive cookies to anonymous", () => {
    h = createHarness();
    for (const raw of [undefined, "", "not-a-uuid", crypto.randomUUID()]) {
      expect(principalFromCookie(h.db, raw).kind).toBe("anonymous");
    }
    h.db.prepare("UPDATE users SET active = 0 WHERE username = 'party.nfp'").run();
    expect(principalFromCookie(h.db, partyUser.id).kind).toBe("anonymous");
    h.db.prepare("UPDATE users SET active = 1 WHERE username = 'party.nfp'").run();
    expect(principalFromCookie(h.db, partyUser.id).kind).toBe("user");
  });

  it("requireCan records a refusal then throws; only Secretariat can list the log", () => {
    h = createHarness();
    const party = principalFor(partyUser);
    try {
      requireCan(party, "publish", undefined, { db: h.db, path: "/mgr", domain: "mgr" });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect((err as DomainError).code).toBe("forbidden");
    }
    expect(listRefusals(h.db, party)).toEqual([]);
    const rows = listRefusals(h.db, principalFor(secretariatUser));
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe("publish");
    expect(rows[0].path).toBe("/mgr");
    expect(rows[0].actorUserId).toBe(partyUser.id);
  });

  it("swallows insert failures when recording a refusal (no throw into the caller)", () => {
    h = createHarness();
    h.db.exec("DROP TABLE access_refusals");
    const result = recordRefusal(anonymous(), "publish", { db: h.db });
    expect(result).toBeUndefined();
  });

  it("uses a distinct reason when a Party tries to mutate someone else's record", () => {
    h = createHarness();
    const err = expectDomainCode(
      () => requireCan(principalFor(partyUser), "submit", { ownerUserId: OTHER_PARTY.id }, { db: h.db }),
      "forbidden",
    );
    expect(err.message).toMatch(/owned by another Party/);
  });
});
