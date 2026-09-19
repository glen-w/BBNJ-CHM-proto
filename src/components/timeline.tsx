import Link from "next/link";

import { DomainBadge, StatusChip, ConfidentialityBadge } from "@/components/chips";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { domainPath, fmtDate, roleLabel, stageLabel } from "@/lib/format";
import type { AuditRow } from "@/server/queries";

export function Timeline({ rows, showRecord = false, highlight }: { rows: AuditRow[]; showRecord?: boolean; highlight?: string }) {
  const full = rows.some((r) => r.actorUserId !== undefined || r.dispatch !== undefined);
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No rows visible to your role.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table className="min-w-max" containerClassName="overflow-visible">
        <TableHeader>
          <TableRow>
            <TableHead>Seq</TableHead>
            <TableHead>When</TableHead>
            {showRecord ? <TableHead>Record</TableHead> : null}
            <TableHead>Stage</TableHead>
            <TableHead>v</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actor role</TableHead>
            <TableHead>Summary</TableHead>
            <TableHead>Ids</TableHead>
            <TableHead>Tier</TableHead>
            {full ? <TableHead>Secretariat view</TableHead> : null}
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
                    <span className="font-mono">{r.publicRecordId ?? r.bSbi ?? "unpublished"}</span>
                  </Link>
                </TableCell>
              ) : null}
              <TableCell className="text-xs">{stageLabel(r.stage)}</TableCell>
              <TableCell className="text-xs">{r.version}</TableCell>
              <TableCell>
                <StatusChip status={r.status} />
              </TableCell>
              <TableCell className="text-xs">{roleLabel(r.actorRole)}</TableCell>
              <TableCell className="w-0 align-top text-xs">
                <div className="w-72 max-w-sm whitespace-normal">{r.summary}</div>
              </TableCell>
              <TableCell className="align-top">
                <div className="flex flex-col gap-0.5 whitespace-nowrap font-mono text-[11px] leading-snug text-foreground">
                  {r.receiptId ? <span title="receiptId — issued when the pack entered pending">{r.receiptId}</span> : null}
                  {r.bSbi ? <span title="B-SBI — Art 12, minted at valid pre-collection receipt">{r.bSbi}</span> : null}
                  {r.publicRecordId ? <span title="publicRecordId — minted at first publish">{r.publicRecordId}</span> : null}
                </div>
              </TableCell>
              <TableCell className="align-top whitespace-nowrap">
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
