/**
 * Seeds — through the domain functions with fixed idempotency keys, never raw
 * inserts. Re-running on a seeded database writes nothing.
 *
 * Users are "three logins + STB reviewer". Party code XSD sits in the ISO
 * user-assigned range: a demo SIDS Party, no real State implied.
 */
import type { Db } from "@/lib/db";
import type { Subscription, User } from "@/lib/contracts/events";
import { createCbtmtRecord, suggestMatch } from "./cbtmt";
import { addEiaPack, createEiaActivity } from "./eia";
import { addMgrPack, receivePreCollection, saveMgrDraft } from "./mgr";
import { publishPack } from "./packs";
import { principalFor } from "./policy";
import { upsertSubscription } from "./queries";
import { findUserByUsername, upsertUser } from "./users";

export const SEED_USERS: User[] = [
  { id: "00000000-0000-4000-8000-000000000001", username: "party.nfp", displayName: "Demo Party (SIDS) — NFP submitter", roles: ["party"], partyCode: "XSD", active: true },
  { id: "00000000-0000-4000-8000-000000000002", username: "secretariat", displayName: "Secretariat / authorised publishing role (demo)", roles: ["secretariat"], active: true },
  { id: "00000000-0000-4000-8000-000000000003", username: "public", displayName: "Public (view-only)", roles: ["public"], active: true },
  { id: "00000000-0000-4000-8000-000000000004", username: "stb", displayName: "Scientific and Technical Body reviewer (demo)", roles: ["stb"], active: true },
];

export const CBTMT_THEMES = ["taxonomy", "genomics", "eia_practice"] as const;

export interface SeedIds {
  users: Record<string, string>;
  mgr: { published: string; draft: string; imported: string; restricted: string };
  eia: { noEia: string; full: string; coexist: string };
  cbtmt: { need: string; offer: string; matchId?: string };
}

const K = (s: string) => `seed:${s}`;

export function seedDatabase(db: Db): SeedIds {
  for (const u of SEED_USERS) upsertUser(db, u);
  const by = (username: string) => principalFor(findUserByUsername(db, username)!);
  const party = by("party.nfp");
  const secretariat = by("secretariat");

  const subs: Subscription[] = [
    { id: "00000000-0000-4000-8000-00000000a001", userId: SEED_USERS[0].id, themes: [], abnjBoxes: [], domains: ["mgr", "cbtmt"], digest: "daily" },
    { id: "00000000-0000-4000-8000-00000000a003", userId: SEED_USERS[2].id, themes: [], abnjBoxes: ["CCZ"], domains: ["eia"], digest: "immediate" },
    { id: "00000000-0000-4000-8000-00000000a004", userId: SEED_USERS[3].id, themes: [], abnjBoxes: [], domains: ["eia"], digest: "daily" },
  ];
  for (const s of subs) upsertSubscription(db, s);

  // ---- MGR
  const a = receivePreCollection(
    db,
    party,
    {
      title: "Deep-sea sampling cruise DEMO-01",
      locationHint: "Clarion-Clipperton South",
      objectives: "Baseline microbial and meiofaunal diversity of abyssal sediments; reference collection for taxonomy training.",
      methodMeans: "RV Demo Explorer (2,400 t, research vessel, ice class none); box corer, ROV push cores, CTD rosette.",
      expectedDates: "2026-11-03 to 2026-12-01",
      sponsoringInstitution: "Demo Institute of Marine Science — Dr A. Example",
      participationOpportunities: "Two berths and remote data access for scientists from developing States.",
      dataManagementPlan: "https://example.org/dmp/demo-01",
      tkFpicFlag: false,
      confidentiality: "public",
    },
    "form",
    K("mgr-a"),
    { at: "2026-09-01T09:00:00.000Z" },
  );
  publishPack(db, secretariat, { domain: "mgr", recordId: a.batch.id, stage: "pre_collection", at: "2026-09-01T10:00:00.000Z" });
  addMgrPack(db, party, a.batch.id, "post_collection", "Post-collection notification: 412 samples, 38 taxa; repository deposit pending", K("mgr-a-post"));

  const b = saveMgrDraft(db, party, { title: "Seamount sponge survey DEMO-02 (draft)", locationHint: "Reykjanes Ridge" }, K("mgr-b"));

  const c = receivePreCollection(
    db,
    secretariat,
    { title: "Offline-submitted cruise DEMO-03", locationHint: "CCZ", objectives: "Imported from the offline Excel template by the Secretariat." },
    "excel",
    K("mgr-c"),
    { partyCode: "XSD", at: "2026-09-02T08:00:00.000Z" },
  );

  const d = receivePreCollection(
    db,
    party,
    { title: "Restricted cruise DEMO-04", locationHint: "CCZ", confidentiality: "restricted", objectives: "Restricted tier — visible to Secretariat, owner and STB only." },
    "form",
    K("mgr-d"),
    { at: "2026-09-02T09:00:00.000Z" },
  );
  publishPack(db, secretariat, { domain: "mgr", recordId: d.batch.id, stage: "pre_collection", at: "2026-09-02T10:00:00.000Z" });

  // ---- EIA
  const e1 = createEiaActivity(db, party, { title: "Acoustic survey, Reykjanes Ridge", abnjBox: "Reykjanes Ridge" }, K("eia-1"));
  addEiaPack(db, party, e1.activity.id, "screening", "Screening: below threshold, no EIA required (Art 31)", K("eia-1-screening"), { screeningOutcome: "no_eia" });
  publishPack(db, secretariat, { domain: "eia", recordId: e1.activity.id, stage: "screening", at: "2026-08-20T10:00:00.000Z" });

  const e2 = createEiaActivity(db, party, { title: "Sediment sampling, CCZ", abnjBox: "CCZ" }, K("eia-2"));
  addEiaPack(db, party, e2.activity.id, "screening", "Screening: EIA required (Art 31)", K("eia-2-screening"), { screeningOutcome: "eia_required" });
  publishPack(db, secretariat, { domain: "eia", recordId: e2.activity.id, stage: "screening", at: "2026-08-22T10:00:00.000Z" });
  addEiaPack(db, party, e2.activity.id, "planned_activity_notice", "Public notification of planned activity (Art 32)", K("eia-2-notice"));
  publishPack(db, secretariat, { domain: "eia", recordId: e2.activity.id, stage: "planned_activity_notice", at: "2026-08-25T10:00:00.000Z" });
  addEiaPack(db, party, e2.activity.id, "draft_eia", "Draft EIA report v1 for consultation (Arts 33–34)", K("eia-2-draft"));
  publishPack(db, secretariat, { domain: "eia", recordId: e2.activity.id, stage: "draft_eia", at: "2026-09-03T10:00:00.000Z" });
  addEiaPack(db, party, e2.activity.id, "decision_conditions", "Draft decision with conditions (Arts 34/37) — awaiting publication", K("eia-2-decision"));

  const e3 = createEiaActivity(db, party, { title: "Baseline survey, CCZ", abnjBox: "CCZ" }, K("eia-3"));
  addEiaPack(db, party, e3.activity.id, "screening", "Screening: EIA required (Art 31)", K("eia-3-screening"), { screeningOutcome: "eia_required" });
  publishPack(db, secretariat, { domain: "eia", recordId: e3.activity.id, stage: "screening", at: "2026-09-04T10:00:00.000Z" });
  addEiaPack(db, party, e3.activity.id, "draft_eia", "Draft EIA — work in progress", K("eia-3-draft"), { status: "draft" });

  // ---- CBTMT
  const need = createCbtmtRecord(db, party, { kind: "need", title: "Taxonomic training for deep-sea samples", themes: ["taxonomy", "genomics"] }, K("cbtmt-need"));
  publishPack(db, secretariat, { domain: "cbtmt", recordId: need.record.id, stage: "need_posted", at: "2026-08-28T10:00:00.000Z" });
  const offer = createCbtmtRecord(
    db,
    secretariat,
    { kind: "offer", title: "Marine genomics lab placements", themes: ["taxonomy"], provider: "Demo Ocean Tech Consortium" },
    K("cbtmt-offer"),
  );
  publishPack(db, secretariat, { domain: "cbtmt", recordId: offer.record.id, stage: "offer_posted", at: "2026-08-29T10:00:00.000Z" });
  const match = suggestMatch(db, secretariat, need.record.id, offer.record.id, "shared_theme:taxonomy", K("cbtmt-match"));

  // ---- one seeded digest notification (digest rows are seeded only)
  const anyPublished = db.prepare("SELECT id FROM events WHERE status = 'published' ORDER BY seq ASC LIMIT 1").get() as { id: string } | undefined;
  if (anyPublished) {
    db.prepare(
      `INSERT OR IGNORE INTO notifications (id, user_id, event_id, kind, at, read, summary)
       VALUES ('00000000-0000-4000-8000-00000000d001', ?, ?, 'digest', '2026-09-05T06:00:00.000Z', 0, 'Daily digest: 3 new published packs across MGR and EIA (demo)')`,
    ).run(SEED_USERS[0].id, anyPublished.id);
  }

  return {
    users: Object.fromEntries(SEED_USERS.map((u) => [u.username, u.id])),
    mgr: { published: a.batch.id, draft: b.batch.id, imported: c.batch.id, restricted: d.batch.id },
    eia: { noEia: e1.activity.id, full: e2.activity.id, coexist: e3.activity.id },
    cbtmt: { need: need.record.id, offer: offer.record.id, matchId: match.match.id },
  };
}

/** Startup path: seed only when the users table is empty. Never deletes. */
export function seedIfEmpty(db: Db): { seeded: boolean } {
  const n = (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
  if (n > 0) return { seeded: false };
  seedDatabase(db);
  return { seeded: true };
}
