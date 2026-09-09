import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { flashFrom } from "@/components/flash";
import { Field, KeyFields, SubmitButton, selectClass } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { AbnjBox, ConfidentialityTier } from "@/lib/contracts/events";
import { createEiaAction } from "@/server/actions";
import { can, hasRole, recordRefusal } from "@/server/policy";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NewEiaPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const p = await getSessionUser();
  if (!can(p, "submit")) {
    recordRefusal(p, "submit", { domain: "eia", path: "/eia/new", reason: "Activity form requested without the submit permission" });
    return (
      <AppShell title="EIA — new activity" flash={flash}>
        <p className="text-sm">
          Creating an activity requires a Party or Secretariat login.{" "}
          <Link href="/login?return=/eia/new" className="underline">
            Switch login
          </Link>
          .
        </p>
      </AppShell>
    );
  }
  return (
    <AppShell title="EIA — new planned activity" flash={flash}>
      <form action={createEiaAction} className="max-w-xl space-y-4 rounded-lg border p-4">
        <KeyFields returnTo="/eia/new" />
        <Field label="Activity title" required>
          <Input name="title" required placeholder="e.g. Sediment sampling, CCZ" />
        </Field>
        <Field label="ABNJ box" hint="Small fixed vocabulary — no map in this build; neighbourhood = same box." basis="implementation">
          <select name="abnjBox" className={selectClass} defaultValue="CCZ">
            {AbnjBox.options.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Field>
        {!hasRole(p, "party") ? (
          <Field label="Party code (on behalf)" required>
            <Input name="partyCode" defaultValue="XSD" maxLength={3} />
          </Field>
        ) : null}
        <Field label="Confidentiality tier" basis="implementation — PrepCom3 annex categories">
          <select name="confidentiality" className={selectClass} defaultValue="public">
            {ConfidentialityTier.options.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <SubmitButton>Create activity (opens a draft screening pack)</SubmitButton>
      </form>
    </AppShell>
  );
}
