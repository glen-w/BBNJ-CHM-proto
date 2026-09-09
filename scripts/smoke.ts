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
  const outbox = await import("../src/server/outbox");
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

  // ---------------------------------------------------------------- run
  let failed = 0;
  let ran = 0;
  for (const t of tests) {
    if (only && t.group !== only) continue;
    ran++;
    try {
      await t.fn();
      console.log(`  ok   [${t.group}] ${t.name}`);
    } catch (err) {
      failed++;
      console.log(`  FAIL [${t.group}] ${t.name}`);
      console.log(String(err instanceof Error ? err.stack ?? err.message : err).split("\n").map((l) => "         " + l).join("\n"));
    }
  }
  dbMod.closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`\n${ran - failed}/${ran} passed${only ? ` (${only})` : ""}`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
