/**
 * Illustrative ISA Clarion-Clipperton Zone map for the CCZ ABMT demo stub.
 * Seed key only — gated by assist overlays; without prejudice to ISA processes.
 */
export const ISA_CCZ_MAP_IMAGE = "/assist/isa-ccz-reserved-areas.jpg";

/** Demo ABMT CSV seed key that shows the closed-by-default ISA CCZ map disclosure. */
export const ISA_CCZ_OVERLAY_ABMT_SEED_KEYS = ["abmt-ccz-precaution"] as const;

export function abmtSeedShowsIsaCczOverlay(seedKey: string | undefined | null): boolean {
  if (!seedKey) return false;
  return (ISA_CCZ_OVERLAY_ABMT_SEED_KEYS as readonly string[]).includes(seedKey);
}
