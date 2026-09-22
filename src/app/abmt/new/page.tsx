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
      <AppShell title="New ABMT proposal" flash={flash}>
        <p className="text-sm">
          Opening a proposal requires a Party or Secretariat login.{" "}
          <Link href="/login?return=/abmt/new" className="underline">
            Switch login
          </Link>
          .
        </p>
      </AppShell>
    );
  }
  return (
    <AppShell title="New ABMT proposal" flash={flash}>
      <WithoutPrejudiceBanner />
      <form action={createAbmtAction} className="max-w-xl space-y-4 rounded-lg border p-4">
        <KeyFields returnTo="/abmt/new" />
        <Field label="Proposal title" required hint="A title for now. The full content of an area-based measure is for the Conference of the Parties.">
          <Input name="title" required placeholder="e.g. Seamount reference area" />
        </Field>
        {!hasRole(p, "party") ? (
          <Field label="Party code (on behalf)" required hint={isSecretariat(p) ? "Secretariat-assisted intake, recorded as the assisted channel." : undefined}>
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
        <SubmitButton>Save proposal (draft)</SubmitButton>
        <p className="text-xs text-muted-foreground">
          Saves a draft. Submit it from the proposal page for a receipt. The Secretariat publishes it.
        </p>
      </form>
    </AppShell>
  );
}
