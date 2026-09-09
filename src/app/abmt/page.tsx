import { AppShell } from "@/components/app-shell";

export default function AbmtPage() {
  return (
    <AppShell title="Area-based management tools (ABMT) — reserved">
      <div className="max-w-3xl space-y-3 rounded-lg border border-dashed p-5 text-sm">
        <p>
          <strong>Not in this build.</strong> The <code>abmt</code> domain is reserved in the locked contract (<code>Domain</code> enum,{" "}
          <code>AbmtEvent</code> with <code>proposal</code> → <code>consultation</code> → <code>decision</code> stages) so the Art 51.3(a)(ii)
          ABMT packages can ride the same receipt → pending → published pack machine later.
        </p>
        <p className="text-muted-foreground">
          Nothing here is stubbed with fake data: no ABMT records exist, the tab is disabled, and the subscription form shows the domain greyed out.
          The same identifiers would apply — a <code>publicRecordId</code> of the form <code>BBNJ-ABMT-YYYY-NNNNN</code> on first publish.
        </p>
      </div>
    </AppShell>
  );
}
