import type { ProvenanceBadge as ProvenanceBadgeType } from "@/server/seed-pack";

export function ProvenanceCaption({ badge }: { badge: ProvenanceBadgeType }) {
  const text =
    badge === "Interim (DOALOS)"
      ? "Mirrors a public DOALOS page — not a filing made here."
      : "Illustrative scenario — not a Party filing.";
  return <p className="text-xs text-muted-foreground">{text}</p>;
}
