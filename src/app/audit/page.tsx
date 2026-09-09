import { AppShell } from "@/components/app-shell";
import { flashFrom } from "@/components/flash";
import { selectClass } from "@/components/forms";
import { Timeline } from "@/components/timeline";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/lib/db";
import { cn } from "@/lib/utils";
import { can } from "@/server/policy";
import { auditRows } from "@/server/queries";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AuditPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const p = await getSessionUser();
  const db = getDb();
  const domain = pick("domain");
  const status = pick("status");
  const highlight = pick("event") || undefined;
  const rows = auditRows(db, p, { domain: domain || undefined, status: status || undefined, limit: 300 });
  const full = can(p, "view_full_audit");

  return (
    <AppShell title="Audit — append-only events outbox" flash={flash}>
      <p className="max-w-3xl text-sm text-muted-foreground">
        Every receipt, transition and publication is a row; rows are never updated or deleted. Notifications are fan-out of these rows.{" "}
        {full ? (
          <>
            You see the <strong>Secretariat projection</strong>: actor user, idempotency key and dispatch outcome included.
          </>
        ) : (
          <>
            You see the <strong>public projection</strong>: published, public-tier rows; actor role, never user identifiers.
          </>
        )}
      </p>
      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground">Domain</span>
          <select name="domain" defaultValue={domain} className={cn(selectClass, "w-40")}>
            <option value="">all</option>
            <option value="mgr">mgr</option>
            <option value="eia">eia</option>
            <option value="cbtmt">cbtmt</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground">Status</span>
          <select name="status" defaultValue={status} className={cn(selectClass, "w-40")}>
            <option value="">all</option>
            <option value="draft">draft</option>
            <option value="pending">pending</option>
            <option value="published">published</option>
          </select>
        </label>
        <button type="submit" className={cn(buttonVariants({ variant: "secondary" }))}>
          Filter
        </button>
        <span className="text-xs text-muted-foreground">{rows.length} rows</span>
      </form>
      <Timeline rows={rows} showRecord highlight={highlight} />
    </AppShell>
  );
}
