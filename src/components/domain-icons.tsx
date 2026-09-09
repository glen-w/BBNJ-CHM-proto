import { Bell, ClipboardList, Dna, FolderPen, Globe, Handshake, Inbox, Map, ScrollText, Users, type LucideIcon } from "lucide-react";

/** Domains that carry a quiet accent (VISUAL-CHARTER.md §2). ABMT's token is the quietest of the four. */
export type AccentDomain = "mgr" | "eia" | "cbtmt" | "abmt";

export const DOMAIN_ICON: Record<AccentDomain, LucideIcon> = {
  mgr: Dna,
  eia: ClipboardList,
  cbtmt: Handshake,
  abmt: Map,
};

/** Lucide icons for labelled chrome only — never icon-only status (charter §4 / §5). */
export const RAIL_ICON = {
  submit: Inbox,
  manage: FolderPen,
  publish: Globe,
  notify: Bell,
  audit: ScrollText,
  roles: Users,
} as const;

export function isAccentDomain(domain: string): domain is AccentDomain {
  return domain === "mgr" || domain === "eia" || domain === "cbtmt" || domain === "abmt";
}
