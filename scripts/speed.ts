/**
 * speed.ts — the offline Excel loop timed under mocked connection profiles, as a CLI.
 *
 * Same matrix as /lab/speed: wire time is calculated from CONNECTION_PROFILES
 * (nominal kbps + RTT — an assumption, not a measurement); parse/validate time
 * is measured locally with a validate-only pass. Runs against a temporary
 * database and writes nothing to data/chm.sqlite.
 *
 *   npm run speed                 # print the matrix
 *   npm run speed -- --log        # also append the trials to data/speed-runs.jsonl
 *   npm run speed -- --profiles sids3g,office
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "chm-speed-"));
const realDbDir = path.dirname(process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "chm.sqlite"));
process.env.DATABASE_PATH = path.join(tmpDir, "speed.sqlite");
(process.env as Record<string, string | undefined>).NODE_ENV = "test";

const args = process.argv.slice(2);
const wantLog = args.includes("--log");
const profilesArg = args[args.indexOf("--profiles") + 1];

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
  const { SEED_USERS } = await import("../src/server/seed");
  const users = await import("../src/server/users");
  const policy = await import("../src/server/policy");
  const profiles = await import("../src/lib/connection-profiles");
  const lab = await import("../src/server/speed-lab");

  const db = dbMod.getDb();
  for (const u of SEED_USERS) users.upsertUser(db, u);
  const secretariat = policy.principalFor(users.findUserByUsername(db, "secretariat")!);

  const ids = profilesArg && args.includes("--profiles") ? profilesArg.split(",").map((s) => s.trim()).filter(profiles.isConnectionProfileId) : [...profiles.CONNECTION_PROFILE_IDS];
  if (ids.length === 0) throw new Error(`--profiles must name at least one of: ${profiles.CONNECTION_PROFILE_IDS.join(", ")}`);

  checkpoint("Profiles (mocked assumptions — not field measurements)", [
    ...ids.map((id) => {
      const c = profiles.connectionProfile(id);
      const k = (v: number | null) => (v === null ? "—" : `${v} kbps`);
      return `${id.padEnd(11)} ${c.label.padEnd(24)} down ${k(c.downKbps).padStart(11)}  up ${k(c.upKbps).padStart(11)}  rtt ${c.rttMs === null ? "—" : `${c.rttMs} ms`}`;
    }),
    "transferMs = rtt + bytes × 8 / bps · offline = 0",
  ]);

  const trials = await lab.runSpeedMatrix(secretariat, ids, { db });
  const importRuns = (db.prepare("SELECT COUNT(*) AS n FROM import_runs").get() as { n: number }).n;
  const events = (db.prepare("SELECT COUNT(*) AS n FROM events").get() as { n: number }).n;

  const w = Math.max(...profiles.CONNECTION_PROFILES.map((c) => c.label.length));
  const header = `${"operation".padEnd(70)} ${"bytes".padStart(7)}  ${ids.map((id) => profiles.connectionProfile(id).label.padStart(w)).join("  ")}`;
  const rows = lab.SPEED_OPERATIONS.map((op) => {
    const any = trials.find((t) => t.operation === op.id)!;
    const cells = ids.map((id) => profiles.fmtMs(trials.find((t) => t.operation === op.id && t.profileId === id)!.totalMs).padStart(w));
    const parse = op.parse ? ` (parse ${profiles.fmtMs(any.parseMs ?? 0)}, ${any.accepted} ok / ${any.rejected} rejected)` : "";
    return `${(op.label + parse).slice(0, 70).padEnd(70)} ${String(any.bytes).padStart(7)}  ${cells.join("  ")}`;
  });
  const totals = (["mgr", "eia"] as const).map(
    (d) => `${`Whole ${d.toUpperCase()} loop`.padEnd(70)} ${"".padStart(7)}  ${ids.map((id) => profiles.fmtMs(lab.loopTotalMs(trials, id, d)).padStart(w)).join("  ")}`,
  );
  checkpoint(`Closed loop × ${ids.length} profile(s) — ${trials.length} trials`, [header, ...rows, "", ...totals]);

  checkpoint("Desk untouched (validate-only pass)", [`import_runs = ${importRuns}, events = ${events} in the throwaway database`]);

  if (wantLog) {
    const file = path.join(realDbDir, "speed-runs.jsonl");
    lab.appendSpeedTrials(trials, file);
    checkpoint("Logged", [`${trials.length} lines appended to ${path.relative(process.cwd(), file)}`]);
  } else {
    checkpoint("Not logged", ["pass --log to append these trials to data/speed-runs.jsonl (what /lab/speed reads)"]);
  }

  console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
