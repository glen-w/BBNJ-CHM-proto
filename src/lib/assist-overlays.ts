/**
 * Local assist & illustrative overlays (VME map, corpus ask, citation graph).
 * Persisted in `meta.assist_overlays_enabled`. Missing key defaults OFF (roadmap: assist off by default).
 */
export const ASSIST_OVERLAYS_META_KEY = "assist_overlays_enabled";

export function assistOverlaysEnabled(value: string | undefined | null): boolean {
  if (value === "1" || value === "on" || value === "true") return true;
  if (value === "0" || value === "off" || value === "false") return false;
  return false;
}
