/** replay-outbox — re-run dispatch over every published event. Consistent DB → zero inserts. */
import { closeDb, getDb } from "../src/lib/db";
import { replayOutbox } from "../src/server/notify";

const r = replayOutbox(getDb());
closeDb();
console.log(`Replayed ${r.events} published events: ${r.inserted} new notifications, ${r.errors} errors`);
