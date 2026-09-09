import { AppShell } from "@/components/app-shell";

export default function AbmtPage() {
  return (
    <AppShell title="Area-based management tools (ABMT)">
      <div className="max-w-3xl space-y-3 rounded-lg border border-dashed p-5 text-sm leading-relaxed">
        <h1 className="text-lg font-semibold tracking-tight">ABMT is not available</h1>
        <p>
          Packages under Art 51.3(a)(ii) will use the same receipt → pending → published flow as other domains.
        </p>
        <p className="text-muted-foreground">
          No ABMT records are present. On first publish, a public record id would take the form <code>BBNJ-ABMT-YYYY-NNNNN</code>.
        </p>
      </div>
    </AppShell>
  );
}
