/**
 * Global related-research lane gate.
 *
 * Persisted in `meta.research_lane_enabled` (`1` / `0`). Missing key defaults ON
 * so fixture demos show the panel. One switch for the whole desk — not per user,
 * per pillar, or per journey. Future Research nav / browse must call
 * `isResearchLaneEnabled` (or this parser) and stay hidden when off.
 */
export const RESEARCH_LANE_META_KEY = "research_lane_enabled";

/** P1 Research journey href — do not add to primary nav in P0. */
export const RESEARCH_NAV_HREF = "/research";

/**
 * Parse the stored meta value.
 * - Explicit off (`0` / `off` / `false`) hides the lane.
 * - Explicit on (`1` / `on` / `true`) shows it.
 * - Missing / unknown → on (dev and fixture default).
 */
export function researchLaneEnabled(value: string | undefined | null): boolean {
  if (value === "0" || value === "off" || value === "false") return false;
  if (value === "1" || value === "on" || value === "true") return true;
  return true;
}
