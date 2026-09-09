/**
 * ABMT thin journey — Art 51.3(a)(ii) on the same pack rails.
 * Without prejudice to COP1: sandbox stub only; stage is always proposal_stub.
 */
import type { Db } from "@/lib/db";
import type { PublishStatus } from "@/lib/contracts/events";
import { StoredAbmtProposal, type IdempotencyKey } from "@/lib/contracts/extensions";
import { DomainError } from "./errors";
import { nowIso } from "./ids";
import { findEventByKey } from "./outbox";
import { openPack, type PackResult } from "./packs";
import { hasRole, isSecretariat, requireCan, type Principal, userId } from "./policy";
import { refreshCaches } from "./records";

type AbmtRow = {
  id: string;
  public_record_id: string | null;
  current_stage: "proposal_stub";
  latest_pack_status: PublishStatus | null;
  title: string;
  party_code: string;
  source_channel: "form" | "excel" | "assisted";
  confidentiality: "public" | "restricted" | "confidential";
  version: number;
  owner_user_id: string | null;
  updated_at: string;
};

export function rowToAbmt(row: AbmtRow): StoredAbmtProposal {
  return StoredAbmtProposal.parse({
    domain: "abmt",
    id: row.id,
    publicRecordId: row.public_record_id ?? undefined,
    currentStage: "proposal_stub",
    latestPackStatus: row.latest_pack_status ?? undefined,
    title: row.title,
    partyCode: row.party_code,
    sourceChannel: row.source_channel,
    confidentiality: row.confidentiality,
    version: row.version,
    ownerUserId: row.owner_user_id ?? undefined,
    updatedAt: row.updated_at,
  });
}

export function getAbmtProposal(db: Db, id: string): StoredAbmtProposal | undefined {
  const row = db.prepare("SELECT * FROM abmt_proposals WHERE id = ?").get(id) as AbmtRow | undefined;
  return row ? rowToAbmt(row) : undefined;
}

export interface AbmtResult extends PackResult {
  proposal: StoredAbmtProposal;
}

/** Create a draft ABMT proposal_stub pack (one transaction, one key). */
export function createAbmtProposal(
  db: Db,
  actor: Principal,
  input: { title: string; partyCode?: string; confidentiality?: "public" | "restricted" | "confidential" },
  key: IdempotencyKey,
): AbmtResult {
  requireCan(actor, "submit", undefined, { domain: "abmt", db });
  const existing = findEventByKey(db, key);
  if (existing) return { proposal: getAbmtProposal(db, existing.recordId)!, event: existing, created: false };
  const title = input.title.trim();
  if (!title) throw new DomainError("validation", "Title is required");
  const partyCode = hasRole(actor, "party") && actor.kind === "user" && actor.user.partyCode ? actor.user.partyCode : input.partyCode?.toUpperCase();
  if (!partyCode || !/^[A-Z]{2,3}$/.test(partyCode)) throw new DomainError("validation", "A Party code (2–3 letters) is required");
  const tx = db.transaction((): AbmtResult => {
    const id = crypto.randomUUID();
    const at = nowIso();
    db.prepare(
      `INSERT INTO abmt_proposals (id, current_stage, latest_pack_status, title, party_code, source_channel, confidentiality, version, owner_user_id, updated_at)
       VALUES (?, 'proposal_stub', NULL, ?, ?, ?, ?, 1, ?, ?)`,
    ).run(id, title, partyCode, isSecretariat(actor) ? "assisted" : "form", input.confidentiality ?? "public", userId(actor) ?? null, at);
    const res = openPack(db, actor, {
      domain: "abmt",
      recordId: id,
      stage: "proposal_stub",
      status: "draft",
      summary: `ABMT proposal stub opened (Art 51.3(a)(ii); without prejudice): ${title}`,
      idempotencyKey: key,
      at,
    });
    refreshCaches(db, "abmt", id);
    return { proposal: getAbmtProposal(db, id)!, event: res.event, created: true };
  });
  return tx();
}

/** Move draft → pending (receipt) for the latest proposal_stub pack. */
export function submitAbmtProposal(db: Db, actor: Principal, proposalId: string, key: IdempotencyKey): AbmtResult {
  const proposal = getAbmtProposal(db, proposalId);
  if (!proposal) throw new DomainError("not_found", "ABMT proposal not found");
  requireCan(actor, "submit", { ownerUserId: proposal.ownerUserId ?? null }, { domain: "abmt", recordId: proposalId, db });
  const existing = findEventByKey(db, key);
  if (existing) return { proposal: getAbmtProposal(db, proposalId)!, event: existing, created: false };
  const res = openPack(db, actor, {
    domain: "abmt",
    recordId: proposalId,
    stage: "proposal_stub",
    status: "pending",
    summary: `ABMT proposal submitted for publication (without prejudice): ${proposal.title}`,
    idempotencyKey: key,
  });
  refreshCaches(db, "abmt", proposalId);
  return { proposal: getAbmtProposal(db, proposalId)!, event: res.event, created: res.created };
}
