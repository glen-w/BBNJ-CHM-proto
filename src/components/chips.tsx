import { Badge } from "@/components/ui/badge";
import { DOMAIN_ICON, isAccentDomain, type AccentDomain } from "@/components/domain-icons";
import type { ConfidentialityTier } from "@/lib/contracts/events";
import { DOMAIN_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { whoCanSee } from "@/lib/tiers";

/**
 * Pack-status chip colours come from the charter tokens in `globals.css` (`--draft` / `--pending` / `--published`).
 * The status text is always rendered — colour is never the only carrier (VISUAL-CHARTER.md §1.6).
 */
const STATUS_STYLE: Record<string, string> = {
  draft: "bg-draft text-draft-foreground border-draft-line",
  pending: "bg-pending text-pending-foreground border-pending-line",
  published: "bg-published text-published-foreground border-published-line",
};

/** Quiet domain accents — softer than --institutional / --action; never louder than status chips. */
const DOMAIN_STYLE: Record<AccentDomain, string> = {
  mgr: "bg-domain-mgr text-domain-mgr-foreground border-domain-mgr-line",
  eia: "bg-domain-eia text-domain-eia-foreground border-domain-eia-line",
  cbtmt: "bg-domain-cbtmt text-domain-cbtmt-foreground border-domain-cbtmt-line",
  abmt: "bg-domain-abmt text-domain-abmt-foreground border-domain-abmt-line",
};

export const DOMAIN_RAIL: Record<AccentDomain, string> = {
  mgr: "border-l-2 border-domain-mgr-line",
  eia: "border-l-2 border-domain-eia-line",
  cbtmt: "border-l-2 border-domain-cbtmt-line",
  abmt: "border-l-2 border-domain-abmt-line",
};

export function DomainBadge({
  domain,
  withIcon = false,
  className,
}: {
  domain: string;
  withIcon?: boolean;
  className?: string;
}) {
  const label = DOMAIN_LABEL[domain] ?? domain;
  if (!isAccentDomain(domain)) {
    return (
      <Badge variant="outline" className={cn("border-line bg-muted text-muted-foreground", className)}>
        {label}
      </Badge>
    );
  }
  const Icon = DOMAIN_ICON[domain];
  return (
    <Badge variant="outline" className={cn(DOMAIN_STYLE[domain], "gap-1 font-medium", className)} title={`Domain: ${label}`}>
      {withIcon ? <Icon aria-hidden="true" className="size-3" /> : null}
      {label}
    </Badge>
  );
}

export function StatusChip({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLE[status] ?? "", "overflow-visible", className)} title={`Pack status: ${status} (status lives on the pack, not the record)`}>
      {status}
    </Badge>
  );
}

const TIER_STYLE: Record<string, string> = {
  public: "border-border bg-transparent text-muted-foreground",
  restricted: "border-caution-line bg-transparent text-caution-foreground",
  confidential: "bg-danger/10 text-danger border-danger-line",
};

export function ConfidentialityBadge({ tier }: { tier: string }) {
  const explain = (["public", "restricted", "confidential"] as const).includes(tier as ConfidentialityTier) ? whoCanSee(tier as ConfidentialityTier) : "";
  return (
    <Badge variant="outline" className={TIER_STYLE[tier] ?? ""} title={`Confidentiality tier — enforced in SQL for every list, count, feed, audit row, export and notification. ${explain}`}>
      {tier}
    </Badge>
  );
}

/** One-line statement of who can see a record at this tier (rendered under the badge on detail pages). */
export function TierNote({ tier }: { tier: ConfidentialityTier }) {
  return (
    <p className="text-xs text-muted-foreground">
      <span className="font-medium">Who can see this ({tier}):</span> {whoCanSee(tier)} A separate <em>proprietary</em> category (PrepCom3 annex) is
      deferred in this build — commercially sensitive material sits under <em>confidential</em> for now.
    </p>
  );
}

export function ChannelBadge({ channel }: { channel: string }) {
  const label = channel === "excel" ? "offline Excel" : channel === "assisted" ? "Secretariat-assisted" : "web form";
  return (
    <Badge variant="secondary" title={`Source channel: ${channel}`}>
      {label}
    </Badge>
  );
}

export function StageChip({ stage, status, version }: { stage: string; status: string; version: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
      <span className="font-medium">{stage.replace(/_/g, " ")}</span>
      <span className="text-muted-foreground">v{version}</span>
      <StatusChip status={status} />
    </span>
  );
}

/** List badge distinguishing Interim (DOALOS) mirrors from fictional demo scenarios. */
export function ProvenanceBadge({ badge }: { badge: "Interim (DOALOS)" | "Demo scenario" }) {
  const interim = badge === "Interim (DOALOS)";
  return (
    <Badge
      variant="outline"
      className={cn(
        "overflow-visible font-normal",
        interim
          ? "border-institutional bg-transparent text-institutional"
          : "border-transparent bg-muted/70 font-normal text-muted-foreground",
      )}
      title={interim ? "Mirrors a live DOALOS interim page — not a Party filing through this desk" : "Plausible demo scenario; not a real Party filing"}
    >
      {badge}
    </Badge>
  );
}

export function Identifier({
  label,
  value,
  caption,
  mono = true,
}: {
  label: string;
  value: string | undefined;
  caption: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-sm", mono && "font-mono", !value && "text-muted-foreground italic")}>{value ?? "not yet issued"}</div>
      <div className="mt-1 text-xs text-muted-foreground">{caption}</div>
    </div>
  );
}
