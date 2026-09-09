/**
 * reconcile() — recompute cache columns from the outbox and compare with what
 * is stored. Used by smoke and `npm run db:check`.
 */
import type { Db } from "@/lib/db";
import { deriveCaches } from "./records";

export interface Mismatch {
  table: string;
  id: string;
  column: string;
  stored: unknown;
  derived: unknown;
}

export function reconcile(db: Db): { checked: number; mismatches: Mismatch[] } {
  const mismatches: Mismatch[] = [];
  let checked = 0;
  const cmp = (table: string, id: string, column: string, stored: unknown, derived: unknown) => {
    if ((stored ?? null) !== (derived ?? null)) mismatches.push({ table, id, column, stored, derived });
  };

  for (const r of db.prepare("SELECT id, current_stage, public_record_id, b_sbi FROM mgr_batches").all() as {
    id: string;
    current_stage: string;
    public_record_id: string | null;
    b_sbi: string | null;
  }[]) {
    checked++;
    const d = deriveCaches(db, "mgr", r.id);
    cmp("mgr_batches", r.id, "current_stage", r.current_stage, d.currentStage);
    cmp("mgr_batches", r.id, "public_record_id", r.public_record_id, d.publicRecordId);
    cmp("mgr_batches", r.id, "b_sbi", r.b_sbi, d.bSbi);
  }
  for (const r of db.prepare("SELECT id, current_stage, latest_pack_status, public_record_id FROM eia_activities").all() as {
    id: string;
    current_stage: string;
    latest_pack_status: string | null;
    public_record_id: string | null;
  }[]) {
    checked++;
    const d = deriveCaches(db, "eia", r.id);
    cmp("eia_activities", r.id, "current_stage", r.current_stage, d.currentStage);
    cmp("eia_activities", r.id, "latest_pack_status", r.latest_pack_status, d.latestPackStatus);
    cmp("eia_activities", r.id, "public_record_id", r.public_record_id, d.publicRecordId);
  }
  for (const r of db.prepare("SELECT id, public_record_id FROM cbtmt_records").all() as { id: string; public_record_id: string | null }[]) {
    checked++;
    const d = deriveCaches(db, "cbtmt", r.id);
    cmp("cbtmt_records", r.id, "public_record_id", r.public_record_id, d.publicRecordId);
  }
  return { checked, mismatches };
}
