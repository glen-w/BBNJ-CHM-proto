/**
 * Global related-research lane gate.
 *
 * Persisted in `meta.research_lane_enabled` (`1` / `0`). Missing key defaults ON
 * so fixture demos show the panel. One switch for the whole desk — not per user,
 * per pillar, or per journey. Literature nav and `/research` call the same gate
 * and stay hidden when off.
 */
export const RESEARCH_LANE_META_KEY = "research_lane_enabled";

/** Literature journey. Hidden with the rest of the lane when the gate is off. */
export const RESEARCH_NAV_HREF = "/research";

/** Browse href for the literature desk, optionally narrowed to a pillar and geography. */
export function literatureBrowseHref(pillar?: string, box?: string): string {
  const q = new URLSearchParams();
  if (pillar) q.set("pillar", pillar);
  if (box) q.set("box", box);
  const s = q.toString();
  return s ? `${RESEARCH_NAV_HREF}?${s}` : RESEARCH_NAV_HREF;
}

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
