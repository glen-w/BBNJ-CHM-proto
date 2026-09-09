import Link from "next/link";

import { StatusChip } from "@/components/chips";
import { fmtRelative } from "@/lib/format";
import type { AuditRow } from "@/server/queries";

/**
 * Latest policy-visible outbox event, inline in the contextual band.
 * Public identifiers only — never internal user UUIDs.
 */
export function AuditRibbon({ event }: { event: AuditRow | null }) {
  if (!event) return null;

  const publicId = event.publicRecordId ?? event.receiptId ?? event.bSbi;

  return (
    <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
      <span className="shrink-0 font-medium">Latest transaction</span>
      <Link
        href={`/audit?event=${event.id}`}
        className="flex min-w-0 items-center gap-1.5 text-foreground hover:text-institutional focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        title={event.summary}
      >
        <StatusChip status={event.status} className="text-[10px]" />
        <span className="min-w-0 truncate font-mono">{publicId ?? event.summary}</span>
        <span className="shrink-0" title={event.at}>
          {fmtRelative(event.at)}
        </span>
      </Link>
    </div>
  );
}
