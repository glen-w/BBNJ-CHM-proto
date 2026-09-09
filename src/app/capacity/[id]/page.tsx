import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ConfidentialityBadge, Identifier, StageChip } from "@/components/chips";
import { flashFrom } from "@/components/flash";
import { PublishButton } from "@/components/publish-button";
import { Timeline } from "@/components/timeline";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { getCbtmtRecord, matchesForRecord } from "@/server/cbtmt";
import { can } from "@/server/policy";
import { packsOf, recordVisible, timelineOf } from "@/server/queries";
import { getSessionUser } from "@/server/session";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CbtmtRecordPage({ params, searchParams }: Props) {
  const { id } = await params;
  const flash = await flashFrom(searchParams);
  const p = await getSessionUser();
  const db = getDb();
  if (!recordVisible(db, p, "cbtmt", id)) notFound();
  const record = getCbtmtRecord(db, id);
  if (!record) notFound();
  const packs = packsOf(db, p, id);
  const timeline = timelineOf(db, p, id);
  const matches = matchesForRecord(db, id);
  const here = `/capacity/${id}`;

  return (
    <AppShell title={`CBTMT ${record.kind} — ${record.title}`} flash={flash}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/capacity" className="underline">
          ← Board
        </Link>
        <ConfidentialityBadge tier={record.confidentiality} />
        {record.kind === "need" ? <span className="font-mono text-xs">Party {record.partyCode}</span> : <span className="text-xs">{record.provider}</span>}
        {record.themes.map((t) => (
          <span key={t} className="rounded bg-muted px-1.5 text-xs">
            {t}
          </span>
        ))}
      </div>
      <section className="grid gap-3 sm:grid-cols-3">
        <Identifier label="internalId" value={record.id} caption="UUID at creation" />
        <Identifier label="receiptId" value={packs.find((e) => e.receiptId)?.receiptId} caption="Issued when the pack entered pending" />
        <Identifier label="publicRecordId" value={record.publicRecordId} caption="BBNJ-CBTMT-YYYY-NNNNN, minted at publish" />
      </section>
      <section className="rounded-lg border p-4">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">Packs</h2>
        <div className="flex flex-wrap gap-2">
          {packs.map((e) => (
            <div key={e.id} className="flex items-center gap-2">
              <StageChip stage={e.stage} status={e.status} version={e.version} />
              {e.status === "pending" && can(p, "publish") ? <PublishButton domain="cbtmt" recordId={id} stage={e.stage} version={e.version} returnTo={here} /> : null}
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-lg border p-4">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">Matches</h2>
        {matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No match rows for this record.</p>
        ) : (
          <ul className="text-sm">
            {matches.map((m) => (
              <li key={m.id} className="py-1">
                <Link href={`/capacity/${m.needId}`} className="hover:underline">
                  {m.needTitle}
                </Link>{" "}
                ↔{" "}
                <Link href={`/capacity/${m.offerId}`} className="hover:underline">
                  {m.offerTitle}
                </Link>{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  {m.rule} · {fmtDate(m.at)} · match {m.id.slice(0, 8)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Timeline</h2>
        <Timeline rows={timeline} />
      </section>
    </AppShell>
  );
}
