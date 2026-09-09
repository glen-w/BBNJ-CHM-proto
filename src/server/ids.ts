/**
 * Identifier mints. Counters advance inside the caller's transaction so a
 * rolled-back write never burns a number visibly.
 *
 * Formats (locked):
 *   publicRecordId  BBNJ-<MGR|EIA|CBTMT|ABMT>-YYYY-NNNNN   (first pack publish)
 *   receiptId       BBNJ-RCPT-YYYY-NNNNN                   (pack enters pending)
 *   bSbi            BSBI-<PARTY>-YYYY-NNNNN                (valid MGR pre-collection receipt)
 */
import type { Db } from "@/lib/db";
import type { Domain } from "@/lib/contracts/events";

export function nextCounter(db: Db, name: string): number {
  const row = db
    .prepare(
      `INSERT INTO counters(name, value) VALUES (?, 1)
       ON CONFLICT(name) DO UPDATE SET value = value + 1
       RETURNING value`,
    )
    .get(name) as { value: number };
  return row.value;
}

const pad5 = (n: number) => String(n).padStart(5, "0");

export function yearOf(iso: string): number {
  return Number(iso.slice(0, 4));
}

export function mintPublicRecordId(db: Db, domain: Domain, year: number): string {
  return `BBNJ-${domain.toUpperCase()}-${year}-${pad5(nextCounter(db, `prid:${domain}:${year}`))}`;
}

export function mintReceiptId(db: Db, year: number): string {
  return `BBNJ-RCPT-${year}-${pad5(nextCounter(db, `rcpt:${year}`))}`;
}

export function mintBSbi(db: Db, partyCode: string, year: number): string {
  const party = partyCode.toUpperCase();
  return `BSBI-${party}-${year}-${pad5(nextCounter(db, `bsbi:${party}:${year}`))}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
