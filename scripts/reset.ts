/**
 * db:reset [--force] — development/tests only. Deletes the database file,
 * recreates the schema and seeds. Refused under NODE_ENV=production without --force.
 */
import { closeDb, getDb, resolveDbPath } from "../src/lib/db";
import { assertResetAllowed, deleteDatabaseFiles } from "../src/server/reset";
import { seedDatabase } from "../src/server/seed";

assertResetAllowed({ nodeEnv: process.env.NODE_ENV, force: process.argv.includes("--force") });
const dbPath = resolveDbPath();
const removed = deleteDatabaseFiles(dbPath);
console.log(removed.length ? `Removed ${removed.join(", ")}` : `No database at ${dbPath}`);
const db = getDb();
seedDatabase(db);
closeDb();
console.log(`Recreated and seeded ${dbPath}`);
