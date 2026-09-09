import Link from "next/link";

import { DomainBadge, StatusChip, ConfidentialityBadge } from "@/components/chips";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { domainPath, fmtDate, stageLabel } from "@/lib/format";
import type { AuditRow } from "@/server/queries";

export function Timeline({ rows, showRecord = false, highlight }: { rows: AuditRow[]; showRecord?: boolean; highlight?: string }) {
  const full = rows.some((r) => r.actorUserId !== undefined || r.dispatch !== undefined);
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No rows visible to your role.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>seq</TableHead>
            <TableHead>at</TableHead>
            {showRecord ? <TableHead>record</TableHead> : null}
            <TableHead>stage</TableHead>
            <TableHead>v</TableHead>
            <TableHead>status</TableHead>
            <TableHead>actor role</TableHead>
            <TableHead>summary</TableHead>
            <TableHead>ids</TableHead>
            <TableHead>tier</TableHead>
            {full ? <TableHead>secretariat view</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} id={r.id} className={highlight === r.id ? "bg-institutional/10" : undefined}>
              <TableCell className="font-mono text-xs">{r.seq}</TableCell>
              <TableCell className="whitespace-nowrap text-xs">{fmtDate(r.at)}</TableCell>
              {showRecord ? (
                <TableCell className="text-xs">
                  <Link href={domainPath(r.domain, r.recordId)} className="inline-flex items-center gap-1.5 underline">
                    <DomainBadge domain={r.domain} withIcon />
                    <span className="font-mono">{r.publicRecordId ?? r.recordId.slice(0, 8)}</span>
                  </Link>
                </TableCell>
              ) : null}
              <TableCell className="text-xs">{stageLabel(r.stage)}</TableCell>
              <TableCell className="text-xs">{r.version}</TableCell>
              <TableCell>
                <StatusChip status={r.status} />
              </TableCell>
              <TableCell className="text-xs">{r.actorRole}</TableCell>
              <TableCell className="max-w-md text-xs">{r.summary}</TableCell>
              <TableCell className="font-mono text-[11px] leading-4 text-foreground">
                {r.receiptId ? <div title="receiptId — issued when the pack entered pending">{r.receiptId}</div> : null}
                {r.bSbi ? <div title="B-SBI — Art 12, minted at valid pre-collection receipt">{r.bSbi}</div> : null}
                {r.publicRecordId ? <div title="publicRecordId — minted at first publish">{r.publicRecordId}</div> : null}
              </TableCell>
              <TableCell>
                <ConfidentialityBadge tier={r.confidentiality} />
              </TableCell>
              {full ? (
                <TableCell className="font-mono text-[11px] leading-4 text-muted-foreground">
                  {r.actorUserId ? <div>user {r.actorUserId.slice(-4)}</div> : <div>system</div>}
                  {r.idempotencyKey ? <div title={r.idempotencyKey}>key {r.idempotencyKey.slice(0, 18)}…</div> : null}
                  {r.dispatch ? <div>dispatch {r.dispatch.deliveredCount}{r.dispatch.error ? ` ⚠ ${r.dispatch.error}` : ""}</div> : r.status === "published" ? <div>dispatch —</div> : null}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
