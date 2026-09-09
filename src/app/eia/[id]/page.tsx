import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ChannelBadge, ConfidentialityBadge, Identifier, ProvenanceBadge, StageChip, TierNote } from "@/components/chips";
import { RecordExportLinks } from "@/components/export-links";
import { flashFrom } from "@/components/flash";
import { Field, KeyFields, SubmitButton, selectClass } from "@/components/forms";
import { PublishButton } from "@/components/publish-button";
import { Timeline } from "@/components/timeline";
import { TreatyCiteDrawer } from "@/components/treaty-cite-drawer";
import { Input } from "@/components/ui/input";
import { AmendForm, VersionHistory } from "@/components/version-history";
import { EiaPublishableStages } from "@/lib/contracts/events";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { citeCaption } from "@/lib/treatyCites";
import { cn } from "@/lib/utils";
import { addEiaPackAction, setEiaDueAtAction } from "@/server/actions";
import { EIA_STAGE_ORDER, getEiaActivity, packsForActivity } from "@/server/eia";
import { DEMO_COMMENT_WINDOW_DAYS } from "@/lib/contracts/extensions";
import { can } from "@/server/policy";
import { listEiaActivities, recordVisible, timelineOf } from "@/server/queries";
import { agreementBasisExtrasForTitle, provenanceBadgeForTitle } from "@/server/seed-pack";
import { getSessionUser } from "@/server/session";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function EiaActivityPage({ params, searchParams }: Props) {
  const { id } = await params;
  const flash = await flashFrom(searchParams);
  const p = await getSessionUser();
  const db = getDb();
  if (!recordVisible(db, p, "eia", id)) notFound();
  const activity = getEiaActivity(db, id);
  if (!activity) notFound();
  const packs = packsForActivity(db, p, id);
  const timeline = timelineOf(db, p, id);
  const owner = can(p, "submit", { ownerUserId: activity.ownerUserId ?? null });
  const here = `/eia/${id}`;
  const neighbours = listEiaActivities(db, p).filter((a) => a.abnjBox === activity.abnjBox && a.id !== id);
  const reached = EIA_STAGE_ORDER.indexOf(activity.currentStage);
  const latestByStage = new Map<string, (typeof packs)[number]>();
  for (const e of packs) if (!latestByStage.has(e.stage) || latestByStage.get(e.stage)!.version < e.version) latestByStage.set(e.stage, e);
  const amendable = Array.from(latestByStage.values())
    .filter((e) => e.status === "published" && e.stage !== "comments_stb")
    .map((e) => ({ stage: e.stage, version: e.version }));
  const basis = agreementBasisExtrasForTitle(activity.title);
  const provenance = provenanceBadgeForTitle(activity.title);

  return (
    <AppShell title={`EIA activity — ${activity.title}`} flash={flash}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/eia" className="text-sm underline">
            ← All activities
          </Link>
          <ConfidentialityBadge tier={activity.confidentiality} />
          <ChannelBadge channel={activity.sourceChannel} />
          {provenance ? <ProvenanceBadge badge={provenance} /> : null}
          <span className="text-xs text-muted-foreground">
            ABNJ box <strong>{activity.abnjBox}</strong> · Party <span className="font-mono">{activity.partyCode}</span>
          </span>
          <TreatyCiteDrawer domain="eia" stages={packs.map((e) => e.stage)} extras={basis.extras} footnotes={basis.footnotes} />
        </div>
        <RecordExportLinks publicRecordId={activity.publicRecordId} />
      </div>
      <TierNote tier={activity.confidentiality} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Identifier label="internalId" value={activity.id} caption="UUID at creation" />
        <Identifier label="receiptId (first pack)" value={packs.find((e) => e.receiptId)?.receiptId} caption="Issued when a pack entered pending" />
        <Identifier label="publicRecordId" value={activity.publicRecordId} caption="Minted at the first pack publish on this activity" />
        <Identifier
          label="dueAt (comment window)"
          value={activity.dueAt ? fmtDate(activity.dueAt) : undefined}
          mono={false}
          caption={activity.dueAt ? "Explicit due date set on the activity (demo value; the Agreement fixes no day count)" : `Not set — deadline rows default to ${DEMO_COMMENT_WINDOW_DAYS} days after a draft EIA is published (demo value)`}
        />
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Stage rail (latest stage cached on the record)</h2>
        <ol className="flex flex-wrap items-center gap-1 text-xs">
          {EIA_STAGE_ORDER.map((s, i) => (
            <li key={s} className="flex items-center gap-1">
              <span className={cn("rounded-md border px-2 py-1", i <= reached ? "border-institutional/50 bg-institutional/10 font-medium text-institutional" : "text-muted-foreground")} title={citeCaption("eia", s)}>
                {s.replace(/_/g, " ")}
              </span>
              {i < EIA_STAGE_ORDER.length - 1 ? <span className="text-muted-foreground">→</span> : null}
            </li>
          ))}
        </ol>
        <h3 className="mt-4 mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Packs — status lives here, and packs of different status coexist</h3>
        <ul className="space-y-2">
          {packs.length === 0 ? <li className="text-sm text-muted-foreground">No packs visible to your role.</li> : null}
          {packs.map((e) => (
            <li key={e.id} className="space-y-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StageChip stage={e.stage} status={e.status} version={e.version} />
                <span className="text-xs text-muted-foreground" title={citeCaption("eia", e.stage)}>
                  {e.summary}
                  {e.domain === "eia" && e.screeningOutcome ? <> · outcome <strong>{e.screeningOutcome.replace("_", " ")}</strong></> : null} · {fmtDate(e.at)}
                </span>
                {e.status === "pending" && can(p, "publish") ? <PublishButton domain="eia" recordId={id} stage={e.stage} version={e.version} returnTo={here} /> : null}
              </div>
              {e.artifactRefs.length > 0 ? (
                <ul className="ml-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" aria-label="Artefact references">
                  {e.artifactRefs.map((a, i) => (
                    <li key={`${e.id}-${i}`} className="inline-flex items-center gap-1">
                      <span className="rounded border border-line bg-muted px-1 text-[10px] uppercase tracking-wide text-muted-foreground">{a.kind}</span>
                      {a.href ? (
                        <a href={a.href} rel="noopener noreferrer" target="_blank" className="underline underline-offset-2 hover:text-institutional">
                          {a.label}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">{a.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">Artefacts are references (URL / PDF / note) carried on the pack row — the CHM stores metadata, never the documents themselves.</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {owner ? (
          <form action={addEiaPackAction} className="space-y-3 rounded-lg border p-4">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Submit a pack (pending)</h2>
            <KeyFields returnTo={here} />
            <input type="hidden" name="activityId" value={id} />
            <Field label="Pack stage" hint="Publishable stages only. A pending screening/draft on the same stage is upgraded in place; a published one gets a new version.">
              <select name="stage" className={selectClass} defaultValue={activity.currentStage === "screening" ? "screening" : "draft_eia"}>
                {EiaPublishableStages.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")} — {citeCaption("eia", s)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Screening outcome (screening packs only)" basis="Art 31">
              <select name="screeningOutcome" className={selectClass} defaultValue="">
                <option value="">— not a screening pack —</option>
                <option value="eia_required">EIA required</option>
                <option value="no_eia">no EIA</option>
              </select>
            </Field>
            <Field label="Summary" required>
              <Input name="summary" required placeholder="What this pack publishes" />
            </Field>
            <SubmitButton size="sm">Submit pack</SubmitButton>
          </form>
        ) : (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            {p.kind === "anonymous" ? (
              <>
                Public view: published packs only.{" "}
                <Link href={`/login?return=${here}`} className="underline">
                  Switch login
                </Link>
                .
              </>
            ) : (
              "Only the submitting Party or the Secretariat can add packs to this activity."
            )}
          </div>
        )}
        <div className="space-y-4">
          {owner ? (
            <form action={setEiaDueAtAction} className="space-y-3 rounded-lg border p-4">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Comment-window due date (P1)</h2>
              <p className="text-xs text-muted-foreground">
                Explicit <code>dueAt</code> on the activity; deadline notifications and digests read it. Leave empty and save to clear. Demo value — the
                Agreement fixes no day count.
              </p>
              <KeyFields returnTo={here} />
              <input type="hidden" name="activityId" value={id} />
              <div className="flex flex-wrap items-end gap-2">
                <Field label="Due date">
                  <Input type="date" name="dueAt" defaultValue={activity.dueAt ? activity.dueAt.slice(0, 10) : ""} className="w-44" />
                </Field>
                <SubmitButton size="sm" variant="outline">
                  Save due date
                </SubmitButton>
              </div>
            </form>
          ) : null}
          <div className="rounded-lg border p-4">
            <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-muted-foreground">Neighbourhood — same ABNJ box</h2>
            <p className="mb-2 text-xs text-muted-foreground">
              Other activities in <strong>{activity.abnjBox}</strong> visible to your role. A fixed demo vocabulary, not GIS: the box is the only spatial
              key in this build.
            </p>
            {neighbours.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                No other activities visible in this box. Cumulative-effects context (Art 30) would appear here as the box fills.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {neighbours.map((n) => (
                  <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                    <Link href={`/eia/${n.id}`} className="hover:underline">
                      {n.title}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {n.currentStage.replace(/_/g, " ")} · <span className="font-mono">{n.publicRecordId ?? "unpublished"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2" id="versions">
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Version history (per stage)</h2>
          <VersionHistory packs={packs} />
        </div>
        {owner ? <AmendForm domain="eia" recordId={id} stages={amendable} returnTo={here} /> : null}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Timeline</h2>
        <Timeline rows={timeline} />
      </section>
    </AppShell>
  );
}
