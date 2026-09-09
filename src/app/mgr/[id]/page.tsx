import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ChannelBadge, ConfidentialityBadge, Identifier, ProvenanceBadge, StageChip, TierNote } from "@/components/chips";
import { MintStepper } from "@/components/mint-stepper";
import { ProvenanceCaption } from "@/components/provenance-caption";
import { RecordExportLinks } from "@/components/export-links";
import { flashFrom } from "@/components/flash";
import { Field, KeyFields, SubmitButton, selectClass } from "@/components/forms";
import { MgrForm } from "@/components/mgr-form";
import { PublishButton } from "@/components/publish-button";
import { Timeline } from "@/components/timeline";
import { TreatyCiteDrawer } from "@/components/treaty-cite-drawer";
import { Input } from "@/components/ui/input";
import { AmendForm, VersionHistory } from "@/components/version-history";
import { getDb } from "@/lib/db";
import { FIELD_DEFS } from "@/lib/mgr-fields";
import { cn } from "@/lib/utils";
import { addMgrPackAction } from "@/server/actions";
import { getMgrBatch, MGR_AMENDABLE_STAGES } from "@/server/mgr";
import { can, hasRole } from "@/server/policy";
import { packsOf, recordVisible, timelineOf } from "@/server/queries";
import { provenanceBadgeForRecord } from "@/server/seed-pack";
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
  // Latest version per stage; a stage is amendable when its latest version is published.
  const latestByStage = new Map<string, (typeof packs)[number]>();
  for (const e of packs) if (!latestByStage.has(e.stage) || latestByStage.get(e.stage)!.version < e.version) latestByStage.set(e.stage, e);
  const amendable = MGR_AMENDABLE_STAGES.filter((s) => latestByStage.get(s)?.status === "published").map((s) => ({ stage: s, version: latestByStage.get(s)!.version }));
  const canAmend = can(p, "amend", { ownerUserId: batch.ownerUserId ?? null });
  const provenance = provenanceBadgeForRecord(db, id);

  return (
    <AppShell title={`MGR batch — ${batch.title}`} flash={flash}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/mgr" className="text-sm underline">
            ← All batches
          </Link>
          <ChannelBadge channel={batch.sourceChannel} />
          <ConfidentialityBadge tier={batch.confidentiality} />
          {provenance ? <ProvenanceBadge badge={provenance} /> : null}
          {batch.tkFpicFlag ? (
            <span className="rounded border px-1.5 text-[11px] uppercase" title="Art 13 — traditional knowledge / FPIC flag (metadata only; no TK content is stored)">
              TK / FPIC flag
            </span>
          ) : null}
          <span className="font-mono text-xs text-muted-foreground">Party {batch.partyCode}</span>
          <TreatyCiteDrawer domain="mgr" stages={packs.map((e) => e.stage)} />
        </div>
        <RecordExportLinks publicRecordId={batch.publicRecordId} />
      </div>
      <TierNote tier={batch.confidentiality} />
      {provenance ? <ProvenanceCaption badge={provenance} /> : null}

      <MintStepper
        domain="mgr"
        highlight={flash.minted}
        values={{
          internal: batch.id,
          receipt: packs.find((e) => e.receiptId)?.receiptId,
          bSbi: batch.bSbi,
          publicRecordId: batch.publicRecordId,
        }}
      />

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
              <span className={cn("rounded-md border px-3 py-1.5", i <= reached ? "border-institutional/50 bg-institutional/10 font-medium text-institutional" : "text-muted-foreground")}>{s.replace(/_/g, " ")}</span>
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
          {!isDraft && canAmend ? (
            <AmendForm domain="mgr" recordId={id} stages={amendable} returnTo={here}>
              {amendable.some((a) => a.stage === "pre_collection") ? (
                <details className="rounded-md border p-2 text-sm">
                  <summary className="cursor-pointer">Also edit Art 12.2 fields (pre-collection amendments only)</summary>
                  <p className="mt-1 text-xs text-muted-foreground">Tick to submit the edited values with the amendment; previous values are kept in the version history.</p>
                  <label className="mt-2 flex items-center gap-2">
                    <input type="checkbox" name="_withFields" value="1" className="size-4" /> Apply the field values below
                  </label>
                  <div className="mt-2 grid gap-2">
                    {FIELD_DEFS.filter((f) => f.kind !== "boolean" && f.key !== "confidentiality").map((f) => (
                      <Field key={f.key} label={f.label} basis={f.basis}>
                        <Input name={f.key} defaultValue={f.key === "title" ? batch.title : f.key === "locationHint" ? (batch.locationHint ?? "") : (batch.details[f.key] ?? "")} />
                      </Field>
                    ))}
                    <input type="hidden" name="confidentiality" value={batch.confidentiality} />
                    {batch.tkFpicFlag ? <input type="hidden" name="tkFpicFlag" value="on" /> : null}
                  </div>
                </details>
              ) : null}
            </AmendForm>
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

      {batch.tkFpicFlag || batch.tkProvenanceNote || batch.fpicStatusNote ? (
        <section className="rounded-lg border p-4" id="tk-fpic">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">Traditional knowledge / FPIC (Art 13) — metadata only</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            The CHM records that traditional knowledge is associated with this batch and how consent stands; it never stores the knowledge itself.
            Access to the knowledge is a matter for the holders concerned (Art 13), outside this system.
          </p>
          <dl className="grid gap-2 text-sm sm:grid-cols-[1fr_2fr]">
            <dt className="text-muted-foreground">TK / FPIC flag</dt>
            <dd>{batch.tkFpicFlag ? "yes — traditional knowledge associated with this batch" : "no"}</dd>
            <dt className="text-muted-foreground">Provenance note</dt>
            <dd className={cn(!batch.tkProvenanceNote && "italic text-muted-foreground")}>{batch.tkProvenanceNote ?? "not recorded"}</dd>
            <dt className="text-muted-foreground">FPIC status</dt>
            <dd className={cn(!batch.fpicStatusNote && "italic text-muted-foreground")}>{batch.fpicStatusNote ?? "not recorded"}</dd>
          </dl>
        </section>
      ) : null}

      <section className="rounded-lg border p-4" id="versions">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Version history (per stage; identifiers never change)</h2>
        <VersionHistory packs={packs} />
        {batch.detailsHistory.length > 0 && can(p, "view_full_audit") ? (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-muted-foreground">Superseded Art 12.2 values ({batch.detailsHistory.length}) — Secretariat projection</summary>
            <ul className="mt-2 space-y-2 text-xs">
              {batch.detailsHistory.map((h) => (
                <li key={`${h.version}-${h.at}`} className="rounded-md border p-2">
                  <div className="mb-1 font-medium">
                    pre-collection v{h.version} · superseded {h.at.slice(0, 16).replace("T", " ")}Z
                  </div>
                  <dl className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
                    {Object.entries(h.values).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="truncate">{v || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Timeline</h2>
        <Timeline rows={timeline} />
      </section>
    </AppShell>
  );
}
