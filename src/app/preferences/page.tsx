import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { flashFrom } from "@/components/flash";
import { Field, KeyFields, SubmitButton, selectClass } from "@/components/forms";
import { AbnjBox } from "@/lib/contracts/events";
import { getDb } from "@/lib/db";
import { savePreferencesAction } from "@/server/actions";
import { getSubscription } from "@/server/queries";
import { CBTMT_THEMES } from "@/server/seed";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PreferencesPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const p = await getSessionUser();
  const sub = getSubscription(getDb(), p);

  return (
    <AppShell title="Subscription preferences" flash={flash}>
      {p.kind === "anonymous" ? (
        <p className="text-sm">
          <Link href="/login?return=/preferences" className="underline">
            Sign in
          </Link>{" "}
          to manage a subscription.
        </p>
      ) : (
        <form action={savePreferencesAction} className="max-w-2xl space-y-5 rounded-lg border p-4">
          <KeyFields returnTo="/preferences" />
          <p className="text-sm text-muted-foreground">
            The dispatcher matches every newly published pack against these filters (plus record ownership and role targets), then applies the same
            read policy that governs lists — you cannot subscribe your way past a confidentiality tier.
          </p>
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Domains</legend>
            {(["mgr", "eia", "cbtmt"] as const).map((d) => (
              <label key={d} className="mr-4 inline-flex items-center gap-1 text-sm">
                <input type="checkbox" name="domains" value={d} defaultChecked={sub?.domains.includes(d)} /> {d.toUpperCase()}
              </label>
            ))}
            <label className="mr-4 inline-flex items-center gap-1 text-sm opacity-50" title="Reserved — not in this build">
              <input type="checkbox" disabled /> ABMT
            </label>
          </fieldset>
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">ABNJ boxes (EIA neighbourhood)</legend>
            {AbnjBox.options.map((b) => (
              <label key={b} className="mr-4 inline-flex items-center gap-1 text-sm">
                <input type="checkbox" name="abnjBoxes" value={b} defaultChecked={sub?.abnjBoxes.includes(b)} /> {b}
              </label>
            ))}
          </fieldset>
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">CBTMT themes</legend>
            {CBTMT_THEMES.map((t) => (
              <label key={t} className="mr-4 inline-flex items-center gap-1 text-sm">
                <input type="checkbox" name="themes" value={t} defaultChecked={sub?.themes.includes(t)} /> {t}
              </label>
            ))}
          </fieldset>
          <Field label="Digest cadence" hint="Digest rows are seeded only in this build; no scheduler runs.">
            <select name="digest" defaultValue={sub?.digest ?? "daily"} className={selectClass}>
              <option value="immediate">immediate</option>
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
            </select>
          </Field>
          <SubmitButton>Save subscription</SubmitButton>
        </form>
      )}
    </AppShell>
  );
}
