/**
 * db:seed            seed via domain functions (idempotent; rerun writes nothing)
 * db:seed --if-empty startup path: no-op unless the database is empty
 */
import { closeDb, getDb, resolveDbPath } from "../src/lib/db";
import { seedDatabase, seedIfEmpty } from "../src/server/seed";

const ifEmpty = process.argv.includes("--if-empty");
const db = getDb();
if (ifEmpty) {
  const r = seedIfEmpty(db);
  console.log(r.seeded ? `Seeded empty database at ${resolveDbPath()}` : `Database at ${resolveDbPath()} already has data — nothing done`);
} else {
  seedDatabase(db);
  console.log(`Seed applied (idempotent) at ${resolveDbPath()}`);
}
closeDb();
