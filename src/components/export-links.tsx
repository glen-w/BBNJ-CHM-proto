import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** CSV / JSON export buttons for a list; policy-filtered server-side exactly like the page. */
export function ExportLinks({ domain, className }: { domain: "mgr" | "eia" | "cbtmt" | "audit"; className?: string }) {
  return (
    <span className={cn("inline-flex gap-1", className)}>
      <a
        href={`/api/export/${domain}.csv`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        title="RFC 4180 CSV of the rows visible to your role"
      >
        Export CSV (.csv)
      </a>
      <a
        href={`/api/export/${domain}.json`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        title="JSON export of the rows visible to your role"
      >
        Export JSON (.json)
      </a>
    </span>
  );
}

/** JSON / PDF export for one published record. */
export function RecordExportLinks({ publicRecordId }: { publicRecordId: string | undefined }) {
  if (!publicRecordId) return <span className="text-xs italic text-muted-foreground">Exports appear once the record has a publicRecordId.</span>;
  return (
    <span className="inline-flex gap-1">
      <a
        href={`/api/records/${publicRecordId}.json`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        title="Record, packs, version history and timeline as visible to your role"
      >
        Export JSON (.json)
      </a>
      <a
        href={`/api/records/${publicRecordId}.pdf`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        title="One-page text PDF extract"
      >
        Export PDF (.pdf)
      </a>
    </span>
  );
}
