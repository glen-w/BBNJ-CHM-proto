import { StatusChip } from "@/components/chips";
import { Field, KeyFields, SubmitButton, selectClass } from "@/components/forms";
import { Input } from "@/components/ui/input";
import type { StoredEvent } from "@/lib/contracts/extensions";
import { fmtDate, stageLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { amendAction } from "@/server/actions";

/**
 * Version history of the packs visible to the reader, grouped by stage.
 * Every version is its own outbox chain; v>1 carries the change note and the
 * material flag. Identifiers never change across versions.
 */
export function VersionHistory({ packs }: { packs: StoredEvent[] }) {
  const byStage = new Map<string, StoredEvent[]>();
  for (const e of packs) byStage.set(e.stage, [...(byStage.get(e.stage) ?? []), e]);
  const stages = Array.from(byStage.entries()).filter(([, list]) => list.length > 0);
  if (stages.length === 0) return <p className="text-sm text-muted-foreground">No versions visible to your role.</p>;
  return (
    <div className="space-y-3">
      {stages.map(([stage, list]) => (
        <div key={stage} id={`versions-${stage}`} className="rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{stageLabel(stage)}</span>
            <span className="text-xs text-muted-foreground">
              {list.length} version{list.length === 1 ? "" : "s"}
            </span>
          </div>
          <ol className="space-y-1.5 text-sm">
            {list
              .slice()
              .sort((a, b) => a.version - b.version)
              .map((e, i, arr) => {
                const latest = i === arr.length - 1;
                // A version is superseded only once a later version has actually been published.
                const superseded = arr.slice(i + 1).some((x) => x.status === "published");
                return (
                  <li key={e.id} className={cn("flex flex-wrap items-start gap-2 rounded-md px-2 py-1", latest && "bg-muted/50")}>
                    <span className="font-mono text-xs">v{e.version}</span>
                    <StatusChip status={e.status} />
                    {e.version > 1 ? (
                      <span
                        className={cn(
                          "rounded border px-1.5 text-[11px] uppercase",
                          e.materialChange ? "border-red-200 bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200" : "border-border text-muted-foreground",
                        )}
                        title={e.materialChange ? "Material change — earlier readers were re-notified when this version was published" : "Editorial change — subscribers only"}
                      >
                        {e.materialChange ? "material" : "editorial"}
                      </span>
                    ) : null}
                    <span className="text-xs text-muted-foreground">{fmtDate(e.at)}</span>
                    <span className="basis-full text-xs">
                      {e.summary}
                      {e.changeNote ? (
                        <>
                          {" "}
                          <span className="text-muted-foreground">— change note: {e.changeNote}</span>
                        </>
                      ) : null}
                      {superseded ? <span className="ml-1 italic text-muted-foreground">(superseded)</span> : null}
                      {!latest && !superseded ? <span className="ml-1 italic text-muted-foreground">(current — v{arr[arr.length - 1].version} pending)</span> : null}
                    </span>
                  </li>
                );
              })}
          </ol>
        </div>
      ))}
    </div>
  );
}

/**
 * Amend a published pack: opens pending v+1 with a change note. The Secretariat
 * publishes it like any other pack; a material change re-notifies earlier readers.
 */
export function AmendForm({
  domain,
  recordId,
  stages,
  returnTo,
  children,
}: {
  domain: "mgr" | "eia" | "cbtmt";
  recordId: string;
  /** Stages whose latest version is published (amendable). */
  stages: { stage: string; version: number }[];
  returnTo: string;
  /** Optional domain-specific field editor (MGR pre-collection). */
  children?: React.ReactNode;
}) {
  if (stages.length === 0) return null;
  return (
    <form action={amendAction} className="space-y-3 rounded-lg border p-4">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Amend a published pack (new version)</h2>
      <p className="text-xs text-muted-foreground">
        Opens <em>pending v+1</em> of the chosen stage. Identifiers (receiptId, B-SBI, publicRecordId) never change. The Secretariat publishes the new
        version; a <strong>material</strong> change re-notifies everyone who was told about an earlier version.
      </p>
      <KeyFields returnTo={returnTo} />
      <input type="hidden" name="domain" value={domain} />
      <input type="hidden" name="recordId" value={recordId} />
      <Field label="Stage to amend">
        <select name="stage" className={selectClass} defaultValue={stages[0].stage}>
          {stages.map((s) => (
            <option key={s.stage} value={s.stage}>
              {stageLabel(s.stage)} — published v{s.version} → v{s.version + 1}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Change note" required hint="Why this version exists. Shown in the version history and in the notification.">
        <Input name="changeNote" required placeholder="e.g. taxon count corrected after re-identification" />
      </Field>
      <Field label="New summary (optional)" hint="Leave empty to keep the previous summary.">
        <Input name="summary" />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="materialChange" value="1" className="size-4" />
        Material change (re-notify earlier readers on publication)
      </label>
      {children}
      <SubmitButton size="sm">Submit amendment (pending v+1)</SubmitButton>
    </form>
  );
}
