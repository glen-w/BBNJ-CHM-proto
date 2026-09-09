/**
 * Record-table access shared by the pack machine, reconcile and queries.
 * Cache columns (current_stage, latest_pack_status, public_record_id, b_sbi)
 * are derived from events here — the same derivation is used on write and
 * in reconcile(), so the two can never disagree by construction.
 */
import type { Db } from "@/lib/db";
import type { Domain, MgrStage } from "@/lib/contracts/events";
import { eventsOfRecord, firstPublicRecordId, latestEventOfRecord } from "./outbox";

export interface RecordMeta {
  id: string;
  domain: Domain;
  ownerUserId: string | undefined;
  publicRecordId: string | undefined;
  confidentiality: "public" | "restricted" | "confidential";
  partyCode: string | undefined;
  title: string;
  abnjBox?: string;
  themes?: string[];
  kind?: "need" | "offer";
}

export function recordTable(domain: Domain): string {
  switch (domain) {
    case "mgr":
      return "mgr_batches";
    case "eia":
      return "eia_activities";
    case "cbtmt":
      return "cbtmt_records";
    case "abmt":
      return "abmt_proposals";
  }
}

export function getRecordMeta(db: Db, domain: Domain, id: string): RecordMeta | undefined {
  switch (domain) {
    case "mgr": {
      const r = db.prepare("SELECT id, owner_user_id, public_record_id, confidentiality, party_code, title FROM mgr_batches WHERE id = ?").get(id) as
        | { id: string; owner_user_id: string | null; public_record_id: string | null; confidentiality: RecordMeta["confidentiality"]; party_code: string; title: string }
        | undefined;
      return r
        ? { id: r.id, domain, ownerUserId: r.owner_user_id ?? undefined, publicRecordId: r.public_record_id ?? undefined, confidentiality: r.confidentiality, partyCode: r.party_code, title: r.title }
        : undefined;
    }
    case "eia": {
      const r = db
        .prepare("SELECT id, owner_user_id, public_record_id, confidentiality, party_code, title, abnj_box FROM eia_activities WHERE id = ?")
        .get(id) as
        | { id: string; owner_user_id: string | null; public_record_id: string | null; confidentiality: RecordMeta["confidentiality"]; party_code: string; title: string; abnj_box: string }
        | undefined;
      return r
        ? { id: r.id, domain, ownerUserId: r.owner_user_id ?? undefined, publicRecordId: r.public_record_id ?? undefined, confidentiality: r.confidentiality, partyCode: r.party_code, title: r.title, abnjBox: r.abnj_box }
        : undefined;
    }
    case "cbtmt": {
      const r = db
        .prepare("SELECT id, kind, owner_user_id, public_record_id, confidentiality, party_code, title, themes_json FROM cbtmt_records WHERE id = ?")
        .get(id) as
        | { id: string; kind: "need" | "offer"; owner_user_id: string | null; public_record_id: string | null; confidentiality: RecordMeta["confidentiality"]; party_code: string | null; title: string; themes_json: string }
        | undefined;
      return r
        ? { id: r.id, domain, kind: r.kind, ownerUserId: r.owner_user_id ?? undefined, publicRecordId: r.public_record_id ?? undefined, confidentiality: r.confidentiality, partyCode: r.party_code ?? undefined, title: r.title, themes: JSON.parse(r.themes_json) }
        : undefined;
    }
    case "abmt": {
      const r = db.prepare("SELECT id, owner_user_id, public_record_id, confidentiality, party_code, title FROM abmt_proposals WHERE id = ?").get(id) as
        | { id: string; owner_user_id: string | null; public_record_id: string | null; confidentiality: RecordMeta["confidentiality"]; party_code: string; title: string }
        | undefined;
      return r
        ? { id: r.id, domain, ownerUserId: r.owner_user_id ?? undefined, publicRecordId: r.public_record_id ?? undefined, confidentiality: r.confidentiality, partyCode: r.party_code, title: r.title }
        : undefined;
    }
  }
}

const MGR_ORDER: MgrStage[] = ["pre_collection", "batch_id_issued", "post_collection", "utilisation"];

export interface DerivedCaches {
  currentStage?: string;
  latestPackStatus?: string | null;
  publicRecordId?: string | null;
  bSbi?: string | null;
}

/** Pure derivation of cache columns from the outbox (+ the batch's own B-SBI for MGR). */
export function deriveCaches(db: Db, domain: Domain, recordId: string): DerivedCaches {
  const publicRecordId = firstPublicRecordId(db, recordId) ?? null;
  switch (domain) {
    case "mgr": {
      const events = eventsOfRecord(db, recordId);
      let idx = 0;
      let bSbi: string | null = null;
      for (const e of events) {
        if (e.domain !== "mgr") continue;
        idx = Math.max(idx, MGR_ORDER.indexOf(e.stage));
        if (e.bSbi) bSbi = bSbi ?? e.bSbi;
      }
      // C1: a batch with a B-SBI has at least reached batch_id_issued.
      if (bSbi && idx < 1) idx = 1;
      return { currentStage: MGR_ORDER[idx], publicRecordId, bSbi };
    }
    case "eia": {
      const latest = latestEventOfRecord(db, recordId);
      return latest
        ? { currentStage: latest.stage, latestPackStatus: latest.status, publicRecordId }
        : { currentStage: "screening", latestPackStatus: null, publicRecordId };
    }
    case "cbtmt":
      return { publicRecordId };
    case "abmt": {
      const latest = latestEventOfRecord(db, recordId);
      return latest
        ? { currentStage: latest.stage, latestPackStatus: latest.status, publicRecordId }
        : { currentStage: "proposal_stub", latestPackStatus: null, publicRecordId };
    }
  }
}

/** Write the derived caches in the caller's transaction. */
export function refreshCaches(db: Db, domain: Domain, recordId: string): DerivedCaches {
  const d = deriveCaches(db, domain, recordId);
  const now = new Date().toISOString();
  switch (domain) {
    case "mgr":
      db.prepare("UPDATE mgr_batches SET current_stage = ?, public_record_id = ?, updated_at = ? WHERE id = ?").run(d.currentStage, d.publicRecordId, now, recordId);
      break;
    case "eia":
      db.prepare("UPDATE eia_activities SET current_stage = ?, latest_pack_status = ?, public_record_id = ?, updated_at = ? WHERE id = ?").run(
        d.currentStage,
        d.latestPackStatus,
        d.publicRecordId,
        now,
        recordId,
      );
      break;
    case "cbtmt":
      db.prepare("UPDATE cbtmt_records SET public_record_id = ?, updated_at = ? WHERE id = ?").run(d.publicRecordId, now, recordId);
      break;
    case "abmt":
      db.prepare("UPDATE abmt_proposals SET current_stage = ?, latest_pack_status = ?, public_record_id = ?, updated_at = ? WHERE id = ?").run(
        d.currentStage ?? "proposal_stub",
        d.latestPackStatus,
        d.publicRecordId,
        now,
        recordId,
      );
      break;
  }
  return d;
}
