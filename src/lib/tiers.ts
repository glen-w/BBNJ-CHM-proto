import type { ConfidentialityTier } from "@/lib/contracts/events";

export const TIERS: ConfidentialityTier[] = ["public", "restricted", "confidential"];

/** Plain-language visibility statement for a tier — mirrors readPolicy() in src/server/policy.ts. */
export function whoCanSee(tier: ConfidentialityTier): string {
  switch (tier) {
    case "public":
      return "Published packs visible to everyone, including anonymous visitors.";
    case "restricted":
      return "Visible to the Secretariat, the submitting Party and STB reviewers only. Never in public lists, feeds, audit, exports or notifications.";
    case "confidential":
      return "Visible to the Secretariat and the submitting Party only. STB and public never see it.";
  }
}
