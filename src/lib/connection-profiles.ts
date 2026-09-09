/**
 * Mocked connection profiles for the Art 51.5 speed lab.
 *
 * These are *named assumptions*, not field measurements: a frozen table of
 * nominal bandwidth + round-trip time so the offline Excel loop (download
 * template → upload filled file → download error workbook) can be compared
 * across links on a single page. Nothing here throttles a socket or sleeps.
 */

export type ConnectionProfileId = "office" | "national4g" | "sids3g" | "satellite" | "offline";

export interface ConnectionProfile {
  id: ConnectionProfileId;
  label: string;
  /** Nominal downstream, kbps. `null` = no network leg (offline fill). */
  downKbps: number | null;
  /** Nominal upstream, kbps. `null` = no network leg (offline fill). */
  upKbps: number | null;
  /** Nominal round-trip time, ms. `null` = no network leg. */
  rttMs: number | null;
  /** Why this row is in the table. */
  use: string;
}

export const CONNECTION_PROFILES: readonly ConnectionProfile[] = [
  { id: "office", label: "Office broadband", downKbps: 25_000, upKbps: 5_000, rttMs: 20, use: "Contrast" },
  { id: "national4g", label: "National 4G", downKbps: 10_000, upKbps: 5_000, rttMs: 80, use: "Typical Party desk" },
  { id: "sids3g", label: "SIDS 3G / constrained", downKbps: 400, upKbps: 200, rttMs: 200, use: "Art 51.5 story" },
  { id: "satellite", label: "GEO satellite", downKbps: 2_000, upKbps: 512, rttMs: 600, use: "Pacific / remote" },
  { id: "offline", label: "Offline fill only", downKbps: null, upKbps: null, rttMs: null, use: "Transfer 0 — the fill happens off-network" },
];

export const CONNECTION_PROFILE_IDS = CONNECTION_PROFILES.map((p) => p.id) as readonly ConnectionProfileId[];

export function isConnectionProfileId(v: unknown): v is ConnectionProfileId {
  return typeof v === "string" && (CONNECTION_PROFILE_IDS as readonly string[]).includes(v);
}

export function connectionProfile(id: ConnectionProfileId): ConnectionProfile {
  const p = CONNECTION_PROFILES.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown connection profile ${id}`);
  return p;
}

export type TransferDirection = "download" | "upload";

/**
 * Mocked wire time for one transfer: `transferMs = rttMs + (bytes * 8 / bitsPerSec) * 1000`.
 * Download uses `downKbps`, upload uses `upKbps`. Offline (null link) is 0 ms — nothing crosses the wire.
 */
export function transferMs(profile: ConnectionProfile, bytes: number, direction: TransferDirection): number {
  if (!Number.isFinite(bytes) || bytes < 0) throw new Error(`bytes must be a non-negative number, got ${bytes}`);
  const kbps = direction === "download" ? profile.downKbps : profile.upKbps;
  if (kbps === null || profile.rttMs === null) return 0;
  const bitsPerSec = kbps * 1000;
  return Math.round(profile.rttMs + ((bytes * 8) / bitsPerSec) * 1000);
}

/** Human-readable duration for the lab table: `0.4 s`, `12 ms`, `1 min 03 s`. */
export function fmtMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m} min ${String(s).padStart(2, "0")} s`;
}
