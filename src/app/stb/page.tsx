import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { flashFrom } from "@/components/flash";
import { Field, KeyFields, SubmitButton } from "@/components/forms";
import { Textarea } from "@/components/ui/textarea";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { commentStbAction } from "@/server/actions";
import { stbQueue } from "@/server/eia";
import { can } from "@/server/policy";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function StbPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const sp = await searchParams;
  const clearedId = typeof sp.cleared === "string" ? sp.cleared : undefined;
  const p = await getSessionUser();
  const queue = stbQueue(getDb(), p);
  const canComment = can(p, "comment_stb");

  return (
    <AppShell title="STB review queue — published draft EIAs awaiting consolidated comments" flash={flash}>
      <p className="max-w-3xl text-sm text-muted-foreground">
        The STB sees exactly what the public sees — <strong>published</strong> draft EIA packs — plus restricted-tier records. A pack leaves the queue
        when a <code>comments_stb</code> row exists for the same version; one consolidated comment per version (Arts 34–35).
      </p>
      {!canComment ? (
        <p className="text-sm">
          Commenting requires the STB login.{" "}
          <Link href="/login?return=/stb" className="underline">
            Switch login
          </Link>
          .
        </p>
      ) : null}
      {queue.length === 0 ? (
        clearedId ? (
          <p className="rounded-lg border border-published-line bg-published/10 p-4 text-sm">
            Queue cleared — consolidated <code>comments_stb</code> comment recorded.{" "}
            <Link href={`/eia/${clearedId}`} className="font-medium underline">
              Open the activity
            </Link>
            .
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Queue is empty.</p>
        )
      ) : (
        <ul className="space-y-4">
          {queue.map((q) => (
            <li key={q.eventId} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link href={`/eia/${q.activityId}`} className="font-medium hover:underline">
                    {q.title}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    draft EIA v{q.version} · published {fmtDate(q.publishedAt)} · box {q.abnjBox} · <span className="font-mono">{q.publicRecordId}</span>
                  </div>
                </div>
              </div>
              {canComment ? (
                <form action={commentStbAction} className="mt-3 space-y-2">
                  <KeyFields returnTo="/stb" />
                  <input type="hidden" name="activityId" value={q.activityId} />
                  <Field label="Consolidated STB comment" required>
                    <Textarea name="text" rows={3} required placeholder="Consolidated observations on the draft EIA…" />
                  </Field>
                  <SubmitButton size="sm">Record comment (publishes comments_stb v{q.version})</SubmitButton>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
