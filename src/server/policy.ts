/**
 * Authorisation and visibility — the single place that decides who may do
 * what and who may read which rows. Every list, count, feed, audit query,
 * resolver and notification fan-out goes through visibilityClause() /
 * recordVisibilityClause(). Nobody writes visibility SQL by hand.
 */
import type { Db } from "@/lib/db";
import type { ActorRole, ConfidentialityTier, PublishStatus, User } from "@/lib/contracts/events";
import type { Principal } from "@/lib/contracts/extensions";
import { DomainError } from "./errors";
import { findUserById } from "./users";

export type { Principal };

export type Action =
  | "submit"
  | "publish"
  | "comment_stb"
  | "import"
  | "suggest_match"
  | "manage_subscription"
  | "view_full_audit";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function anonymous(): Principal {
  return { kind: "anonymous" };
}

export function principalFor(user: User): Principal {
  return user.active ? { kind: "user", user } : anonymous();
}

/** Missing, malformed, unknown or inactive → anonymous public principal. Never throws. */
export function principalFromCookie(db: Db, raw: string | undefined | null): Principal {
  if (!raw || !UUID.test(raw)) return anonymous();
  const user = findUserById(db, raw);
  if (!user || !user.active) return anonymous();
  return { kind: "user", user };
}

export function hasRole(p: Principal, role: ActorRole): boolean {
  return p.kind === "user" && p.user.roles.includes(role);
}

export function userId(p: Principal): string | undefined {
  return p.kind === "user" ? p.user.id : undefined;
}

export function isSecretariat(p: Principal): boolean {
  return hasRole(p, "secretariat") || hasRole(p, "publishing_authority");
}

/** Role of record for audit rows. */
export function actorRoleOf(p: Principal): ActorRole {
  if (p.kind === "anonymous") return "public";
  if (hasRole(p, "secretariat")) return "secretariat";
  if (hasRole(p, "publishing_authority")) return "publishing_authority";
  if (hasRole(p, "party")) return "party";
  if (hasRole(p, "stb")) return "stb";
  return "public";
}

export function can(p: Principal, action: Action, subject?: { ownerUserId?: string | null }): boolean {
  if (p.kind === "anonymous") return false;
  switch (action) {
    case "submit":
      if (isSecretariat(p)) return true; // on behalf → sourceChannel "assisted"
      if (!hasRole(p, "party")) return false;
      if (subject && subject.ownerUserId != null) return subject.ownerUserId === p.user.id;
      return true;
    case "publish":
      return isSecretariat(p);
    case "comment_stb":
      return hasRole(p, "stb");
    case "import":
    case "suggest_match":
    case "view_full_audit":
      return isSecretariat(p);
    case "manage_subscription":
      return true;
  }
}

export interface ReadPolicy {
  all: boolean;
  statuses: PublishStatus[];
  tiers: ConfidentialityTier[];
  ownerUserId?: string;
}

/**
 * Status: public/STB → published only (Lock 2); party → published + own; secretariat → all.
 * Confidentiality: public → everyone; restricted → secretariat, owner, STB; confidential → secretariat, owner.
 */
export function readPolicy(p: Principal): ReadPolicy {
  if (isSecretariat(p)) return { all: true, statuses: ["draft", "pending", "published"], tiers: ["public", "restricted", "confidential"] };
  if (hasRole(p, "stb")) return { all: false, statuses: ["published"], tiers: ["public", "restricted"], ownerUserId: userId(p) };
  if (hasRole(p, "party")) return { all: false, statuses: ["published"], tiers: ["public"], ownerUserId: userId(p) };
  return { all: false, statuses: ["published"], tiers: ["public"] };
}

export interface Clause {
  sql: string;
  params: unknown[];
}

const placeholders = (n: number) => Array.from({ length: n }, () => "?").join(", ");

/**
 * Event-row visibility. `cols` name the status / confidentiality columns of the
 * event row and the owner column of the joined record.
 */
export function visibilityClause(policy: ReadPolicy, cols: { status: string; tier: string; owner: string }): Clause {
  if (policy.all) return { sql: "1 = 1", params: [] };
  return combine(policy, `${cols.status} IN (${placeholders(policy.statuses.length)})`, cols);
}

/** Params are pushed in the exact order the placeholders appear: statuses, [owner], tiers, [owner]. */
function combine(policy: ReadPolicy, statusSql: string, cols: { tier: string; owner: string }): Clause {
  const params: unknown[] = [];
  let status = statusSql;
  params.push(...policy.statuses);
  if (policy.ownerUserId) {
    status = `(${status} OR ${cols.owner} = ?)`;
    params.push(policy.ownerUserId);
  }
  let tier = `${cols.tier} IN (${placeholders(policy.tiers.length)})`;
  params.push(...policy.tiers);
  if (policy.ownerUserId) {
    tier = `(${tier} OR ${cols.owner} = ?)`;
    params.push(policy.ownerUserId);
  }
  return { sql: `(${status} AND ${tier})`, params };
}

/**
 * Record-row visibility: the record must carry at least one visible-status
 * pack (or be owned by the reader) and sit in a permitted tier (or be owned).
 */
export function recordVisibilityClause(policy: ReadPolicy, cols: { id: string; tier: string; owner: string }): Clause {
  if (policy.all) return { sql: "1 = 1", params: [] };
  return combine(
    policy,
    `EXISTS (SELECT 1 FROM events ve WHERE ve.record_id = ${cols.id} AND ve.status IN (${placeholders(policy.statuses.length)}))`,
    cols,
  );
}

/** SQL fragment joining an event alias `e` to its owning record as alias `r` (owner_user_id, confidentiality). */
export const RECORD_JOIN = `
  LEFT JOIN (
    SELECT id, owner_user_id, confidentiality, 'mgr' AS domain FROM mgr_batches
    UNION ALL SELECT id, owner_user_id, confidentiality, 'eia' FROM eia_activities
    UNION ALL SELECT id, owner_user_id, confidentiality, 'cbtmt' FROM cbtmt_records
  ) r ON r.id = e.record_id`;

export function requireCan(p: Principal, action: Action, subject?: { ownerUserId?: string | null }): void {
  if (!can(p, action, subject)) {
    throw new DomainError("forbidden", `Not permitted: ${action}`);
  }
}
