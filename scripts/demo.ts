/**
 * demo.ts — the unattended 10-minute demo path, as code.
 *
 * Runs the DEMO-SCRIPT.md journey end to end against a temporary database,
 * printing a narrated checkpoint per step and asserting the observable claims.
 * Never touches data/chm.sqlite.
 *
 *   npm run demo                         # domain-level walkthrough (no server needed)
 *   BASE_URL=http://localhost:3000 npm run demo
 *                                        # additionally fetches pages/exports with each demo
 *                                        # cookie against a running server and asserts status codes
 *                                        # (the server's own database is not modified)
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "chm-demo-"));
process.env.DATABASE_PATH = path.join(tmpDir, "demo.sqlite");
(process.env as Record<string, string | undefined>).NODE_ENV = "test";
process.env.SANDBOX_RESET = "1";

const t0 = Date.now();
let step = 0;
function checkpoint(title: string, lines: string[] = []) {
  step++;
  const s = ((Date.now() - t0) / 1000).toFixed(1).padStart(5);
  console.log(`\n[${s}s] ${String(step).padStart(2, "0")}. ${title}`);
  for (const l of lines) console.log(`         ${l}`);
}

async function main() {
  const dbMod = await import("../src/lib/db");
  const { seedDatabase } = await import("../src/server/seed");
  const policy = await import("../src/server/policy");
  const users = await import("../src/server/users");
  const mgr = await import("../src/server/mgr");
  const eia = await import("../src/server/eia");
  const cbtmt = await import("../src/server/cbtmt");
  const packs = await import("../src/server/packs");
  const queries = await import("../src/server/queries");
  const digest = await import("../src/server/digest");
  const importer = await import("../src/server/import");
  const template = await import("../src/server/template");
  const exporter = await import("../src/server/export");
  const notify = await import("../src/server/notify");
  const reconcile = await import("../src/server/reconcile");
  const resetMod = await import("../src/server/reset");
  const { DomainError } = await import("../src/server/errors");

  const db = dbMod.getDb();
  const seeded = seedDatabase(db);
  const P = (username: string) => policy.principalFor(users.findUserByUsername(db, username)!);
  const party = P("party.nfp");
  const secretariat = P("secretariat");
  const stb = P("stb");
  const pub = P("public");
  const anon = policy.anonymous();
  const count = (sql: string, ...params: unknown[]) => (db.prepare(sql).get(...params) as { n: number }).n;
  const key = () => crypto.randomUUID();

  checkpoint("Sandbox seeded through the domain functions (same code path as the UI)", [
    `users=${count("SELECT COUNT(*) AS n FROM users")} events=${count("SELECT COUNT(*) AS n FROM events")} notifications=${count("SELECT COUNT(*) AS n FROM notifications")}`,
    `digest rows delivered by the runner at seed: ${count("SELECT COUNT(*) AS n FROM digest_runs")}`,
  ]);

  // 1. Home as the public
  const rails = queries.railCounts(db, anon);
  checkpoint("Public home — functions-first rails; counts are policy-filtered", [`submit=${rails.submit} manage=${rails.manage} publish=${rails.publish} audit=${rails.audit}`]);
  assert.equal(rails.manage, 0, "public sees no pending packs");
  assert.equal(queries.recordVisible(db, anon, "mgr", seeded.mgr.restricted), false, "restricted batch invisible to public");

  // 2. Party submits a pre-collection notification → B-SBI before publish
  const draft = mgr.saveMgrDraft(db, party, { title: "Demo cruise LIVE-01", locationHint: "CCZ", objectives: "Live demo", tkFpicFlag: false }, key());
  assert.equal(draft.batch.bSbi, undefined);
  const received = mgr.submitPreCollection(db, party, draft.batch.id, { methodMeans: "RV Demo; ROV", expectedDates: "2027-05", sponsoringInstitution: "Demo Inst", dataManagementPlan: "https://example.org/dmp" }, key());
  checkpoint("Party: draft → submit → valid receipt mints the B-SBI while publicRecordId is still null", [
    `bSbi=${received.batch.bSbi}  receiptId=${received.event.receiptId}  publicRecordId=${received.batch.publicRecordId ?? "null"}`,
  ]);
  assert.match(received.batch.bSbi!, /^BSBI-/);
  assert.equal(received.batch.publicRecordId, undefined);

  // 3. Party tries to publish → refused and logged
  const refusalsBefore = count("SELECT COUNT(*) AS n FROM access_refusals");
  assert.throws(() => packs.publishPack(db, party, { domain: "mgr", recordId: received.batch.id, stage: "pre_collection" }), (e: unknown) => e instanceof DomainError && e.code === "forbidden");
  assert.equal(count("SELECT COUNT(*) AS n FROM access_refusals"), refusalsBefore + 1);
  checkpoint("Party clicks Publish → forbidden; one append-only refusal row (Secretariat projection only)", [policy.listRefusals(db, secretariat, 1)[0].reason]);

  // 4. Secretariat publishes → publicRecordId, bSbi unchanged, notifications
  const published = packs.publishPack(db, secretariat, { domain: "mgr", recordId: received.batch.id, stage: "pre_collection" });
  const b = mgr.getMgrBatch(db, received.batch.id)!;
  assert.equal(b.bSbi, received.batch.bSbi);
  assert.match(b.publicRecordId!, /^BBNJ-MGR-/);
  const ownerBell = count("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND event_id = ?", party.kind === "user" ? party.user.id : "", published.event.id);
  checkpoint("Secretariat publishes → publicRecordId minted, B-SBI unchanged, owner notified immediately", [
    `publicRecordId=${b.publicRecordId}  bSbi=${b.bSbi}  ownerNotifications=${ownerBell}`,
    `stable URL: /records/${b.publicRecordId}`,
  ]);
  assert.equal(ownerBell, 1);
  assert.ok(queries.resolvePublicRecord(db, anon, b.publicRecordId!));

  // 5. Offline loop
  const fixture = await template.buildMgrSample({ rows: 2, withInvalid: true });
  const run = await importer.importMgrExcel(db, secretariat, fixture, "XSD", key(), { filename: "fixture.xlsx" });
  const report = await template.buildMgrErrorReport(run);
  const fixed = await template.correctErrorReport(report, { objectives: "Corrected offline", confidentiality: "public" });
  const run2 = await importer.importMgrExcel(db, secretariat, fixed, "XSD", key(), { filename: "fixture-corrected.xlsx" });
  checkpoint("SIDS closed loop: template → import (2 ok, 1 rejected) → error workbook → corrected → re-import (1 ok)", [
    `run ${run.runId.slice(0, 8)}: accepted=${run.accepted} rejected=${run.rejected} → ${run.rows.find((r) => !r.ok)?.error}`,
    `run ${run2.runId.slice(0, 8)}: accepted=${run2.accepted} rejected=${run2.rejected}`,
  ]);
  assert.equal(run.rejected, 1);
  assert.equal(run2.rejected, 0);

  // 6. EIA + STB
  const e2 = eia.getEiaActivity(db, seeded.eia.full)!;
  const queueBefore = eia.stbQueue(db, stb).length;
  const comment = eia.commentStb(db, stb, e2.id, "STB: adequate baseline; request sediment plume monitoring.", key());
  checkpoint("STB queue → consolidated comments pack published; queue shrinks", [`queue ${queueBefore} → ${eia.stbQueue(db, stb).length}; comments_stb v${comment.event.version} ${comment.event.status}`]);
  assert.equal(eia.stbQueue(db, stb).length, queueBefore - 1);

  // 7. Versioning + material change
  const a = mgr.getMgrBatch(db, seeded.mgr.published)!;
  const v2 = packs.publishPack(db, secretariat, { domain: "mgr", recordId: a.id, stage: "post_collection" });
  assert.equal(v2.event.version, 2);
  assert.equal(v2.event.materialChange, true);
  const v2Bells = count("SELECT COUNT(*) AS n FROM notifications WHERE event_id = ?", v2.event.id);
  checkpoint("Versioning: seeded post-collection v2 (material) published → earlier readers re-notified; ids unchanged", [
    `summary: ${v2.event.summary}`,
    `changeNote: ${v2.event.changeNote}  notifications for v2: ${v2Bells}`,
    `publicRecordId still ${mgr.getMgrBatch(db, a.id)!.publicRecordId}; bSbi still ${mgr.getMgrBatch(db, a.id)!.bSbi}`,
  ]);
  assert.ok(v2Bells >= 1);
  assert.equal(mgr.getMgrBatch(db, a.id)!.publicRecordId, a.publicRecordId);

  // 8. CBTMT match
  const match = cbtmt.suggestMatches(db, secretariat, key());
  checkpoint("CBTMT shared-theme rule → match rows + match_suggested events (existing pairs ignored)", [`${match.filter((m) => m.created).length} new, ${match.filter((m) => !m.created).length} existing`]);

  // 9. Digest
  const dg = digest.runDigests(db, { actor: secretariat });
  checkpoint("Digest run — held publications rolled up per daily/weekly subscriber; second run inserts nothing", [
    ...dg.users.map((u) => `${u.username} ${u.cadence}: ${u.inserted ? `digest of ${u.eventCount}` : (u.skipped ?? "—")}`),
  ]);
  assert.equal(digest.runDigests(db, { actor: secretariat }).inserted, 0);

  // 10. Exports + tiers
  const csvPublic = exporter.toCsv(exporter.exportTable(db, anon, "mgr"));
  const csvSec = exporter.toCsv(exporter.exportTable(db, secretariat, "mgr"));
  const pdf = exporter.recordPdf(db, anon, b.publicRecordId!)!;
  checkpoint("Exports — CSV/JSON/PDF are policy-filtered like the pages", [
    `mgr.csv rows: public=${csvPublic.split("\r\n").length - 2} secretariat=${csvSec.split("\r\n").length - 2}`,
    `pdf bytes=${pdf.length} header=${pdf.subarray(0, 8).toString()}`,
  ]);
  assert.ok(csvSec.split("\r\n").length > csvPublic.split("\r\n").length);
  assert.equal(queries.recordVisible(db, stb, "mgr", seeded.mgr.confidential), false);
  assert.equal(queries.recordVisible(db, pub, "eia", seeded.eia.restricted), false);

  // 11. Invariants
  const mism = reconcile.reconcile(db).mismatches;
  const replay = notify.replayOutbox(db).inserted;
  checkpoint("Invariants — reconcile clean, replay-outbox inserts nothing", [`mismatches=${mism.length} replayInserted=${replay}`]);
  assert.deepEqual(mism, []);
  assert.equal(replay, 0);

  // 12. Reset
  const r = resetMod.resetSandbox(secretariat);
  const fresh = dbMod.getDb();
  checkpoint("Reset database (SANDBOX_RESET=1) — files removed, schema recreated, re-seeded", [
    `removed ${r.removed.length} file(s); events after reset=${(fresh.prepare("SELECT COUNT(*) AS n FROM events").get() as { n: number }).n}`,
  ]);
  assert.equal((fresh.prepare("SELECT COUNT(*) AS n FROM access_refusals").get() as { n: number }).n, 0);

  // Optional HTTP pass against a running server.
  const base = process.env.BASE_URL;
  if (base) {
    console.log(`\nHTTP checks against ${base}`);
    const serverDb = dbMod.openDatabase(process.env.SERVER_DATABASE_PATH ?? path.resolve("data/chm.sqlite"));
    const uid = (username: string) => (serverDb.prepare("SELECT id FROM users WHERE username = ?").get(username) as { id: string } | undefined)?.id;
    const cookie = (username?: string): Record<string, string> => (username && uid(username) ? { Cookie: `chm_demo_user=${uid(username)}` } : {});
    const get = async (p: string, as?: string) => {
      const res = await fetch(base + p, { headers: cookie(as), redirect: "manual" });
      return res;
    };
    const expect = async (p: string, as: string | undefined, status: number | number[], contains?: RegExp) => {
      const res = await get(p, as);
      const ok = Array.isArray(status) ? status.includes(res.status) : res.status === status;
      const body = contains ? await res.text() : "";
      const hit = contains ? contains.test(body) : true;
      console.log(`  ${ok && hit ? "ok  " : "FAIL"} ${String(res.status).padEnd(3)} ${(as ?? "anonymous").padEnd(12)} ${p}${contains && !hit ? `  (missing ${contains})` : ""}`);
      assert.ok(ok, `${p} as ${as ?? "anonymous"} → ${res.status}`);
      assert.ok(hit, `${p} body`);
      return res;
    };
    const prid = (serverDb.prepare("SELECT public_record_id FROM mgr_batches WHERE public_record_id IS NOT NULL AND confidentiality = 'public' ORDER BY public_record_id LIMIT 1").get() as { public_record_id: string } | undefined)?.public_record_id;
    const restricted = (serverDb.prepare("SELECT public_record_id FROM mgr_batches WHERE confidentiality = 'restricted' AND public_record_id IS NOT NULL LIMIT 1").get() as { public_record_id: string } | undefined)?.public_record_id;
    await expect("/", undefined, 200, /Clearing-House Mechanism/);
    await expect("/compare", undefined, 200, /Receipt, management and storage/);
    await expect("/compare", "secretariat", 200, /Refusal log/);
    await expect("/audit", "secretariat", 200, /Refusal log/);
    await expect("/audit", undefined, 200, /public projection/);
    await expect("/mgr/import", undefined, 200, /Secretariat function/);
    await expect("/mgr/import", "secretariat", 200, /Recent import runs/);
    await expect("/notifications", "secretariat", 200, /Run digest now/);
    await expect("/api/export/mgr.csv", undefined, 200, /^publicRecordId,bSbi,title/);
    await expect("/api/export/audit.json", "secretariat", 200, /"schemaVersion"/);
    await expect("/api/export/nope.csv", undefined, 404);
    if (prid) {
      await expect(`/records/${prid}`, undefined, [307, 308]);
      await expect(`/api/records/${prid}.json`, undefined, 200, /"publicRecordId"/);
      const pdfRes = await expect(`/api/records/${prid}.pdf`, undefined, 200);
      assert.equal(pdfRes.headers.get("content-type"), "application/pdf");
    }
    if (restricted) {
      await expect(`/api/records/${restricted}.json`, undefined, 404);
      await expect(`/api/records/${restricted}.json`, "secretariat", 200);
    }
    await expect("/api/health", undefined, 200);
    serverDb.close();
  }

  dbMod.closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`\nDemo path complete in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${step} checkpoints.`);
}

main().catch((e) => {
  console.error("\nDEMO FAILED:", e);
  process.exit(1);
});
