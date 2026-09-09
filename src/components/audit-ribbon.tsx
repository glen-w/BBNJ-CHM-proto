import Link from "next/link";

import { StatusChip } from "@/components/chips";
import { fmtRelative } from "@/lib/format";
import type { AuditRow } from "@/server/queries";

/**
 * Sticky one-liner from the latest policy-visible outbox event.
 * Text-labelled chips; no motion beyond sticky positioning.
 */
export function AuditRibbon({ event }: { event: AuditRow | null }) {
  if (!event) {
    return (
      <div className="sticky top-0 z-30 border-b border-line bg-muted/80 text-xs text-muted-foreground backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-1.5">No events yet.</div>
      </div>
    );
  }

  const actor = event.actorUserId ?? event.actorRole;
  const ids = [event.receiptId, event.publicRecordId, event.bSbi].filter(Boolean) as string[];

  return (
    <div className="sticky top-0 z-30 border-b border-line bg-muted/80 text-xs backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-1 px-6 py-1.5">
        <Link
          href={`/audit?event=${event.id}`}
          className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-sm text-foreground hover:text-institutional focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="font-medium">{actor}</span>
          <span className="rounded border border-line bg-card px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {event.actorRole}
          </span>
          <StatusChip status={event.status} className="text-[10px]" />
          {ids.length > 0 ? (
            <span className="font-mono text-[11px] text-muted-foreground">{ids.join(" · ")}</span>
          ) : (
            <span className="text-muted-foreground">{event.stage.replace(/_/g, " ")}</span>
          )}
          <span className="text-muted-foreground" title={event.at}>
            {fmtRelative(event.at)}
          </span>
        </Link>
      </div>
    </div>
  );
}
