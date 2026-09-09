import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { flashFrom } from "@/components/flash";
import { Field, KeyFields, SubmitButton, selectClass } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { WithoutPrejudiceBanner } from "@/components/without-prejudice";
import { ConfidentialityTier } from "@/lib/contracts/events";
import { createAbmtAction } from "@/server/actions";
import { can, hasRole, isSecretariat, recordRefusal } from "@/server/policy";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NewAbmtPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const p = await getSessionUser();
  if (!can(p, "submit", { domain: "abmt" })) {
    recordRefusal(p, "submit", { domain: "abmt", path: "/abmt/new", reason: "ABMT proposal form requested without the submit permission" });
    return (
      <AppShell title="ABMT — new proposal stub" flash={flash}>
        <p className="text-sm">
          Opening a proposal stub requires a Party or Secretariat login.{" "}
          <Link href="/login?return=/abmt/new" className="underline">
            Switch login
          </Link>
          .
        </p>
      </AppShell>
    );
  }
  return (
    <AppShell title="ABMT — new proposal stub" flash={flash}>
      <WithoutPrejudiceBanner />
      <form action={createAbmtAction} className="max-w-xl space-y-4 rounded-lg border p-4">
        <KeyFields returnTo="/abmt/new" />
        <Field label="Proposal title" required hint="A working title only. The stub carries no ABMT content fields in this build.">
          <Input name="title" required placeholder="e.g. Proposal stub — seamount reference area" />
        </Field>
        {!hasRole(p, "party") ? (
          <Field label="Party code (on behalf)" required hint={isSecretariat(p) ? "Secretariat-assisted: recorded as sourceChannel = assisted." : undefined}>
            <Input name="partyCode" defaultValue="XSD" maxLength={3} />
          </Field>
        ) : null}
        <Field label="Confidentiality tier" basis="PrepCom3 annex categories">
          <select name="confidentiality" className={selectClass} defaultValue="public">
            {ConfidentialityTier.options.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <SubmitButton>Open proposal stub (draft)</SubmitButton>
        <p className="text-xs text-muted-foreground">
          Opens a <code>proposal_stub</code> pack as a draft. Submit it from the proposal page to obtain a receipt; the Secretariat publishes it like any
          other pack.
        </p>
      </form>
    </AppShell>
  );
}
