/**
 * Illustrative Global Fishing Watch fishing-effort snapshot for a few ABMT demo stubs.
 * Seed keys only — not a gazetteer; gated by assist overlays like the EIA VME sketch.
 */
export const GFW_FISHING_EFFORT_IMAGE = "/assist/gfw-high-seas-effort.png";

/** Demo ABMT CSV seed keys that show the closed-by-default fishing-effort disclosure. */
export const GFW_OVERLAY_ABMT_SEED_KEYS = ["abmt-sargasso", "abmt-cr-dome", "abmt-indian-vents"] as const;

export type GfwOverlayAbmtSeedKey = (typeof GFW_OVERLAY_ABMT_SEED_KEYS)[number];

export function abmtSeedShowsGfwOverlay(seedKey: string | undefined | null): boolean {
  if (!seedKey) return false;
  return (GFW_OVERLAY_ABMT_SEED_KEYS as readonly string[]).includes(seedKey);
}
