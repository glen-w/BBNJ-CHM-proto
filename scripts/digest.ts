/**
 * digest [--cadence daily|weekly] [--only-due]
 * Rolls held publications into one digest notification per daily/weekly
 * subscriber. Idempotent: run it as often as you like (cron, demo button).
 */
import { closeDb, getDb } from "../src/lib/db";
import { runDigests, type DigestCadence } from "../src/server/digest";

const args = process.argv.slice(2);
const cadenceIdx = args.indexOf("--cadence");
const cadence = cadenceIdx >= 0 ? (args[cadenceIdx + 1] as DigestCadence) : undefined;
if (cadence && cadence !== "daily" && cadence !== "weekly") {
  console.error("--cadence must be daily or weekly");
  process.exit(2);
}
const db = getDb();
const r = runDigests(db, { cadence, onlyDue: args.includes("--only-due") });
for (const u of r.users) {
  console.log(`  ${u.inserted ? "sent " : "skip "} ${u.username.padEnd(14)} ${u.cadence.padEnd(6)} events=${u.eventCount}${u.skipped ? ` (${u.skipped})` : ""}`);
}
console.log(`${r.inserted} digest(s) delivered at ${r.at}`);
closeDb();
