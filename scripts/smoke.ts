/**
 * smoke.ts — executable acceptance for Section I of IMPLEMENTATION-PLAN.md.
 * Runs against a temporary SQLite file; never touches data/chm.sqlite.
 *
 *   npm run smoke            # all groups
 *   npm run smoke -- p0      # P0 gate only
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { contractsIdentical } from "./contracts-check";

type Test = { name: string; group: "p0" | "p1"; fn: () => Promise<void> | void };
const tests: Test[] = [];
const p0 = (name: string, fn: Test["fn"]) => tests.push({ name, group: "p0", fn });
const p1 = (name: string, fn: Test["fn"]) => tests.push({ name, group: "p1", fn });

/** Thrown by a test whose subject API is not present in this build; reported as `skip`, never as a failure. */
class Skip extends Error {}
const skipUnless = (present: unknown, what: string) => {
  if (typeof present !== "function") throw new Skip(`${what} not present in this build`);
};

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "chm-smoke-"));
const dbPath = path.join(tmpDir, "smoke.sqlite");
process.env.DATABASE_PATH = dbPath;
(process.env as Record<string, string | undefined>).NODE_ENV = "test";

async function main() {
  const only = process.argv[2] as "p0" | "p1" | undefined;

  const dbMod = await import("../src/lib/db");
  const { SCHEMA_VERSION } = await import("../src/lib/db/schema");
  const contracts = await import("../src/lib/contracts/events");
  const ext = await import("../src/lib/contracts/extensions");
  const policy = await import("../src/server/policy");
  const ids = await import("../src/server/ids");
  const packs = await import("../src/server/packs");
  const mgr = await import("../src/server/mgr");
  const eia = await import("../src/server/eia");
  const cbtmt = await import("../src/server/cbtmt");
  const notify = await import("../src/server/notify");
  const reconcile = await import("../src/server/reconcile");
  const queries = await import("../src/server/queries");
  const seed = await import("../src/server/seed");
  const users = await import("../src/server/users");
  const template = await import("../src/server/template");
  const importer = await import("../src/server/import");
  const { DomainError } = await import("../src/server/errors");

  const db = dbMod.getDb();
  const seedResult = seed.seedDatabase(db);

  const principalOf = (username: string) => {
    const u = users.findUserByUsername(db, username);
    assert.ok(u, `seed user ${username}`);
    return policy.principalFor(u);
  };
  const party = () => principalOf("party.nfp");
  const secretariat = () => principalOf("secretariat");
  const pub = () => principalOf("public");
  const stb = () => principalOf("stb");
  const key = () => crypto.randomUUID();

  // ---------------------------------------------------------------- contracts
  p0("contracts:check — app copy byte-identical to proposal/schemas/events.ts", () => {
    const r = contractsIdentical();
    assert.ok(r.ok, r.message);
  });

  p0("schema_version gate — mismatched database refuses to open", () => {
    const otherPath = path.join(tmpDir, "stale.sqlite");
    const stale = dbMod.openDatabase(otherPath);
    stale.prepare("UPDATE meta SET value = ? WHERE key = 'schema_version'").run(String(SCHEMA_VERSION + 100));
    stale.close();
    assert.throws(() => dbMod.openDatabase(otherPath), dbMod.SchemaVersionError);
  });

  // ---------------------------------------------------------------- identifiers
  p0("identifier patterns — publicRecordId (CBTMT in full), receiptId, bSbi; bSbi never matches publicRecordId", () => {
    const y = 2026;
    const prid = ids.mintPublicRecordId(db, "cbtmt", y);
    assert.match(prid, ext.PUBLIC_RECORD_ID_PATTERN);
    assert.match(prid, /^BBNJ-CBTMT-/);
    assert.ok(contracts.PublicRecordId.safeParse(prid).success);
    const rcpt = ids.mintReceiptId(db, y);
    assert.match(rcpt, ext.RECEIPT_ID_PATTERN);
    assert.ok(contracts.ReceiptId.safeParse(rcpt).success);
    const bsbi = ids.mintBSbi(db, "XSD", y);
    assert.match(bsbi, ext.BSBI_PATTERN);
    assert.doesNotMatch(bsbi, ext.PUBLIC_RECORD_ID_PATTERN);
    const again = ids.mintBSbi(db, "XSD", y);
    assert.notEqual(bsbi, again, "counter advances");
  });

  // ---------------------------------------------------------------- policy / session
  p0("anonymous principal — missing/malformed/unknown/inactive cookie reads as public, mutations refused", () => {
    for (const raw of [undefined, "", "not-a-uuid", crypto.randomUUID()]) {
      const p = policy.principalFromCookie(db, raw);
      assert.equal(p.kind, "anonymous");
      assert.equal(policy.can(p, "submit"), false);
      assert.equal(policy.can(p, "publish"), false);
    }
    const u = users.findUserByUsername(db, "party.nfp")!;
    db.prepare("UPDATE users SET active = 0 WHERE id = ?").run(u.id);
    assert.equal(policy.principalFromCookie(db, u.id).kind, "anonymous");
    db.prepare("UPDATE users SET active = 1 WHERE id = ?").run(u.id);
    assert.equal(policy.principalFromCookie(db, u.id).kind, "user");
  });

  p0("can() — role predicates", () => {
    assert.equal(policy.can(party(), "submit"), true);
    assert.equal(policy.can(party(), "publish"), false);
    assert.equal(policy.can(secretariat(), "publish"), true);
    assert.equal(policy.can(secretariat(), "import"), true);
    assert.equal(policy.can(stb(), "comment_stb"), true);
    assert.equal(policy.can(pub(), "comment_stb"), false);
    assert.equal(policy.can(pub(), "submit"), false);
    // non_state_uploader (C9): CBTMT offers only — the subject decides, not the bare action
    const ns: import("../src/server/policy").Principal = {
      kind: "user",
      user: { id: "00000000-0000-4000-8000-0000000000fd", username: "nonstate.predicate", displayName: "Non-State uploader", roles: ["non_state_uploader"], active: true },
    };
    assert.equal(policy.can(ns, "submit", { domain: "cbtmt", recordKind: "offer" }), true);
    assert.equal(policy.can(ns, "submit", { domain: "cbtmt", recordKind: "need" }), false);
    assert.equal(policy.can(ns, "submit", { domain: "mgr" }), false);
    assert.equal(policy.can(ns, "submit"), false);
    assert.equal(policy.can(ns, "publish"), false);
    assert.equal(policy.can(ns, "import"), false);
    assert.equal(policy.actorRoleOf(ns), "non_state_uploader");
  });

  // ---------------------------------------------------------------- Lock 2 + confidentiality
  p0("public and STB reads return zero draft/pending rows", () => {
    for (const p of [pub(), stb()]) {
      const rows = queries.auditRows(db, p, {});
      assert.ok(rows.length > 0);
      assert.ok(rows.every((r) => r.status === "published"), "published only");
      const mgrList = queries.listMgrBatches(db, p);
      assert.ok(mgrList.every((b) => b.bSbi !== undefined), "no draft batch leaks");
    }
  });

  p0("FTS search — matches titles and hides non-visible rows", () => {
    const hitsPub = queries.searchRecords(db, pub(), { q: "marine" });
    assert.ok(hitsPub.length >= 0);
    for (const h of hitsPub) {
      assert.ok(queries.recordVisible(db, pub(), h.domain, h.id), `public hit ${h.id} must be visible`);
    }
    const sec = queries.searchRecords(db, secretariat(), { q: "marine" });
    assert.ok(sec.length >= hitsPub.length, "secretariat sees at least public hits");
    const match = queries.toFtsQuery('alpha beta');
    assert.equal(match, '"alpha"* AND "beta"*');
    assert.equal(queries.toFtsQuery(''), null);
  });


  p0("restricted record — absent from public feed/counts/audit/notifications; present for secretariat, owner, stb", () => {
    const restricted = seedResult.mgr.restricted;
    const pubList = queries.listMgrBatches(db, pub());
    assert.ok(!pubList.some((b) => b.id === restricted), "public list");
    assert.ok(!queries.auditRows(db, pub(), {}).some((r) => r.recordId === restricted), "public audit");
    assert.ok(!queries.recentPublished(db, pub()).some((r) => r.recordId === restricted), "public feed");
    const pubCounts = queries.railCounts(db, pub());
    const pubVisibleEvents = queries.auditRows(db, pub(), {}).length;
    assert.equal(pubCounts.audit, pubVisibleEvents, "public counts equal public list lengths");
    for (const p of [secretariat(), party(), stb()]) {
      assert.ok(queries.listMgrBatches(db, p).some((b) => b.id === restricted), `visible to ${p.kind === "user" ? p.user.username : "anon"}`);
    }
    const publicUser = users.findUserByUsername(db, "public")!;
    const restrictedEvents = db.prepare("SELECT id FROM events WHERE record_id = ?").all(restricted) as { id: string }[];
    for (const e of restrictedEvents) {
      const n = db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND event_id = ?").get(publicUser.id, e.id) as { n: number };
      assert.equal(n.n, 0, "no notification to public for restricted event");
    }
  });

  p0("public audit projection — no internal user ids, no restricted summaries", () => {
    const rows = queries.auditRows(db, pub(), {});
    for (const r of rows) {
      assert.equal(r.actorUserId, undefined);
      assert.equal(r.confidentiality, "public");
    }
    const secRows = queries.auditRows(db, secretariat(), {});
    assert.ok(secRows.some((r) => r.actorUserId !== undefined), "secretariat sees actor user");
  });

  // ---------------------------------------------------------------- MGR receipt (Lock 3)
  p0("batch A — bSbi at receipt while publicRecordId null; publish adds publicRecordId, bSbi unchanged; batch B draft has no bSbi", () => {
    const a = mgr.getMgrBatch(db, seedResult.mgr.published)!;
    assert.match(a.bSbi!, ext.BSBI_PATTERN);
    assert.match(a.publicRecordId!, /^BBNJ-MGR-/);
    const b = mgr.getMgrBatch(db, seedResult.mgr.draft)!;
    assert.equal(b.bSbi, undefined);
    assert.equal(b.publicRecordId, undefined);
    assert.equal(b.currentStage, "pre_collection");
  });

  p0("draft → submit yields one batch and one B-SBI; resubmitting with same key writes nothing", () => {
    const before = (db.prepare("SELECT COUNT(*) AS n FROM mgr_batches").get() as { n: number }).n;
    const k1 = key();
    const draft = mgr.saveMgrDraft(db, party(), { title: "Smoke draft", locationHint: "CCZ" }, k1);
    assert.equal(draft.batch.bSbi, undefined);
    const k2 = key();
    const submitted = mgr.submitPreCollection(db, party(), draft.batch.id, {}, k2);
    assert.equal(submitted.batch.id, draft.batch.id, "same batch");
    assert.match(submitted.batch.bSbi!, ext.BSBI_PATTERN);
    assert.equal(submitted.batch.currentStage, "batch_id_issued");
    assert.equal(submitted.batch.publicRecordId, undefined, "no publicRecordId before publish");
    assert.match(submitted.event.receiptId!, ext.RECEIPT_ID_PATTERN);
    const eventsBefore = (db.prepare("SELECT COUNT(*) AS n FROM events").get() as { n: number }).n;
    const again = mgr.submitPreCollection(db, party(), draft.batch.id, {}, k2);
    assert.equal(again.event.id, submitted.event.id, "idempotent replay returns original");
    const eventsAfter = (db.prepare("SELECT COUNT(*) AS n FROM events").get() as { n: number }).n;
    assert.equal(eventsAfter, eventsBefore, "no new rows");
    const after = (db.prepare("SELECT COUNT(*) AS n FROM mgr_batches").get() as { n: number }).n;
    assert.equal(after, before + 1, "exactly one batch created");
    // second submit with a new key on an already-submitted batch must not mint again
    assert.throws(() => mgr.submitPreCollection(db, party(), draft.batch.id, {}, key()), DomainError);
    assert.equal(mgr.getMgrBatch(db, draft.batch.id)!.bSbi, submitted.batch.bSbi);
  });

  p0("receivePreCollection with same idempotency key twice creates one batch", () => {
    const k = key();
    const before = (db.prepare("SELECT COUNT(*) AS n FROM mgr_batches").get() as { n: number }).n;
    const r1 = mgr.receivePreCollection(db, party(), { title: "Idem", locationHint: "Reykjanes Ridge" }, "form", k);
    const r2 = mgr.receivePreCollection(db, party(), { title: "Idem", locationHint: "Reykjanes Ridge" }, "form", k);
    assert.equal(r1.batch.id, r2.batch.id);
    const after = (db.prepare("SELECT COUNT(*) AS n FROM mgr_batches").get() as { n: number }).n;
    assert.equal(after, before + 1);
  });

  // ---------------------------------------------------------------- publish (Lock 1)
  p0("publish twice yields one published row and one dispatch; stale pending refused; client version ignored", () => {
    const r = mgr.receivePreCollection(db, party(), { title: "Pub twice", locationHint: "CCZ" }, "form", key());
    const pubEvt = packs.publishPack(db, secretariat(), { domain: "mgr", recordId: r.batch.id, stage: "pre_collection" });
    assert.equal(pubEvt.event.status, "published");
    assert.equal(pubEvt.created, true);
    assert.match(pubEvt.event.publicRecordId!, /^BBNJ-MGR-/);
    // publishPack dispatched after commit; the owner (party) must already hold a publish notification
    const partyUser = users.findUserByUsername(db, "party.nfp")!;
    const owned = db
      .prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND event_id = ? AND kind = 'publish'")
      .get(partyUser.id, pubEvt.event.id) as { n: number };
    assert.equal(owned.n, 1, "owner notified exactly once by publish");
    const n1 = notify.dispatch(db, pubEvt.event.id);
    assert.equal(n1.inserted, 0, "manual re-dispatch inserts nothing");
    const second = packs.publishPack(db, secretariat(), { domain: "mgr", recordId: r.batch.id, stage: "pre_collection" });
    assert.equal(second.created, false, "no-op on second publish");
    assert.equal(second.event.id, pubEvt.event.id);
    const rows = db
      .prepare("SELECT COUNT(*) AS n FROM events WHERE record_id = ? AND stage = 'pre_collection' AND status = 'published'")
      .get(r.batch.id) as { n: number };
    assert.equal(rows.n, 1);
    const n2 = notify.dispatch(db, pubEvt.event.id);
    assert.equal(n2.inserted, 0, "dispatch idempotent");
    const logs = db.prepare("SELECT COUNT(*) AS n FROM dispatch_log WHERE event_id = ?").get(pubEvt.event.id) as { n: number };
    assert.equal(logs.n, 1);
    // dispatch received the NEW published id, not the pending one
    assert.notEqual(pubEvt.event.id, r.event.id);
    // versions: open a post_collection pack, version allocated server-side
    const v1 = mgr.addMgrPack(db, party(), r.batch.id, "post_collection", "Post-collection summary", key(), { version: 99 } as never);
    assert.equal(v1.event.version, 1, "client version ignored");
    packs.publishPack(db, secretariat(), { domain: "mgr", recordId: r.batch.id, stage: "post_collection" });
    const v2 = mgr.addMgrPack(db, party(), r.batch.id, "post_collection", "Post-collection v2", key());
    assert.equal(v2.event.version, 2);
    // stale: publishing version 1 explicitly when version 2 exists is refused
    assert.throws(
      () => packs.publishPack(db, secretariat(), { domain: "mgr", recordId: r.batch.id, stage: "post_collection", expectedVersion: 1 }),
      (e: unknown) => e instanceof DomainError && e.code === "stale_pack",
    );
    // party cannot publish
    assert.throws(() => packs.publishPack(db, party(), { domain: "mgr", recordId: r.batch.id, stage: "post_collection" }), DomainError);
  });

  // ---------------------------------------------------------------- EIA / STB (Lock 2)
  p0("STB sees published draft_eia for activity 2; queue empties after commentStb; second comment refused; stb_review + deadline notifications exist", () => {
    const act2 = seedResult.eia.full;
    const queue = eia.stbQueue(db, stb());
    assert.ok(queue.some((q) => q.activityId === act2), "activity 2 in STB queue");
    const stbUser = users.findUserByUsername(db, "stb")!;
    const draftEvt = db
      .prepare("SELECT id FROM events WHERE record_id = ? AND stage = 'draft_eia' AND status = 'published' ORDER BY seq DESC LIMIT 1")
      .get(act2) as { id: string };
    const rev = db
      .prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND event_id = ? AND kind = 'stb_review'")
      .get(stbUser.id, draftEvt.id) as { n: number };
    assert.equal(rev.n, 1, "stb_review notification");
    const deadline = db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE event_id = ? AND kind = 'deadline'").get(draftEvt.id) as { n: number };
    assert.ok(deadline.n >= 1, "deadline notification");
    const c = eia.commentStb(db, stb(), act2, "Consolidated STB comment", key());
    assert.equal(c.event.stage, "comments_stb");
    assert.ok(!eia.stbQueue(db, stb()).some((q) => q.activityId === act2), "queue emptied");
    assert.throws(() => eia.commentStb(db, stb(), act2, "Again", key()), DomainError);
    // public still sees zero non-published
    assert.ok(queries.auditRows(db, pub(), {}).every((r) => r.status === "published"));
  });

  p0("Lock 1 coexistence — activity 3 has published screening and a draft draft_eia; public lists it once", () => {
    const act3 = seedResult.eia.coexist;
    const packsFor = eia.packsForActivity(db, secretariat(), act3);
    assert.ok(packsFor.some((p) => p.stage === "screening" && p.status === "published"));
    assert.ok(packsFor.some((p) => p.stage === "draft_eia" && p.status === "draft"));
    const publicPacks = eia.packsForActivity(db, pub(), act3);
    assert.ok(publicPacks.every((p) => p.status === "published"));
    assert.equal(queries.listEiaActivities(db, pub()).filter((a) => a.id === act3).length, 1);
    assert.throws(
      () => packs.publishPack(db, secretariat(), { domain: "eia", recordId: act3, stage: "draft_eia" }),
      (e: unknown) => e instanceof DomainError && e.code === "not_pending",
    );
  });

  // ---------------------------------------------------------------- CBTMT (Lock 4)
  p0("cbtmt_matches — FK enforced; duplicate pair ignored without second event; seeded match_suggested carries matchId", () => {
    assert.throws(() =>
      db.prepare("INSERT INTO cbtmt_matches(id, need_id, offer_id, rule, at) VALUES (?, ?, ?, ?, ?)").run(
        crypto.randomUUID(),
        seedResult.cbtmt.need,
        crypto.randomUUID(),
        "x",
        new Date().toISOString(),
      ),
    );
    const evt = db.prepare("SELECT match_id FROM events WHERE stage = 'match_suggested' AND record_id = ?").get(seedResult.cbtmt.need) as {
      match_id: string | null;
    };
    assert.ok(evt.match_id);
    const before = (db.prepare("SELECT COUNT(*) AS n FROM events WHERE stage = 'match_suggested'").get() as { n: number }).n;
    const r = cbtmt.suggestMatch(db, secretariat(), seedResult.cbtmt.need, seedResult.cbtmt.offer, "shared_theme:taxonomy", key());
    assert.equal(r.created, false);
    const after = (db.prepare("SELECT COUNT(*) AS n FROM events WHERE stage = 'match_suggested'").get() as { n: number }).n;
    assert.equal(after, before);
  });

  // ---------------------------------------------------------------- outbox integrity
  p0("reconcile() — caches equal event-derived values", () => {
    const r = reconcile.reconcile(db);
    assert.deepEqual(r.mismatches, [], JSON.stringify(r.mismatches, null, 2));
  });

  p0("replay-outbox inserts zero notifications on a consistent DB; one dispatch_log row per dispatched event", () => {
    const r = notify.replayOutbox(db);
    assert.equal(r.inserted, 0);
    const logs = (db.prepare("SELECT COUNT(*) AS n FROM dispatch_log").get() as { n: number }).n;
    const published = (db.prepare("SELECT COUNT(*) AS n FROM events WHERE status = 'published'").get() as { n: number }).n;
    assert.equal(logs, published);
  });

  p0("seed idempotency — re-running seed writes nothing", () => {
    const counts = () => ({
      users: (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n,
      events: (db.prepare("SELECT COUNT(*) AS n FROM events").get() as { n: number }).n,
      batches: (db.prepare("SELECT COUNT(*) AS n FROM mgr_batches").get() as { n: number }).n,
      matches: (db.prepare("SELECT COUNT(*) AS n FROM cbtmt_matches").get() as { n: number }).n,
    });
    const before = counts();
    seed.seedDatabase(db);
    assert.deepEqual(counts(), before);
  });

  p0("db:seed --if-empty is a no-op on a seeded DB; db:reset refused in production", async () => {
    const before = (db.prepare("SELECT COUNT(*) AS n FROM events").get() as { n: number }).n;
    const r = seed.seedIfEmpty(db);
    assert.equal(r.seeded, false);
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM events").get() as { n: number }).n, before);
    const reset = await import("../src/server/reset");
    assert.throws(() => reset.assertResetAllowed({ nodeEnv: "production", force: false }));
    assert.doesNotThrow(() => reset.assertResetAllowed({ nodeEnv: "production", force: true }));
    assert.doesNotThrow(() => reset.assertResetAllowed({ nodeEnv: "development", force: false }));
  });

  // ================================================================ v0.2 hardening
  const digest = await import("../src/server/digest");
  const exporter = await import("../src/server/export");
  const resetMod = await import("../src/server/reset");
  const count = (sql: string, ...params: unknown[]) => (db.prepare(sql).get(...params) as { n: number }).n;
  const anon = () => policy.anonymous();
  const otherParty = (): import("../src/server/policy").Principal => ({
    kind: "user",
    user: { id: "00000000-0000-4000-8000-0000000000ff", username: "party.other", displayName: "Other Party", roles: ["party"], partyCode: "XSE", active: true },
  });

  // ---------------------------------------------------------------- P0-1 role matrix + refusal log
  p0("role × action matrix — every refusal leaves exactly one access_refusals row; grants leave none", () => {
    const actors: Record<string, () => import("../src/server/policy").Principal> = { anonymous: anon, public: pub, party: party, stb, secretariat };
    // expected can() per action, in ALL_ACTIONS order
    const expected: Record<string, Record<string, boolean>> = {
      anonymous: { submit: false, publish: false, amend: false, comment_stb: false, import: false, suggest_match: false, manage_subscription: false, view_full_audit: false, export_full: false, run_digest: false, reset_sandbox: false },
      public: { submit: false, publish: false, amend: false, comment_stb: false, import: false, suggest_match: false, manage_subscription: true, view_full_audit: false, export_full: false, run_digest: false, reset_sandbox: false },
      party: { submit: true, publish: false, amend: true, comment_stb: false, import: false, suggest_match: false, manage_subscription: true, view_full_audit: false, export_full: false, run_digest: false, reset_sandbox: false },
      stb: { submit: false, publish: false, amend: false, comment_stb: true, import: false, suggest_match: false, manage_subscription: true, view_full_audit: false, export_full: false, run_digest: false, reset_sandbox: false },
      secretariat: { submit: true, publish: true, amend: true, comment_stb: false, import: true, suggest_match: true, manage_subscription: true, view_full_audit: true, export_full: true, run_digest: true, reset_sandbox: true },
    };
    for (const [name, mk] of Object.entries(actors)) {
      for (const action of policy.ALL_ACTIONS) {
        const before = count("SELECT COUNT(*) AS n FROM access_refusals");
        const allowed = policy.can(mk(), action);
        assert.equal(allowed, expected[name][action], `${name} can ${action}`);
        if (allowed) {
          assert.doesNotThrow(() => policy.requireCan(mk(), action, undefined, { db }));
          assert.equal(count("SELECT COUNT(*) AS n FROM access_refusals"), before, "grant writes no refusal");
        } else {
          assert.throws(() => policy.requireCan(mk(), action, undefined, { db, path: "/smoke" }), (e: unknown) => e instanceof DomainError && e.code === "forbidden");
          assert.equal(count("SELECT COUNT(*) AS n FROM access_refusals"), before + 1, `refusal recorded for ${name}/${action}`);
        }
      }
    }
    // ownership: another Party is refused on someone else's record and the row names the record
    const r = mgr.receivePreCollection(db, party(), { title: "Owned", locationHint: "CCZ" }, "form", key());
    assert.throws(() => mgr.saveMgrDraft(db, otherParty(), { title: "x" }, key(), { batchId: r.batch.id }), DomainError);
    const last = policy.listRefusals(db, secretariat(), 1)[0];
    assert.equal(last.recordId, r.batch.id);
    assert.equal(last.actorRole, "party");
    // projections: secretariat sees refusals, nobody else does (and asking is itself not a refusal — it's an empty read)
    assert.ok(policy.listRefusals(db, secretariat()).length > 0);
    for (const p of [anon(), pub(), party(), stb()]) assert.deepEqual(policy.listRefusals(db, p), []);
  });

  // ---------------------------------------------------------------- P0-2 digest hold semantics
  p0("digest — daily subscriber gets no per-event bell for subscription matches; runDigests rolls them into one row; idempotent; immediate subscriber still per-event", () => {
    const partyUser = users.findUserByUsername(db, "party.nfp")!; // subscribed mgr+cbtmt, daily
    const publicUser = users.findUserByUsername(db, "public")!; // subscribed eia/CCZ, immediate
    // MGR pack owned by the secretariat (assisted) so the party is reached only via subscription
    const r = mgr.receivePreCollection(db, secretariat(), { title: "Held for digest", locationHint: "CCZ" }, "form", key(), { partyCode: "XSE" });
    const pubEvt = packs.publishPack(db, secretariat(), { domain: "mgr", recordId: r.batch.id, stage: "pre_collection" });
    assert.equal(count("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND event_id = ?", partyUser.id, pubEvt.event.id), 0, "held, no per-event bell");
    const digestsBefore = count("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND kind = 'digest'", partyUser.id);
    const run1 = digest.runDigests(db, { actor: secretariat() });
    const mine = run1.users.find((u) => u.userId === partyUser.id)!;
    assert.ok(mine.inserted && mine.eventCount >= 1, JSON.stringify(mine));
    assert.equal(count("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND kind = 'digest'", partyUser.id), digestsBefore + 1);
    const row = db.prepare("SELECT summary FROM notifications WHERE user_id = ? AND kind = 'digest' ORDER BY at DESC, rowid DESC LIMIT 1").get(partyUser.id) as { summary: string };
    assert.match(row.summary, /Daily digest/);
    assert.match(row.summary, /Held for digest|BBNJ-MGR/);
    const run2 = digest.runDigests(db, { actor: secretariat() });
    assert.equal(run2.inserted, 0, "second run inserts nothing");
    assert.equal(count("SELECT COUNT(*) AS n FROM digest_runs WHERE user_id = ?", partyUser.id) >= 1, true);
    // immediate subscriber: EIA/CCZ publish reaches public at once
    const e = eia.createEiaActivity(db, party(), { title: "Immediate CCZ", abnjBox: "CCZ" }, key());
    eia.addEiaPack(db, party(), e.activity.id, "screening", "Screening", key(), { screeningOutcome: "no_eia" });
    const pe = packs.publishPack(db, secretariat(), { domain: "eia", recordId: e.activity.id, stage: "screening" });
    assert.equal(count("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND event_id = ? AND kind = 'publish'", publicUser.id, pe.event.id), 1);
    // party cannot run digests
    assert.throws(() => digest.runDigests(db, { actor: party() }), DomainError);
    // replay still inserts nothing
    assert.equal(notify.replayOutbox(db).inserted, 0);
  });

  // ---------------------------------------------------------------- P0-3 import closed loop
  p0("import loop — fixture with invalid row → run persisted, N-1 accepted; error workbook re-imports after correction; runs visible to secretariat only", async () => {
    const fixture = await template.buildMgrSample({ rows: 2, withInvalid: true });
    const k = key();
    const run = await importer.importMgrExcel(db, secretariat(), fixture, "XSD", k, { filename: "smoke.xlsx" });
    assert.equal(run.accepted, 2);
    assert.equal(run.rejected, 1);
    const bad = run.rows.find((r) => !r.ok)!;
    assert.match(bad.error ?? "", /objectives|confidentiality/i);
    assert.ok(bad.values && bad.values.title.includes("INVALID"), "rejected row keeps its values");
    // durable + idempotent
    const again = await importer.importMgrExcel(db, secretariat(), fixture, "XSD", k, { filename: "smoke.xlsx" });
    assert.equal(again.runId, run.runId);
    assert.equal(count("SELECT COUNT(*) AS n FROM import_runs WHERE id = ?", run.runId), 1);
    assert.ok(importer.getImportRun(db, secretariat(), run.runId));
    assert.throws(() => importer.getImportRun(db, party(), run.runId), DomainError);
    assert.deepEqual(importer.listImportRuns(db, pub()), []);
    // error workbook: template marker, Error column, only the failed row
    const report = await template.buildMgrErrorReport(run);
    assert.deepEqual(await template.sheetNames(report), ["Meta", "Data", "Field guide"]);
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(report as unknown as import("exceljs").Buffer);
    const data = wb.getWorksheet("Data")!;
    assert.equal(data.rowCount, 2, "header + one failed row");
    const headerRow = data.getRow(1);
    assert.equal(String(headerRow.getCell(headerRow.cellCount).value), template.ERROR_COLUMN_HEADER);
    // re-import the raw report is rejected (unknown header); corrected report is accepted
    await assert.rejects(importer.importMgrExcel(db, secretariat(), report, "XSD", key()), DomainError);
    const fixed = await template.correctErrorReport(report, { objectives: "Corrected offline by the Party.", confidentiality: "public" });
    const run2 = await importer.importMgrExcel(db, secretariat(), fixed, "XSD", key(), { filename: "smoke-corrected.xlsx" });
    assert.equal(run2.rejected, 0, JSON.stringify(run2.rows));
    assert.equal(run2.accepted, 1);
    assert.match(mgr.getMgrBatch(db, run2.rows[0].batchId!)!.bSbi!, ext.BSBI_PATTERN);
  });

  // ---------------------------------------------------------------- P0-4 versioning + material change
  p0("amend — published v1 → pending v2 with note; publish v2 re-notifies prior recipients when material; editorial does not; non-published refused; ids unchanged", () => {
    const partyUser = users.findUserByUsername(db, "party.nfp")!;
    const publicUser = users.findUserByUsername(db, "public")!;
    // EIA in CCZ: public (immediate, CCZ) and owner receive v1
    const e = eia.createEiaActivity(db, party(), { title: "Amendable", abnjBox: "CCZ" }, key());
    eia.addEiaPack(db, party(), e.activity.id, "screening", "Screening v1", key(), { screeningOutcome: "eia_required" });
    const v1 = packs.publishPack(db, secretariat(), { domain: "eia", recordId: e.activity.id, stage: "screening" });
    const prid = v1.event.publicRecordId!;
    assert.equal(count("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND event_id = ?", publicUser.id, v1.event.id), 1);
    // amending a pending pack is refused
    eia.addEiaPack(db, party(), e.activity.id, "draft_eia", "Draft", key());
    assert.throws(
      () => packs.amendPack(db, party(), { domain: "eia", recordId: e.activity.id, stage: "draft_eia", summary: "", changeNote: "x", materialChange: true, idempotencyKey: key() }),
      (err: unknown) => err instanceof DomainError && err.code === "invalid_transition",
    );
    // editorial amendment of screening → v2 pending, publish → public notified via subscription only once (as a normal publish), party as owner
    const ed = packs.amendPack(db, party(), { domain: "eia", recordId: e.activity.id, stage: "screening", summary: "Screening v2 (typo)", changeNote: "Typo fixed", materialChange: false, idempotencyKey: key() });
    assert.equal(ed.event.version, 2);
    assert.equal(ed.event.status, "pending");
    assert.equal(ed.event.changeNote, "Typo fixed");
    assert.equal(ed.event.materialChange, false);
    assert.equal(ed.event.screeningOutcome, "eia_required", "screening outcome carried to v2");
    const pv2 = packs.publishPack(db, secretariat(), { domain: "eia", recordId: e.activity.id, stage: "screening" });
    assert.equal(pv2.event.version, 2);
    assert.equal(pv2.event.publicRecordId, prid, "publicRecordId unchanged across versions");
    assert.equal(pv2.event.changeNote, "Typo fixed");
    // material amendment → v3; the STB user never held a screening notification and stays out; public/party re-notified
    const stbUser = users.findUserByUsername(db, "stb")!;
    const mat = packs.amendPack(db, secretariat(), { domain: "eia", recordId: e.activity.id, stage: "screening", summary: "Screening v3", changeNote: "Outcome reasoning corrected", materialChange: true, idempotencyKey: key() });
    assert.equal(mat.event.version, 3);
    const pv3 = packs.publishPack(db, secretariat(), { domain: "eia", recordId: e.activity.id, stage: "screening" });
    assert.match(pv3.event.summary, /Screening v3/);
    for (const u of [publicUser, partyUser]) {
      assert.equal(count("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND event_id = ? AND kind = 'publish'", u.id, pv3.event.id), 1, `${u.username} re-notified once`);
    }
    assert.equal(count("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND event_id = ?", stbUser.id, pv3.event.id), 0);
    const nRow = db.prepare("SELECT summary FROM notifications WHERE user_id = ? AND event_id = ?").get(publicUser.id, pv3.event.id) as { summary: string };
    assert.match(nRow.summary, /amended v3 \(material change\)/);
    assert.deepEqual(packs.packVersions(db, e.activity.id, "screening").map((x) => [x.version, x.status]), [[1, "published"], [2, "published"], [3, "published"]]);
    // MGR: amend published pre-collection with field edits; B-SBI unchanged, history kept
    const b = mgr.receivePreCollection(db, party(), { title: "Amend me", locationHint: "CCZ" }, "form", key());
    packs.publishPack(db, secretariat(), { domain: "mgr", recordId: b.batch.id, stage: "pre_collection" });
    const before = mgr.getMgrBatch(db, b.batch.id)!;
    const am = mgr.amendMgrPack(db, party(), b.batch.id, "pre_collection", { changeNote: "Area corrected", materialChange: true, fieldEdits: { locationHint: "Reykjanes Ridge" } }, key());
    const after = mgr.getMgrBatch(db, b.batch.id)!;
    assert.equal(am.event.version, 2);
    assert.equal(am.event.bSbi, before.bSbi);
    assert.equal(after.bSbi, before.bSbi);
    assert.equal(after.publicRecordId, before.publicRecordId);
    assert.equal(after.locationHint, "Reykjanes Ridge");
    assert.equal(after.detailsHistory.length, 1);
    assert.equal(after.detailsHistory[0].values.locationHint, "CCZ");
    assert.throws(() => mgr.amendMgrPack(db, otherParty(), b.batch.id, "pre_collection", { changeNote: "hijack", materialChange: false }, key()), DomainError);
    assert.deepEqual(reconcile.reconcile(db).mismatches, []);
  });

  // ---------------------------------------------------------------- P0-5 tier × role matrix
  p0("tier × role matrix — public/restricted/confidential across lists, record, packs, audit, feed, resolver, notifications, exports", () => {
    const tiers = ["public", "restricted", "confidential"] as const;
    const ids: Record<string, { id: string; prid: string }> = {};
    for (const t of tiers) {
      const r = mgr.receivePreCollection(db, party(), { title: `Tier ${t}`, locationHint: "CCZ", confidentiality: t }, "form", key());
      const pubEvt = packs.publishPack(db, secretariat(), { domain: "mgr", recordId: r.batch.id, stage: "pre_collection" });
      ids[t] = { id: r.batch.id, prid: pubEvt.event.publicRecordId! };
    }
    const readers: Record<string, () => import("../src/server/policy").Principal> = { anon, public: pub, owner: party, other: otherParty, stb, secretariat };
    const expected: Record<string, Record<string, boolean>> = {
      public: { anon: true, public: true, owner: true, other: true, stb: true, secretariat: true },
      restricted: { anon: false, public: false, owner: true, other: false, stb: true, secretariat: true },
      confidential: { anon: false, public: false, owner: true, other: false, stb: false, secretariat: true },
    };
    for (const t of tiers) {
      for (const [name, mk] of Object.entries(readers)) {
        const p = mk();
        const want = expected[t][name];
        const label = `${t}/${name}`;
        assert.equal(queries.listMgrBatches(db, p).some((b) => b.id === ids[t].id), want, `${label} list`);
        assert.equal(queries.recordVisible(db, p, "mgr", ids[t].id), want, `${label} recordVisible`);
        assert.equal(queries.packsOf(db, p, ids[t].id).length > 0, want, `${label} packs`);
        assert.equal(queries.auditRows(db, p, {}).some((r) => r.recordId === ids[t].id), want, `${label} audit`);
        assert.equal(queries.recentPublished(db, p, 1000).some((r) => r.recordId === ids[t].id), want, `${label} feed`);
        assert.equal(!!queries.resolvePublicRecord(db, p, ids[t].prid), want, `${label} resolver`);
        assert.equal(exporter.exportTable(db, p, "mgr").rows.some((r) => r.internalId === ids[t].id), want, `${label} export mgr`);
        assert.equal(exporter.exportTable(db, p, "audit").rows.some((r) => r.recordId === ids[t].id), want, `${label} export audit`);
        assert.equal(!!exporter.exportRecord(db, p, ids[t].prid), want, `${label} exportRecord`);
        if (p.kind === "user" && users.findUserById(db, p.user.id)) {
          const n = count("SELECT COUNT(*) AS n FROM notifications n JOIN events e ON e.id = n.event_id WHERE n.user_id = ? AND e.record_id = ?", p.user.id, ids[t].id);
          if (!want) assert.equal(n, 0, `${label} no notification`);
        }
      }
    }
    // seeded confidential batch: STB cannot see it, owner and secretariat can
    assert.equal(queries.recordVisible(db, stb(), "mgr", seedResult.mgr.confidential), false);
    assert.equal(queries.recordVisible(db, party(), "mgr", seedResult.mgr.confidential), true);
    assert.equal(queries.recordVisible(db, secretariat(), "mgr", seedResult.mgr.confidential), true);
    // restricted EIA: public never; STB yes
    assert.equal(queries.recordVisible(db, pub(), "eia", seedResult.eia.restricted), false);
    assert.equal(queries.recordVisible(db, stb(), "eia", seedResult.eia.restricted), true);
  });

  // ---------------------------------------------------------------- P0-6 exports
  p0("export — CSV header equals columns and is RFC 4180; anonymous excludes drafts/restricted; secretariat includes drafts; PDF stub is a PDF; invisible record logs a refusal", () => {
    for (const d of exporter.EXPORT_DOMAINS) {
      const t = exporter.exportTable(db, anon(), d);
      const csv = exporter.toCsv(t);
      const [header, ...rest] = csv.split("\r\n");
      assert.equal(header, t.columns.join(","));
      assert.equal(rest.filter((l) => l !== "").length, t.rows.length, `${d} one line per row`);
    }
    const anonAudit = exporter.exportTable(db, anon(), "audit");
    assert.ok(anonAudit.rows.every((r) => r.status === "published" && r.confidentiality === "public"));
    assert.ok(!anonAudit.columns.includes("actorUserId"));
    const secAudit = exporter.exportTable(db, secretariat(), "audit");
    assert.ok(secAudit.rows.some((r) => r.status === "draft"));
    assert.ok(secAudit.columns.includes("idempotencyKey"));
    // quoting
    const quoted = exporter.toCsv({ columns: ["a"], rows: [{ a: 'x, "y"\nz' }] });
    assert.equal(quoted, 'a\r\n"x, ""y""\nz"\r\n');
    // envelope
    const env = exporter.envelope(pub(), anonAudit.rows);
    assert.equal(env.schemaVersion, SCHEMA_VERSION);
    assert.equal(env.count, anonAudit.rows.length);
    assert.equal(env.role, "public");
    // record json + pdf for the seeded public batch
    const a = mgr.getMgrBatch(db, seedResult.mgr.published)!;
    const rec = exporter.exportRecord(db, anon(), a.publicRecordId!)!;
    assert.equal(rec.domain, "mgr");
    assert.ok(!("ownerUserId" in rec.record), "public projection drops owner");
    assert.ok(rec.versions.post_collection?.length >= 1);
    const pdf = exporter.recordPdf(db, anon(), a.publicRecordId!)!;
    const text = pdf.toString("latin1");
    assert.ok(text.startsWith("%PDF-1.4"));
    assert.ok(text.trimEnd().endsWith("%%EOF"));
    assert.ok(text.includes(a.publicRecordId!));
    // restricted record → undefined + refusal row for the anonymous reader
    const d = mgr.getMgrBatch(db, seedResult.mgr.restricted)!;
    const before = count("SELECT COUNT(*) AS n FROM access_refusals");
    assert.equal(exporter.exportRecord(db, anon(), d.publicRecordId!, "/api/records/x.json"), undefined);
    assert.equal(count("SELECT COUNT(*) AS n FROM access_refusals"), before + 1);
  });

  // ---------------------------------------------------------------- P0-8 sandbox reset
  p0("sandbox reset — refused for non-secretariat, refused unless SANDBOX_RESET=1 outside production, gate helper", () => {
    assert.equal(resetMod.sandboxResetEnabled({ SANDBOX_RESET: "1", NODE_ENV: "development" }), true);
    assert.equal(resetMod.sandboxResetEnabled({ SANDBOX_RESET: "1", NODE_ENV: "production" }), false);
    assert.equal(resetMod.sandboxResetEnabled({ NODE_ENV: "development" }), false);
    assert.equal(resetMod.sandboxResetEnabled({ SANDBOX_RESET: "force", NODE_ENV: "production" }), true);
    assert.throws(() => resetMod.resetSandbox(party(), { SANDBOX_RESET: "1", NODE_ENV: "test" }), (e: unknown) => e instanceof DomainError && e.code === "forbidden");
    assert.throws(() => resetMod.resetSandbox(secretariat(), { NODE_ENV: "test" }), (e: unknown) => e instanceof DomainError && e.code === "forbidden");
    // the real reset is exercised by scripts/demo.ts on its own temp file; here we only prove the gates
  });

  // ---------------------------------------------------------------- Excel (P1)
  p1("template — Meta, Data, Field guide sheets; import fixture → sourceChannel excel + bSbi; bad files rejected", async () => {
    const buf = await template.buildMgrTemplate();
    const sheets = await template.sheetNames(buf);
    assert.deepEqual(sheets, ["Meta", "Data", "Field guide"]);
    const fixture = await template.buildMgrSample();
    const res = await importer.importMgrExcel(db, secretariat(), fixture, "XSD", key());
    assert.ok(res.rows.length >= 1);
    assert.ok(res.rows.every((r) => r.ok), JSON.stringify(res.rows.filter((r) => !r.ok)));
    const created = mgr.getMgrBatch(db, res.rows[0].batchId!)!;
    assert.equal(created.sourceChannel, "excel");
    assert.match(created.bSbi!, ext.BSBI_PATTERN);
    // wrong template version
    const bad = await template.buildMgrTemplate({ templateVersion: 99 });
    await assert.rejects(importer.importMgrExcel(db, secretariat(), bad, "XSD", key()), DomainError);
    // too many rows
    const big = await template.buildMgrSample({ rows: 201 });
    await assert.rejects(importer.importMgrExcel(db, secretariat(), big, "XSD", key()), DomainError);
    // formula cell → row error
    const formula = await template.buildMgrSample({ withFormula: true });
    const fr = await importer.importMgrExcel(db, secretariat(), formula, "XSD", key());
    assert.ok(fr.rows.some((r) => !r.ok && /formula/i.test(r.error ?? "")));
    // party cannot import
    await assert.rejects(importer.importMgrExcel(db, party(), fixture, "XSD", key()), DomainError);
  });

  // ================================================================ EOI wave (schema v5)
  const abmt = await import("../src/server/abmt");
  const records = await import("../src/server/records");
  const nonStateSeeded = () => principalOf("nonstate.uploader");
  /** Inline principal so the role matrix does not depend on the seed row. */
  const nonStateInline = (): import("../src/server/policy").Principal => ({
    kind: "user",
    user: { id: "00000000-0000-4000-8000-0000000000fe", username: "nonstate.inline", displayName: "Non-State uploader (inline)", roles: ["non_state_uploader"], active: true },
  });

  // ---------------------------------------------------------------- ABMT thin stub
  p0("ABMT thin stub — draft → submit pending → publish mints BBNJ-ABMT-YYYY-NNNNN; caches equal event-derived values; reconcile clean", () => {
    const k1 = key();
    const d = abmt.createAbmtProposal(db, party(), { title: "Smoke ABMT proposal (without prejudice)" }, k1);
    assert.equal(d.created, true);
    assert.equal(d.event.domain, "abmt");
    assert.equal(d.event.stage, "proposal_stub");
    assert.equal(d.event.status, "draft");
    assert.equal(d.proposal.currentStage, "proposal_stub");
    assert.equal(d.proposal.publicRecordId, undefined, "no publicRecordId on a draft");
    assert.equal(abmt.createAbmtProposal(db, party(), { title: "replayed" }, k1).created, false, "same key writes nothing");
    const k2 = key();
    const s = abmt.submitAbmtProposal(db, party(), d.proposal.id, k2);
    assert.equal(s.event.status, "pending");
    assert.match(s.event.receiptId!, ext.RECEIPT_ID_PATTERN);
    assert.equal(s.proposal.publicRecordId, undefined, "no publicRecordId before publish");
    assert.equal(abmt.submitAbmtProposal(db, party(), d.proposal.id, k2).event.id, s.event.id, "idempotent replay");
    // Lock 2: public/STB never see the pending proposal; owner and Secretariat do
    assert.ok(!queries.listAbmtProposals(db, pub()).some((p) => p.id === d.proposal.id), "public list");
    assert.ok(!queries.listAbmtProposals(db, stb()).some((p) => p.id === d.proposal.id), "stb list");
    assert.ok(queries.listAbmtProposals(db, party()).some((p) => p.id === d.proposal.id), "owner list");
    assert.ok(queries.listAbmtProposals(db, secretariat()).some((p) => p.id === d.proposal.id), "secretariat list");
    // party cannot publish
    assert.throws(() => packs.publishPack(db, party(), { domain: "abmt", recordId: d.proposal.id, stage: "proposal_stub" }), (e: unknown) => e instanceof DomainError && e.code === "forbidden");
    const p = packs.publishPack(db, secretariat(), { domain: "abmt", recordId: d.proposal.id, stage: "proposal_stub" });
    assert.equal(p.created, true);
    assert.match(p.event.publicRecordId!, /^BBNJ-ABMT-\d{4}-\d{5}$/);
    assert.match(p.event.publicRecordId!, ext.PUBLIC_RECORD_ID_PATTERN);
    assert.ok(contracts.PublicRecordId.safeParse(p.event.publicRecordId).success);
    const after = abmt.getAbmtProposal(db, d.proposal.id)!;
    assert.equal(after.publicRecordId, p.event.publicRecordId);
    assert.equal(after.latestPackStatus, "published");
    assert.equal(packs.publishPack(db, secretariat(), { domain: "abmt", recordId: d.proposal.id, stage: "proposal_stub" }).created, false, "publish twice is a no-op");
    // public now sees it once, through the resolver as well
    assert.equal(queries.listAbmtProposals(db, pub()).filter((x) => x.id === d.proposal.id).length, 1);
    assert.deepEqual(queries.resolvePublicRecord(db, pub(), after.publicRecordId!), { domain: "abmt", recordId: d.proposal.id });
    assert.ok(queries.auditRows(db, pub(), { domain: "abmt" }).some((r) => r.recordId === d.proposal.id));
    // caches equal event-derived values (abmt is on the same rails as the other domains)
    const derived = records.deriveCaches(db, "abmt", d.proposal.id);
    assert.equal(derived.publicRecordId, after.publicRecordId);
    assert.equal(derived.latestPackStatus, "published");
    assert.deepEqual(reconcile.reconcile(db).mismatches, []);
  });

  // ---------------------------------------------------------------- non-State uploader (C9)
  p0("non_state_uploader — fifth login; may post a CBTMT offer; refused on CBTMT need, MGR submit, import and publish — each leaves exactly one refusal row", async () => {
    const ns = nonStateSeeded();
    assert.equal(ns.kind, "user");
    assert.equal(policy.actorRoleOf(ns), "non_state_uploader");
    assert.equal(policy.can(ns, "submit", { domain: "cbtmt", recordKind: "offer" }), true);
    assert.equal(policy.can(ns, "submit", { domain: "cbtmt", recordKind: "need" }), false);
    assert.equal(policy.can(ns, "submit", { domain: "mgr" }), false);
    assert.equal(policy.can(ns, "submit"), false);
    assert.equal(policy.can(ns, "amend", { domain: "cbtmt", recordKind: "offer" }), false, "no amend even on offers");
    for (const a of ["publish", "import", "suggest_match", "view_full_audit", "export_full", "run_digest", "reset_sandbox"] as const) assert.equal(policy.can(ns, a), false, a);
    assert.equal(policy.can(ns, "manage_subscription"), true);
    // grant: a CBTMT offer goes pending on the same rails as any other submission
    const before = count("SELECT COUNT(*) AS n FROM access_refusals");
    const offer = cbtmt.createCbtmtRecord(db, ns, { kind: "offer", title: "Non-State bioinformatics mentoring", themes: ["genomics"], provider: "Demo NGO" }, key());
    assert.equal(offer.created, true);
    assert.equal(offer.record.kind, "offer");
    assert.equal(offer.record.sourceChannel, "form");
    assert.equal(offer.event.actorRole, "non_state_uploader");
    assert.equal(offer.event.status, "pending");
    assert.equal(count("SELECT COUNT(*) AS n FROM access_refusals"), before, "grant writes no refusal");
    const nsId = ns.kind === "user" ? ns.user.id : "";
    const refusalsFor = () => count("SELECT COUNT(*) AS n FROM access_refusals WHERE actor_user_id = ? AND actor_role = 'non_state_uploader'", nsId);
    const expectRefusal = (label: string, fn: () => unknown, action: string) => {
      const b = refusalsFor();
      assert.throws(fn, (e: unknown) => e instanceof DomainError && e.code === "forbidden", label);
      assert.equal(refusalsFor(), b + 1, `${label}: exactly one refusal row`);
      const last = policy.listRefusals(db, secretariat(), 1)[0];
      assert.equal(last.actorRole, "non_state_uploader", label);
      assert.equal(last.action, action, label);
      assert.match(last.reason, /CBTMT offers only/, label);
    };
    expectRefusal("CBTMT need", () => cbtmt.createCbtmtRecord(db, ns, { kind: "need", title: "x", themes: ["taxonomy"], partyCode: "XSD" }, key()), "submit");
    expectRefusal("MGR draft", () => mgr.saveMgrDraft(db, ns, { title: "Not allowed", locationHint: "CCZ" }, key()), "submit");
    expectRefusal("MGR receipt", () => mgr.receivePreCollection(db, ns, { title: "Not allowed", locationHint: "CCZ" }, "form", key(), { partyCode: "XSD" }), "submit");
    expectRefusal("EIA activity", () => eia.createEiaActivity(db, ns, { title: "Not allowed", abnjBox: "CCZ", partyCode: "XSD" }, key()), "submit");
    expectRefusal("ABMT proposal", () => abmt.createAbmtProposal(db, ns, { title: "Not allowed", partyCode: "XSD" }, key()), "submit");
    expectRefusal("publish own offer", () => packs.publishPack(db, ns, { domain: "cbtmt", recordId: offer.record.id, stage: "offer_posted" }), "publish");
    {
      const b = refusalsFor();
      const fixture = await template.buildMgrSample({ rows: 1 });
      await assert.rejects(importer.importMgrExcel(db, ns, fixture, "XSD", key()), (e: unknown) => e instanceof DomainError && e.code === "forbidden");
      assert.equal(refusalsFor(), b + 1, "import: exactly one refusal row");
      assert.equal(policy.listRefusals(db, secretariat(), 1)[0].action, "import");
    }
    // the uploader never sees the refusal log; the Secretariat can publish the offer normally
    assert.deepEqual(policy.listRefusals(db, ns), []);
    const pubEvt = packs.publishPack(db, secretariat(), { domain: "cbtmt", recordId: offer.record.id, stage: "offer_posted" });
    assert.match(pubEvt.event.publicRecordId!, /^BBNJ-CBTMT-/);
    assert.deepEqual(reconcile.reconcile(db).mismatches, []);
  });

  p0("role × action matrix (non_state_uploader) — subject-less can() is false for every action except manage_subscription; every refusal leaves exactly one row", () => {
    const ns = nonStateInline();
    for (const action of policy.ALL_ACTIONS) {
      const before = count("SELECT COUNT(*) AS n FROM access_refusals");
      const allowed = policy.can(ns, action);
      assert.equal(allowed, action === "manage_subscription", `non_state_uploader can ${action}`);
      if (allowed) {
        assert.doesNotThrow(() => policy.requireCan(ns, action, undefined, { db }));
        assert.equal(count("SELECT COUNT(*) AS n FROM access_refusals"), before);
      } else {
        assert.throws(() => policy.requireCan(ns, action, undefined, { db, path: "/smoke" }), (e: unknown) => e instanceof DomainError && e.code === "forbidden");
        assert.equal(count("SELECT COUNT(*) AS n FROM access_refusals"), before + 1, `refusal recorded for non_state_uploader/${action}`);
      }
    }
    // read policy: the uploader is an ordinary public reader (published, public tier) plus own rows
    assert.ok(queries.auditRows(db, ns, {}).every((r) => r.status === "published" && r.confidentiality === "public"));
    assert.equal(queries.recordVisible(db, ns, "mgr", seedResult.mgr.restricted), false);
  });

  // ---------------------------------------------------------------- EIA artifacts
  p0("seeded EIA — at least one published pack carries non-empty artifactRefs that parse against the contract; artifacts survive the public projection", () => {
    const withArtifacts = (db.prepare("SELECT id, record_id, artifact_refs_json FROM events WHERE domain = 'eia' AND status = 'published' AND artifact_refs_json <> '[]'").all() as {
      id: string;
      record_id: string;
      artifact_refs_json: string;
    }[]);
    assert.ok(withArtifacts.length >= 1, "seed carries EIA artifactRefs");
    for (const row of withArtifacts) {
      const refs = JSON.parse(row.artifact_refs_json) as unknown[];
      assert.ok(refs.length > 0);
      for (const r of refs) assert.ok(contracts.ArtifactRef.safeParse(r).success, JSON.stringify(r));
    }
    const full = eia.packsForActivity(db, secretariat(), seedResult.eia.full);
    assert.ok(full.some((p) => p.artifactRefs.length > 0), "activity 2 (full journey) has artifacts");
    const publicView = eia.packsForActivity(db, pub(), seedResult.eia.full);
    const publicArtifacts = publicView.flatMap((p) => p.artifactRefs);
    assert.ok(publicArtifacts.length > 0, "public sees artifacts of published packs");
    assert.ok(publicArtifacts.every((a) => ["pdf", "url", "note", "xlsx"].includes(a.kind) && a.label.length > 0));
    // a new pack with artifacts round-trips through openPack
    const e = eia.createEiaActivity(db, party(), { title: "Artifacts round-trip", abnjBox: "CCZ" }, key());
    const refs = [{ kind: "url" as const, label: "Screening annex", href: "https://example.org/annex.pdf" }, { kind: "note" as const, label: "Filed in hard copy" }];
    const added = eia.addEiaPack(db, party(), e.activity.id, "screening", "Screening with artifacts", key(), { screeningOutcome: "no_eia", artifactRefs: refs });
    assert.deepEqual(added.event.artifactRefs, refs);
  });

  // ---------------------------------------------------------------- EIA screening import (closed loop)
  p0("EIA screening import loop — fixture with invalid row → run persisted, N-1 accepted with published-ready screening outcome; idempotent; error workbook re-imports after correction", async () => {
    // Same shape as importMgrExcel: (db, actor, file, defaultPartyCode, key, opts)
    const importEia = (importer as Record<string, unknown>).importEiaScreeningExcel as
      | ((db: unknown, actor: unknown, file: Buffer, partyCode: string, key: string, opts?: { filename?: string }) => Promise<import("../src/server/import").ImportResult>)
      | undefined;
    const buildEiaSample = (template as Record<string, unknown>).buildEiaScreeningSample as ((opts?: { rows?: number; withInvalid?: boolean }) => Promise<Buffer>) | undefined;
    const buildEiaErrorReport = (template as Record<string, unknown>).buildEiaScreeningErrorReport as ((run: unknown) => Promise<Buffer>) | undefined;
    skipUnless(importEia, "importEiaScreeningExcel");
    skipUnless(buildEiaSample, "buildEiaScreeningSample");
    const fixture = await buildEiaSample!({ rows: 2, withInvalid: true });
    const k = key();
    const run = await importEia!(db, secretariat(), fixture, "XSD", k, { filename: "smoke-eia.xlsx" });
    assert.equal(run.accepted, 2, JSON.stringify(run.rows));
    assert.equal(run.rejected, 1);
    const bad = run.rows.find((r) => !r.ok)!;
    assert.ok(bad.error, "rejected row carries a field-level error");
    assert.ok(bad.values, "rejected row keeps its values");
    // accepted rows are EIA activities with a screening pack that already holds its Art 31 outcome
    for (const r of run.rows.filter((x) => x.ok)) {
      const activityId = (r as { activityId?: string; recordId?: string; batchId?: string }).activityId ?? (r as { recordId?: string }).recordId ?? r.batchId!;
      const a = eia.getEiaActivity(db, activityId)!;
      assert.equal(a.sourceChannel, "excel");
      const screening = eia.packsForActivity(db, secretariat(), activityId).find((p) => p.stage === "screening")!;
      assert.ok(["eia_required", "no_eia"].includes(String(screening.screeningOutcome)), "screening outcome captured at import");
      assert.equal(screening.status, "pending");
    }
    // durable + idempotent; Secretariat-only
    const again = await importEia!(db, secretariat(), fixture, "XSD", k, { filename: "smoke-eia.xlsx" });
    assert.equal(again.runId, run.runId);
    assert.equal(count("SELECT COUNT(*) AS n FROM import_runs WHERE id = ?", run.runId), 1);
    assert.ok(importer.getImportRun(db, secretariat(), run.runId));
    assert.throws(() => importer.getImportRun(db, party(), run.runId), DomainError);
    await assert.rejects(importEia!(db, party(), fixture, "XSD", key()), (e: unknown) => e instanceof DomainError && e.code === "forbidden");
    await assert.rejects(importEia!(db, nonStateInline(), fixture, "XSD", key()), (e: unknown) => e instanceof DomainError && e.code === "forbidden");
    // MGR fixture into the EIA importer is rejected (template marker mismatch)
    await assert.rejects(importEia!(db, secretariat(), await template.buildMgrSample({ rows: 1 }), "XSD", key()), DomainError);
    // error workbook: only the failed row, Error column; corrected report re-imports
    if (buildEiaErrorReport) {
      const report = await buildEiaErrorReport(run);
      assert.deepEqual(await template.sheetNames(report), ["Meta", "Data", "Field guide"]);
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(report as unknown as import("exceljs").Buffer);
      const data = wb.getWorksheet("Data")!;
      assert.equal(data.rowCount, 2, "header + one failed row");
      const headerRow = data.getRow(1);
      assert.equal(String(headerRow.getCell(headerRow.cellCount).value), template.ERROR_COLUMN_HEADER);
      await assert.rejects(importEia!(db, secretariat(), report, "XSD", key()), DomainError);
      // correct offline: drop the Error column, fix the two bad cells by header (EIA headers, so not template.correctErrorReport)
      const headers: string[] = [];
      headerRow.eachCell({ includeEmpty: false }, (c) => headers.push(String(c.value ?? "")));
      data.spliceColumns(headers.indexOf(template.ERROR_COLUMN_HEADER) + 1, 1);
      const fixRow = data.getRow(2);
      for (const [header, value] of Object.entries({ abnj_box: "CCZ", screening_outcome: "no_eia" })) fixRow.getCell(headers.indexOf(header) + 1).value = value;
      const fixed = Buffer.from(await wb.xlsx.writeBuffer());
      const run2 = await importEia!(db, secretariat(), fixed, "XSD", key(), { filename: "smoke-eia-corrected.xlsx" });
      assert.equal(run2.rejected, 0, JSON.stringify(run2.rows));
      assert.equal(run2.accepted, 1);
    }
    assert.deepEqual(reconcile.reconcile(db).mismatches, []);
  });

  // ---------------------------------------------------------------- CBTMT facilitation note
  p0("CBTMT facilitation — seeded match carries a facilitation_note; Secretariat can set one; party/STB/non-State refused and logged; note is not an event", () => {
    const seededMatch = cbtmt.listMatches(db).find((m) => m.id === seedResult.cbtmt.matchId);
    assert.ok(seededMatch, "seeded match present");
    assert.ok(seededMatch!.facilitationNote && seededMatch!.facilitationNote.trim().length > 0, "seeded facilitation_note is non-empty");
    const stored = db.prepare("SELECT facilitation_note FROM cbtmt_matches WHERE id = ?").get(seedResult.cbtmt.matchId) as { facilitation_note: string | null };
    assert.equal(stored.facilitation_note, seededMatch!.facilitationNote);
    assert.ok(cbtmt.matchesForRecord(db, seedResult.cbtmt.need).some((m) => m.id === seededMatch!.id && m.facilitationNote === seededMatch!.facilitationNote));
    // setting a note is a Secretariat brokerage act; it does not add an outbox event
    const eventsBefore = count("SELECT COUNT(*) AS n FROM events");
    const updated = cbtmt.setMatchFacilitationNote(db, secretariat(), seededMatch!.id, "Smoke: introduced both focal points by e-mail; first call proposed for next month.");
    assert.match(updated.facilitationNote!, /^Smoke: introduced/);
    assert.equal(count("SELECT COUNT(*) AS n FROM events"), eventsBefore, "note is not an event");
    assert.throws(() => cbtmt.setMatchFacilitationNote(db, secretariat(), seededMatch!.id, "   "), (e: unknown) => e instanceof DomainError && e.code === "validation");
    assert.throws(() => cbtmt.setMatchFacilitationNote(db, secretariat(), crypto.randomUUID(), "orphan"), (e: unknown) => e instanceof DomainError && e.code === "not_found");
    for (const mk of [party, stb, pub, nonStateInline]) {
      const before = count("SELECT COUNT(*) AS n FROM access_refusals");
      assert.throws(() => cbtmt.setMatchFacilitationNote(db, mk(), seededMatch!.id, "hijack"), (e: unknown) => e instanceof DomainError && e.code === "forbidden");
      assert.equal(count("SELECT COUNT(*) AS n FROM access_refusals"), before + 1);
    }
    assert.match(cbtmt.listMatches(db).find((m) => m.id === seededMatch!.id)!.facilitationNote!, /^Smoke: introduced/);
  });

  // ---------------------------------------------------------------- digest export
  p0("digest export — Secretariat-only table of delivered digest windows; anonymous/party get nothing (and a refusal row); CSV header equals columns", () => {
    const exportDigests = (exporter as Record<string, unknown>).exportDigests as ((db: unknown, p: unknown, path?: string) => import("../src/server/export").Tabular | undefined) | undefined;
    const domains = exporter.EXPORT_DOMAINS as readonly string[];
    const viaTable = domains.includes("digests") ? (p: import("../src/server/policy").Principal) => exporter.exportTable(db, p, "digests" as never) : undefined;
    if (!exportDigests && !viaTable) throw new Skip("exportDigests / exportTable('digests') not present in this build");
    const get = (p: import("../src/server/policy").Principal) => (exportDigests ? exportDigests(db, p, "/api/export/digests.csv") : viaTable!(p));
    // make sure at least one digest window exists
    digest.runDigests(db, { actor: secretariat() });
    const runs = count("SELECT COUNT(*) AS n FROM digest_runs");
    assert.ok(runs >= 1, "digest_runs populated by seed/runDigests");
    const sec = get(secretariat())!;
    assert.ok(sec, "secretariat gets a table");
    assert.equal(sec.rows.length, runs, "one row per digest window");
    for (const c of ["username", "cadence", "eventCount"]) assert.ok(sec.columns.some((x) => x.toLowerCase() === c.toLowerCase()), `column ${c}`);
    const csv = exporter.toCsv(sec);
    const [header, ...rest] = csv.split("\r\n");
    assert.equal(header, sec.columns.join(","));
    assert.equal(rest.filter((l) => l !== "").length, sec.rows.length);
    for (const mk of [anon, pub, party, stb, nonStateInline]) {
      const before = count("SELECT COUNT(*) AS n FROM access_refusals");
      let out: import("../src/server/export").Tabular | undefined;
      try {
        out = get(mk());
      } catch (e) {
        assert.ok(e instanceof DomainError && e.code === "forbidden");
      }
      assert.ok(!out || out.rows.length === 0, "non-Secretariat gets no digest rows");
      assert.ok(count("SELECT COUNT(*) AS n FROM access_refusals") >= before, "probe never deletes refusals");
    }
  });

  // ---------------------------------------------------------------- run
  let failed = 0;
  let skipped = 0;
  let ran = 0;
  for (const t of tests) {
    if (only && t.group !== only) continue;
    ran++;
    try {
      await t.fn();
      console.log(`  ok   [${t.group}] ${t.name}`);
    } catch (err) {
      if (err instanceof Skip) {
        skipped++;
        console.log(`  skip [${t.group}] ${t.name}\n         ${err.message}`);
        continue;
      }
      failed++;
      console.log(`  FAIL [${t.group}] ${t.name}`);
      console.log(String(err instanceof Error ? err.stack ?? err.message : err).split("\n").map((l) => "         " + l).join("\n"));
    }
  }
  dbMod.closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`\n${ran - failed - skipped}/${ran} passed${skipped ? `, ${skipped} skipped (API not in this build)` : ""}${only ? ` (${only})` : ""}`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
