import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  pending: "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200",
  published: "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200",
};

export function StatusChip({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLE[status] ?? "", className)} title={`Pack status: ${status} (status lives on the pack, not the record)`}>
      {status}
    </Badge>
  );
}

const TIER_STYLE: Record<string, string> = {
  public: "border-border text-muted-foreground",
  restricted: "bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200",
  confidential: "bg-red-100 text-red-900 border-red-200 dark:bg-red-900/30 dark:text-red-200",
};

export function ConfidentialityBadge({ tier }: { tier: string }) {
  return (
    <Badge variant="outline" className={TIER_STYLE[tier] ?? ""} title="Confidentiality tier (implementation of PrepCom3 annex categories) — enforced server-side">
      {tier}
    </Badge>
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
