import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ConfidentialityBadge, StatusChip } from "@/components/chips";
import { ExportLinks } from "@/components/export-links";
import { flashFrom } from "@/components/flash";
import { Field, KeyFields, SubmitButton, selectClass } from "@/components/forms";
import { PublishButton } from "@/components/publish-button";
import { Input } from "@/components/ui/input";
import type { StoredCbtmtRecord } from "@/lib/contracts/extensions";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { Textarea } from "@/components/ui/textarea";
import { createCbtmtAction, setFacilitationNoteAction, suggestMatchAction, suggestMatchesAction } from "@/server/actions";
import { matchesForRecord } from "@/server/cbtmt";
import { latestPackRow } from "@/server/outbox";
import { can, hasRole } from "@/server/policy";
import { listCbtmtRecords } from "@/server/queries";
import { CBTMT_THEMES } from "@/server/seed";
import { getSessionUser } from "@/server/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CapacityPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);
  const p = await getSessionUser();
  const db = getDb();
  const records = listCbtmtRecords(db, p);
  const needs = records.filter((r) => r.kind === "need");
  const offers = records.filter((r) => r.kind === "offer");
  const matchesSeen = new Set<string>();
  const matches = records.flatMap((r) => matchesForRecord(db, r.id)).filter((m) => (matchesSeen.has(m.id) ? false : (matchesSeen.add(m.id), true)));
  const canMatch = can(p, "suggest_match");

  return (
    <AppShell title="Capacity-building and transfer of marine technology (CBTMT) — Part V" flash={flash}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Needs and offers are records with a pending → published pack. A <strong>match</strong> is a row (need, offer, rule, at) plus a{" "}
          <code>match_suggested</code> outbox event carrying the <code>matchId</code>. Matching is a <strong>deterministic shared-theme rule</strong>, not
          brokerage and not ML: the rule only finds the pair. What the Secretariat then does with it is written by a person as a{" "}
          <em>facilitation note</em> on the match.
        </p>
        <ExportLinks domain="cbtmt" />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <Board title="Needs (Parties, Art 42)" items={needs} p={p} kind="need" />
        <Board title="Offers (providers)" items={offers} p={p} kind="offer" />
      </section>

      <section className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Matches (rows in cbtmt_matches)</h2>
          {canMatch ? (
            <form action={suggestMatchesAction}>
              <KeyFields returnTo="/capacity" />
              <SubmitButton size="sm" variant="secondary" title="Evaluates every published need × offer; inserts a row per shared theme, ignoring existing pairs">
                Run shared-theme rule
              </SubmitButton>
            </form>
          ) : null}
        </div>
        {matches.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No matches yet.</p>
        ) : (
          <ul className="mt-2 divide-y text-sm">
            {matches.map((m) => (
              <li key={m.id} className="space-y-2 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <Link href={`/capacity/${m.needId}`} className="hover:underline">
                      {m.needTitle}
                    </Link>{" "}
                    ↔{" "}
                    <Link href={`/capacity/${m.offerId}`} className="hover:underline">
                      {m.offerTitle}
                    </Link>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {m.rule} · {fmtDate(m.at)}
                  </span>
                </div>
                {m.facilitationNote ? (
                  <p className="rounded-md border-l-2 border-domain-cbtmt-line bg-domain-cbtmt/50 px-3 py-2 text-xs leading-relaxed text-domain-cbtmt-foreground">
                    <span className="font-medium">Secretariat facilitation note:</span> {m.facilitationNote}
                  </p>
                ) : canMatch ? (
                  <p className="text-xs italic text-muted-foreground">No facilitation note yet — the rule found the pair; nobody has recorded what happened next.</p>
                ) : null}
                {canMatch ? (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">{m.facilitationNote ? "Revise facilitation note" : "Add facilitation note"}</summary>
                    <form action={setFacilitationNoteAction} className="mt-2 space-y-2">
                      <KeyFields returnTo="/capacity" />
                      <input type="hidden" name="matchId" value={m.id} />
                      <Field label="What the Secretariat did with this match" hint="Human annotation only: no event, no notification, no ML. Overwrites the previous note.">
                        <Textarea name="note" rows={3} defaultValue={m.facilitationNote ?? ""} required />
                      </Field>
                      <SubmitButton size="sm" variant="outline">
                        Save note
                      </SubmitButton>
                    </form>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {canMatch && needs.length && offers.length ? (
          <form action={suggestMatchAction} className="mt-4 grid gap-2 border-t pt-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
            <KeyFields returnTo="/capacity" />
            <Field label="Need">
              <select name="needId" className={selectClass}>
                {needs.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Offer">
              <select name="offerId" className={selectClass}>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Rule label">
              <Input name="rule" defaultValue="manual" />
            </Field>
            <SubmitButton size="sm">Suggest match</SubmitButton>
          </form>
        ) : null}
      </section>

      {can(p, "submit") ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <PostForm kind="need" p={p} />
          <PostForm kind="offer" p={p} />
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          Posting needs or offers requires a Party or Secretariat login.{" "}
          <Link href="/login?return=/capacity" className="underline">
            Switch login
          </Link>
          .
        </p>
      )}
    </AppShell>
  );
}

function Board({ title, items, p, kind }: { title: string; items: StoredCbtmtRecord[]; p: Awaited<ReturnType<typeof getSessionUser>>; kind: "need" | "offer" }) {
  const db = getDb();
  return (
    <div className="rounded-lg border p-4">
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">{title}</h2>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">Nothing visible to your role.</p> : null}
      <ul className="space-y-2">
        {items.map((r) => {
          const pack = latestPackRow(db, r.id, kind === "need" ? "need_posted" : "offer_posted");
          const status = pack?.status;
          return (
            <li key={r.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/capacity/${r.id}`} className="font-medium hover:underline">
                  {r.title}
                </Link>
                <span className="flex items-center gap-1">
                  {status ? <StatusChip status={status} /> : null}
                  <ConfidentialityBadge tier={r.confidentiality} />
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                {r.kind === "need" ? <span className="font-mono">Party {r.partyCode}</span> : <span>{r.provider}</span>}
                <span>·</span>
                {r.themes.map((t) => (
                  <span key={t} className="rounded bg-muted px-1.5">
                    {t}
                  </span>
                ))}
                <span>·</span>
                <span className="font-mono">{r.publicRecordId ?? "unpublished"}</span>
              </div>
              {status === "pending" && can(p, "publish") && pack ? (
                <div className="mt-2">
                  <PublishButton domain="cbtmt" recordId={r.id} stage={pack.stage} version={pack.version} returnTo="/capacity" label="Publish" />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PostForm({ kind, p }: { kind: "need" | "offer"; p: Awaited<ReturnType<typeof getSessionUser>> }) {
  return (
    <form action={createCbtmtAction} className="space-y-3 rounded-lg border p-4">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Post a {kind}</h2>
      <KeyFields returnTo="/capacity" />
      <input type="hidden" name="kind" value={kind} />
      <Field label="Title" required>
        <Input name="title" required />
      </Field>
      <Field label="Themes" hint={`Comma-separated. Allowed: ${CBTMT_THEMES.join(", ")}.`} required>
        <Input name="themes" placeholder="taxonomy, genomics" required />
      </Field>
      {kind === "need" && !hasRole(p, "party") ? (
        <Field label="Party code (on behalf)" required>
          <Input name="partyCode" defaultValue="XSD" maxLength={3} />
        </Field>
      ) : null}
      {kind === "offer" ? (
        <Field label="Provider" required>
          <Input name="provider" required placeholder="Institution / consortium" />
        </Field>
      ) : null}
      <Field label="Confidentiality tier" hint="public: everyone · restricted: Secretariat, owner, STB · confidential: Secretariat and owner only">
        <select name="confidentiality" className={selectClass} defaultValue="public">
          <option value="public">public</option>
          <option value="restricted">restricted</option>
          <option value="confidential">confidential</option>
        </select>
      </Field>
      <SubmitButton size="sm">Post {kind} (pending)</SubmitButton>
    </form>
  );
}
