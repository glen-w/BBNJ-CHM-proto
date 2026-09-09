/** db:check — reconcile caches against the outbox and verify the contract copy. */
import { contractsIdentical } from "./contracts-check";
import { closeDb, getDb } from "../src/lib/db";
import { reconcile } from "../src/server/reconcile";

const c = contractsIdentical();
console.log(c.ok ? `OK  ${c.message}` : `FAIL ${c.message}`);
const r = reconcile(getDb());
closeDb();
if (r.mismatches.length) {
  console.log(`FAIL reconcile: ${r.mismatches.length} mismatch(es) over ${r.checked} records`);
  for (const m of r.mismatches) console.log(`  ${m.table}/${m.id}.${m.column}: stored=${String(m.stored)} derived=${String(m.derived)}`);
} else {
  console.log(`OK  reconcile: ${r.checked} records consistent with the outbox`);
}
process.exit(c.ok && r.mismatches.length === 0 ? 0 : 1);
