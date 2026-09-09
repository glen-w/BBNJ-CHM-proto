import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { flashFrom } from "@/components/flash";
import { KeyFields, SubmitButton } from "@/components/forms";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { markAllReadAction, runDigestAction } from "@/server/actions";
import { can } from "@/server/policy";
import { getSubscription, notificationsFor } from "@/server/queries";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NotificationsPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const p = await getSessionUser();
  const db = getDb();
  const items = notificationsFor(db, p, 100);
  const sub = getSubscription(db, p);
  const canRunDigest = can(p, "run_digest");

  return (
    <AppShell title="Notifications" flash={flash}>
      {p.kind === "anonymous" ? (
        <p className="text-sm">
          Notifications require a login.{" "}
          <Link href="/login?return=/notifications" className="underline">
            Switch login
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="max-w-2xl text-sm text-muted-foreground">
              Kinds: publish · deadline · digest · match · stb_review. Rows are produced by the dispatcher from published outbox events only; drafts and
              pending packs never notify.{" "}
              {sub ? (
                sub.digest === "immediate" ? (
                  <>Your cadence is <strong>immediate</strong>: every matching publication reaches the bell at once.</>
                ) : (
                  <>
                    Your cadence is <strong>{sub.digest}</strong>: subscription matches are <em>held</em> and rolled into one digest row per window. Rows
                    about your own records, STB review requests, deadlines and material amendments still arrive immediately.
                  </>
                )
              ) : null}
            </p>
            <div className="flex flex-wrap gap-2">
              {canRunDigest ? (
                <form action={runDigestAction} className="flex gap-1">
                  <KeyFields returnTo="/notifications" />
                  <SubmitButton variant="outline" size="sm" title="Rolls held publications into one digest row per daily/weekly subscriber (idempotent)">
                    Run digest now
                  </SubmitButton>
                </form>
              ) : null}
              <Link href="/preferences" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                Subscription preferences
              </Link>
              <form action={markAllReadAction}>
                <input type="hidden" name="_return" value="/notifications" />
                <SubmitButton variant="secondary" size="sm">
                  Mark all read
                </SubmitButton>
              </form>
            </div>
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {items.map((n) => (
                <li key={n.id} className={cn("flex flex-wrap items-start justify-between gap-2 p-3 text-sm", !n.read && "bg-primary/5")}>
                  <div>
                    <span className="mr-2 rounded bg-muted px-1.5 text-xs uppercase">{n.kind.replace("_", " ")}</span>
                    <Link href={`/audit?event=${n.eventId}`} className="hover:underline">
                      {n.summary}
                    </Link>
                  </div>
                  <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">{fmtDate(n.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </AppShell>
  );
}
