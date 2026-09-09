import { AppShell } from "@/components/app-shell";

const rows = [
  ["Intake", "Informal / static pages", "Structured forms + offline template"],
  ["Identifiers", "No Art 12 B-SBI", "bSbi on valid pre-collection receipt"],
  ["Roles", "Limited", "Party / Secretariat / Public / STB"],
  ["Notify", "Ad hoc", "Outbox + subscriptions / digests"],
  ["Audit", "Unclear", "Append-only pack events"],
  ["EIA", "Documents as files", "Pack-level publish spine"],
] as const;

export default function ComparePage() {
  return (
    <AppShell title="DOALOS contrast (static content)">
      <div className="space-y-6">
        <p className="max-w-3xl text-muted-foreground">
          Interim DOALOS Cl-HM is largely static/informational. This prototype
          is transactional: structured intake, role-gated publish, Art 12 B-SBI
          on valid pre-collection receipt, pack-level EIA publications,
          subscriptions/digests, CBTMT match rows, append-only audit outbox.
        </p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-medium">Area</th>
                <th className="px-4 py-3 font-medium">Interim DOALOS</th>
                <th className="px-4 py-3 font-medium">This prototype</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([area, interim, prototype]) => (
                <tr key={area} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{area}</td>
                  <td className="px-4 py-3 text-muted-foreground">{interim}</td>
                  <td className="px-4 py-3">{prototype}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground italic">
          Static/informational → transactional workflow across Agreement areas —
          same rails, multiple journeys.
        </p>
      </div>
    </AppShell>
  );
}
