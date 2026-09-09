import { Bell, ClipboardList, Dna, Handshake, Inbox, Users, type LucideIcon } from "lucide-react";

/** Domains that carry a quiet accent (VISUAL-CHARTER.md §2). ABMT has no token. */
export type AccentDomain = "mgr" | "eia" | "cbtmt";

export const DOMAIN_ICON: Record<AccentDomain, LucideIcon> = {
  mgr: Dna,
  eia: ClipboardList,
  cbtmt: Handshake,
};

/** Lucide icons for labelled chrome only — never icon-only status (charter §4 / §5). */
export const RAIL_ICON = {
  submit: Inbox,
  notify: Bell,
  roles: Users,
} as const;

export function isAccentDomain(domain: string): domain is AccentDomain {
  return domain === "mgr" || domain === "eia" || domain === "cbtmt";
}
