import { AppShell } from "@/components/app-shell";
import { ComparePanel } from "@/components/compare-panel";
import { buildCompareSections } from "@/lib/compare-rows";
import { getDb } from "@/lib/db";
import { findEventByKey } from "@/server/outbox";
import { can } from "@/server/policy";
import { getSessionUser } from "@/server/session";

export default async function ComparePage() {
  const p = await getSessionUser();
  const db = getDb();
  const rec = (key: string) => findEventByKey(db, `seed:${key}`)?.recordId;
  const sections = buildCompareSections({
    mgrA: rec("mgr-a"),
    mgrD: rec("mgr-d"),
    eia2: rec("eia-2"),
    eia3: rec("eia-3"),
    need: rec("cbtmt-need"),
    abmt: rec("abmt-1"),
    secretariat: can(p, "view_full_audit"),
  });

  return (
    <AppShell title="Interim DOALOS pages and this Clearing House">
      <ComparePanel sections={sections} />
    </AppShell>
  );
}
