import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { flashFrom } from "@/components/flash";
import { MgrForm } from "@/components/mgr-form";
import { can, hasRole, recordRefusal } from "@/server/policy";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NewMgrPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const p = await getSessionUser();
  if (!can(p, "submit")) {
    recordRefusal(p, "submit", { domain: "mgr", path: "/mgr/new", reason: "Submission form requested without the submit permission" });
    return (
      <AppShell title="MGR — new pre-collection notification" flash={flash}>
        <p className="text-sm">
          Submitting requires a Party or Secretariat login.{" "}
          <Link href="/login?return=/mgr/new" className="underline">
            Switch login
          </Link>
          .
        </p>
      </AppShell>
    );
  }
  return (
    <AppShell title="MGR — new pre-collection notification (Art 12.2)" flash={flash}>
      <p className="max-w-3xl text-sm text-muted-foreground">
        Fields are generated from one definition (<code>FIELD_DEFS</code>) shared with the offline Excel template and the import validator. Each
        field cites the Agreement paragraph it traces to, or is marked implementation.
      </p>
      <MgrForm needsPartyCode={!hasRole(p, "party")} returnTo="/mgr/new" />
    </AppShell>
  );
}
