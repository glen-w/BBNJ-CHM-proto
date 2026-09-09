import type { ProvenanceBadge as ProvenanceBadgeType } from "@/server/seed-pack";

export function ProvenanceCaption({ badge }: { badge: ProvenanceBadgeType }) {
  const text =
    badge === "Interim (DOALOS)"
      ? "Mirrors a live DOALOS page — not a filing through this desk."
      : "Demo scenario — not a real Party filing.";
  return <p className="text-xs text-muted-foreground">{text}</p>;
}
