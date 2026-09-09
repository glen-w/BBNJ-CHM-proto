import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DomainBadge } from "@/components/chips";
import { flashFrom } from "@/components/flash";
import { KeyFields, SubmitButton } from "@/components/forms";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CONNECTION_PROFILES, fmtMs, type ConnectionProfileId } from "@/lib/connection-profiles";
import { fmtDate } from "@/lib/format";
import { runSpeedTrialAction } from "@/server/actions";
import { can, recordRefusal } from "@/server/policy";
import { getSessionUser } from "@/server/session";
import { loopTotalMs, readSpeedTrials, SPEED_OPERATIONS, type SpeedTrial } from "@/server/speed-lab";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const kbps = (v: number | null) => (v === null ? "—" : v >= 1000 ? `${v / 1000} Mbps` : `${v} kbps`);
const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

export default async function SpeedLabPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const p = await getSessionUser();

  if (!can(p, "import")) {
    recordRefusal(p, "import", { path: "/lab/speed", reason: "Speed lab requested without the import permission" });
    return (
      <AppShell title="Speed lab — offline loop on mocked connections" flash={flash}>
        <p className="text-sm">
          The speed lab sits beside the Secretariat import function. This visit was recorded in the refusal log.{" "}
          <Link href="/login?return=/lab/speed" className="underline">
            Switch login
          </Link>
          .
        </p>
      </AppShell>
    );
  }

  const recent = readSpeedTrials(120);
  // The newest batch shares one `at`; render it as a profiles × operations matrix.
  const latestAt = recent[0]?.at;
  const latest = latestAt ? recent.filter((t) => t.at === latestAt) : [];
  const latestProfiles = CONNECTION_PROFILES.filter((c) => latest.some((t) => t.profileId === c.id));
  const cell = (op: string, profile: ConnectionProfileId): SpeedTrial | undefined => latest.find((t) => t.operation === op && t.profileId === profile);

  return (
    <AppShell title="Speed lab — offline loop on mocked connections (Secretariat)" flash={flash}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-institutional bg-transparent font-normal text-institutional">
          Lab — mocked transfer, not a field measurement
        </Badge>
        <Badge variant="outline" className="border-transparent bg-muted/70 font-normal text-muted-foreground">
          Writes nothing to the desk
        </Badge>
      </div>

      <p className="max-w-3xl text-sm text-muted-foreground">
        How the Art 51.5 closed loop — download template → fill offline → upload → download the error workbook — would <em>feel</em> on
        different links. Wire time is <strong>calculated</strong> from the nominal bandwidth and round-trip time of each profile below
        (<code>rtt + bytes × 8 / bps</code>). Parse and validation time is <strong>measured</strong> here, on this server, with a validate-only
        pass over the bundled samples: no batches, no B-SBIs, no import run is created. Nothing throttles a real socket.
      </p>

      <section className="rounded-lg border">
        <h2 className="border-b px-4 py-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">Connection profiles (assumptions)</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profile</TableHead>
              <TableHead>Down</TableHead>
              <TableHead>Up</TableHead>
              <TableHead>RTT</TableHead>
              <TableHead>Why it is here</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CONNECTION_PROFILES.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-xs">
                  {c.label} <span className="font-mono text-muted-foreground">{c.id}</span>
                </TableCell>
                <TableCell className="text-xs">{kbps(c.downKbps)}</TableCell>
                <TableCell className="text-xs">{kbps(c.upKbps)}</TableCell>
                <TableCell className="text-xs">{c.rttMs === null ? "—" : `${c.rttMs} ms`}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{c.use}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <form action={runSpeedTrialAction} className="grid gap-3 rounded-lg border p-4">
        <KeyFields returnTo="/lab/speed" />
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Profiles to run</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {CONNECTION_PROFILES.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="profile" value={c.id} defaultChecked className="size-4" />
                {c.label}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Every ticked profile runs all {SPEED_OPERATIONS.length} operations against the same payload bytes. Untick all = all.</p>
        </fieldset>
        <div>
          <SubmitButton>Run the loop</SubmitButton>
        </div>
      </form>

      <section className="rounded-lg border">
        <h2 className="border-b px-4 py-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Latest run{latestAt ? ` — ${fmtDate(latestAt)}` : ""}
        </h2>
        {latest.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No trials yet. Run the loop above, or <code>npm run speed</code> from a terminal.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operation</TableHead>
                  <TableHead>Payload</TableHead>
                  {latestProfiles.map((c) => (
                    <TableHead key={c.id}>{c.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {SPEED_OPERATIONS.map((op) => {
                  const sample = latest.find((t) => t.operation === op.id);
                  return (
                    <TableRow key={op.id}>
                      <TableCell className="text-xs">
                        <span className="flex items-center gap-2">
                          <DomainBadge domain={op.domain} />
                          {op.label}
                        </span>
                        {op.parse && sample?.accepted !== null && sample?.accepted !== undefined ? (
                          <span className="mt-1 block text-muted-foreground">
                            validate-only: {sample.accepted} accepted · {sample.rejected} rejected · parse {fmtMs(sample.parseMs ?? 0)}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{sample ? kb(sample.bytes) : "—"}</TableCell>
                      {latestProfiles.map((c) => {
                        const t = cell(op.id, c.id);
                        return (
                          <TableCell key={c.id} className="whitespace-nowrap text-xs">
                            {t ? (
                              <>
                                <span className="font-medium">{fmtMs(t.totalMs)}</span>
                                {t.parseMs !== null ? <span className="text-muted-foreground"> (wire {fmtMs(t.transferMs)})</span> : null}
                              </>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
                {(["mgr", "eia"] as const).map((d) => (
                  <TableRow key={`total-${d}`} className="bg-muted/40">
                    <TableCell className="text-xs font-medium">
                      <span className="flex items-center gap-2">
                        <DomainBadge domain={d} />
                        Whole loop
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">—</TableCell>
                    {latestProfiles.map((c) => (
                      <TableCell key={c.id} className="whitespace-nowrap text-xs font-medium">
                        {fmtMs(loopTotalMs(latest, c.id, d))}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="rounded-lg border">
        <h2 className="border-b px-4 py-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">Trial log (newest first)</h2>
        {recent.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Empty.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Bytes</TableHead>
                <TableHead>Wire (mocked)</TableHead>
                <TableHead>Parse (measured)</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.slice(0, 30).map((t, i) => (
                <TableRow key={`${t.at}-${t.operation}-${t.profileId}-${i}`}>
                  <TableCell className="whitespace-nowrap text-xs">{fmtDate(t.at)}</TableCell>
                  <TableCell className="font-mono text-xs">{t.operation}</TableCell>
                  <TableCell className="font-mono text-xs">{t.profileId}</TableCell>
                  <TableCell className="text-xs">{t.bytes}</TableCell>
                  <TableCell className="text-xs">{fmtMs(t.transferMs)}</TableCell>
                  <TableCell className="text-xs">{t.parseMs === null ? "—" : fmtMs(t.parseMs)}</TableCell>
                  <TableCell className="text-xs">{fmtMs(t.totalMs)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          {recent.length} recent trial{recent.length === 1 ? "" : "s"} shown from <code>data/speed-runs.jsonl</code> (not the audit log).{" "}
          <a href="/api/lab/speed-runs.jsonl" className="underline">
            Download the log (.jsonl)
          </a>
          {" · "}
          <Link href="/compare" className="underline">
            Back to the comparison
          </Link>
        </p>
      </section>
    </AppShell>
  );
}
