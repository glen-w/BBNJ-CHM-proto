import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ChannelBadge, ConfidentialityBadge, DomainBadge, Identifier, ProvenanceBadge, StageChip, TierNote } from "@/components/chips";
import { RecordExportLinks } from "@/components/export-links";
import { flashFrom } from "@/components/flash";
import { KeyFields, SubmitButton } from "@/components/forms";
import { PublishButton } from "@/components/publish-button";
import { Timeline } from "@/components/timeline";
import { TreatyCiteDrawer } from "@/components/treaty-cite-drawer";
import { VersionHistory } from "@/components/version-history";
import { WithoutPrejudiceBanner } from "@/components/without-prejudice";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { submitAbmtAction } from "@/server/actions";
import { getAbmtProposal } from "@/server/abmt";
import { can } from "@/server/policy";
import { packsOf, recordVisible, timelineOf } from "@/server/queries";
import { isIsaNotUndermineAbmt, provenanceBadgeForTitle } from "@/server/seed-pack";
import { getSessionUser } from "@/server/session";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AbmtProposalPage({ params, searchParams }: Props) {
  const { id } = await params;
  const flash = await flashFrom(searchParams);
  const p = await getSessionUser();
  const db = getDb();
  if (!recordVisible(db, p, "abmt", id)) notFound();
  const proposal = getAbmtProposal(db, id);
  if (!proposal) notFound();
  const packs = packsOf(db, p, id);
  const timeline = timelineOf(db, p, id);
  const owner = can(p, "submit", { ownerUserId: proposal.ownerUserId ?? null, domain: "abmt" });
  const here = `/abmt/${id}`;
  const latest = packs.filter((e) => e.stage === "proposal_stub").sort((a, b) => b.seq - a.seq)[0];
  const canSubmit = owner && latest?.status === "draft";
  const provenance = provenanceBadgeForTitle(proposal.title);
  const isaCaption = isIsaNotUndermineAbmt(proposal.title);

  return (
    <AppShell title={`ABMT proposal stub — ${proposal.title}`} flash={flash}>
      <WithoutPrejudiceBanner />
      {isaCaption ? (
        <p className="rounded-md border border-caution-line bg-caution/40 px-3 py-2 text-xs text-caution-foreground">
          Not-undermine caption (demo): this CCZ network-node stub is illustrative only and does not purport to displace or undermine ISA processes
          under UNCLOS or the Exploration Regulations.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/abmt" className="text-sm underline">
            ← All proposals
          </Link>
          <DomainBadge domain="abmt" withIcon />
          <ChannelBadge channel={proposal.sourceChannel} />
          <ConfidentialityBadge tier={proposal.confidentiality} />
          {provenance ? <ProvenanceBadge badge={provenance} /> : null}
          <span className="font-mono text-xs text-muted-foreground">Party {proposal.partyCode}</span>
          <TreatyCiteDrawer domain="abmt" stages={packs.map((e) => e.stage)} />
        </div>
        <RecordExportLinks publicRecordId={proposal.publicRecordId} />
      </div>
      <TierNote tier={proposal.confidentiality} />

      <section className="grid gap-3 sm:grid-cols-3">
        <Identifier label="internalId" value={proposal.id} caption="UUID at creation — never shown as a public identifier" />
        <Identifier label="receiptId" value={packs.find((e) => e.receiptId)?.receiptId} caption="Issued when the proposal stub entered pending" />
        <Identifier label="publicRecordId" value={proposal.publicRecordId} caption="BBNJ-ABMT-YYYY-NNNNN, minted at the first publish" />
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Pack — status lives here</h2>
        <div className="flex flex-wrap items-center gap-2">
          {packs.length === 0 ? <span className="text-sm text-muted-foreground">No packs visible to your role.</span> : null}
          {packs.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-2">
              <StageChip stage={e.stage} status={e.status} version={e.version} />
              <span className="text-xs text-muted-foreground">
                {e.summary} · {fmtDate(e.at)}
              </span>
              {e.status === "pending" && can(p, "publish") ? <PublishButton domain="abmt" recordId={id} stage={e.stage} version={e.version} returnTo={here} /> : null}
            </div>
          ))}
        </div>
        {canSubmit ? (
          <form action={submitAbmtAction} className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
            <KeyFields returnTo={here} />
            <input type="hidden" name="proposalId" value={id} />
            <SubmitButton size="sm">Submit proposal stub (pending)</SubmitButton>
            <span className="text-xs text-muted-foreground">Moves the draft to pending and issues a receiptId. The Secretariat publishes.</span>
          </form>
        ) : null}
        {!owner && p.kind === "anonymous" ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Public view: published packs only.{" "}
            <Link href={`/login?return=${here}`} className="underline">
              Switch login
            </Link>
            .
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border p-4" id="versions">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Version history</h2>
        <VersionHistory packs={packs} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Timeline</h2>
        <Timeline rows={timeline} />
        <p className="mt-2 text-xs text-muted-foreground">
          Without prejudice: a <code>proposal_stub</code> row on the shared outbox, nothing more. Its shape is the same as every other pack row so
          later ABMT packages can reuse the receipt and publish record unchanged.
        </p>
      </section>
    </AppShell>
  );
}
