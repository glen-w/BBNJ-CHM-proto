import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ChannelBadge, ConfidentialityBadge, Identifier, StageChip } from "@/components/chips";
import { flashFrom } from "@/components/flash";
import { Field, KeyFields, SubmitButton, selectClass } from "@/components/forms";
import { MgrForm } from "@/components/mgr-form";
import { PublishButton } from "@/components/publish-button";
import { Timeline } from "@/components/timeline";
import { Input } from "@/components/ui/input";
import { getDb } from "@/lib/db";
import { FIELD_DEFS } from "@/lib/mgr-fields";
import { cn } from "@/lib/utils";
import { addMgrPackAction } from "@/server/actions";
import { getMgrBatch } from "@/server/mgr";
import { can, hasRole } from "@/server/policy";
import { packsOf, recordVisible, timelineOf } from "@/server/queries";
import { getSessionUser } from "@/server/session";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const STAGES = ["pre_collection", "batch_id_issued", "post_collection", "utilisation"] as const;

export default async function MgrBatchPage({ params, searchParams }: Props) {
  const { id } = await params;
  const flash = await flashFrom(searchParams);
  const p = await getSessionUser();
  const db = getDb();
  if (!recordVisible(db, p, "mgr", id)) notFound();
  const batch = getMgrBatch(db, id);
  if (!batch) notFound();
  const packs = packsOf(db, p, id);
  const timeline = timelineOf(db, p, id);
  const owner = can(p, "submit", { ownerUserId: batch.ownerUserId ?? null });
  const isDraft = batch.currentStage === "pre_collection" && !batch.bSbi;
  const here = `/mgr/${id}`;
  const reached = STAGES.indexOf(batch.currentStage);

  return (
    <AppShell title={`MGR batch — ${batch.title}`} flash={flash}>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/mgr" className="text-sm underline">
          ← All batches
        </Link>
        <ChannelBadge channel={batch.sourceChannel} />
        <ConfidentialityBadge tier={batch.confidentiality} />
        <span className="font-mono text-xs text-muted-foreground">Party {batch.partyCode}</span>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Identifier label="internalId" value={batch.id} caption="UUID at creation — never shown as a public identifier" />
        <Identifier label="receiptId" value={packs.find((e) => e.receiptId)?.receiptId} caption="Issued when the first pack entered pending" />
        <Identifier label="B-SBI (Art 12)" value={batch.bSbi} caption="Minted once, at valid pre-collection receipt — before any publish" />
        <Identifier label="publicRecordId" value={batch.publicRecordId} caption="Minted at the first pack publish on this record" />
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Stage rail (record) · pack chips (status)</h2>
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          {STAGES.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={cn("rounded-md border px-3 py-1.5", i <= reached ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{s.replace(/_/g, " ")}</span>
              {i < STAGES.length - 1 ? <span className="text-muted-foreground">→</span> : null}
            </li>
          ))}
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          {packs.length === 0 ? <span className="text-sm text-muted-foreground">No packs visible to your role.</span> : null}
          {packs.map((e) => (
            <div key={e.id} className="flex items-center gap-2">
              <StageChip stage={e.stage} status={e.status} version={e.version} />
              {e.status === "pending" && can(p, "publish") ? <PublishButton domain="mgr" recordId={id} stage={e.stage} version={e.version} returnTo={here} /> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Notification content (Art 12.2)</h2>
          <dl className="grid gap-2 text-sm">
            {FIELD_DEFS.map((f) => {
              const v =
                f.key === "title" ? batch.title : f.key === "locationHint" ? batch.locationHint : f.key === "tkFpicFlag" ? (batch.tkFpicFlag ? "yes" : "no") : f.key === "confidentiality" ? batch.confidentiality : batch.details[f.key];
              return (
                <div key={f.key} className="grid grid-cols-[1fr_2fr] gap-2 border-b pb-1 last:border-0">
                  <dt className="text-muted-foreground" title={f.basis}>
                    {f.label}
                  </dt>
                  <dd className={cn(!v && "italic text-muted-foreground")}>{v || "—"}</dd>
                </div>
              );
            })}
          </dl>
        </div>
        <div className="space-y-4">
          {isDraft && owner ? (
            <div className="rounded-lg border p-4">
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Edit draft / submit</h2>
              <MgrForm batch={batch} needsPartyCode={!hasRole(p, "party")} returnTo={here} />
            </div>
          ) : null}
          {!isDraft && owner ? (
            <form action={addMgrPackAction} className="space-y-3 rounded-lg border p-4">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Add a later pack to this batch</h2>
              <KeyFields returnTo={here} />
              <input type="hidden" name="batchId" value={id} />
              <Field label="Stage" hint="Post-collection (Art 12.5) or utilisation notification (Art 12.8). Version allocated server-side.">
                <select name="stage" className={selectClass} defaultValue="post_collection">
                  <option value="post_collection">post collection</option>
                  <option value="utilisation">utilisation</option>
                </select>
              </Field>
              <Field label="Summary" required>
                <Input name="summary" placeholder="e.g. 412 samples, 38 taxa; repository deposit pending" required />
              </Field>
              <SubmitButton size="sm">Submit pack (pending)</SubmitButton>
            </form>
          ) : null}
          {!owner && p.kind !== "user" ? (
            <p className="text-sm text-muted-foreground">
              Public view: only published packs are shown.{" "}
              <Link href={`/login?return=${here}`} className="underline">
                Switch login
              </Link>
              .
            </p>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Timeline (append-only outbox rows for this record)</h2>
        <Timeline rows={timeline} />
      </section>
    </AppShell>
  );
}
