import { afterEach, describe, expect, it } from "vitest";

import { SEED_USERS } from "@/server/seed";
import { findUserById, findUserByUsername, listUsers, upsertUser, usersWithRole } from "@/server/users";
import { createHarness, type Harness } from "@/test/helpers";

describe("users I/O", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("round-trips a seeded user and lists by username", () => {
    h = createHarness();
    const u = findUserByUsername(h.db, "party.nfp");
    expect(u?.displayName).toMatch(/SIDS/);
    expect(u?.partyCode).toBe("XSD");
    expect(u?.roles).toEqual(["party"]);
    expect(findUserById(h.db, u!.id)?.username).toBe("party.nfp");
    expect(findUserByUsername(h.db, "missing")).toBeUndefined();
    expect(listUsers(h.db).map((x) => x.username)).toEqual(
      expect.arrayContaining(["party.nfp", "party.other", "public", "secretariat", "stb"]),
    );
  });

  it("upserts in place and excludes inactive users from role queries", () => {
    h = createHarness();
    const party = SEED_USERS[0];
    upsertUser(h.db, { ...party, displayName: "Renamed NFP", active: false });
    expect(findUserById(h.db, party.id)?.displayName).toBe("Renamed NFP");
    expect(usersWithRole(h.db, "party").map((u) => u.id)).not.toContain(party.id);
    expect(usersWithRole(h.db, "secretariat")).toHaveLength(1);
  });
});
