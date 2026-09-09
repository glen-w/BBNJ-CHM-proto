import { afterEach, describe, expect, it } from "vitest";

import { PUBLIC_RECORD_ID_PATTERN } from "@/lib/contracts/extensions";
import { createAbmtProposal, getAbmtProposal, submitAbmtProposal } from "@/server/abmt";
import { publishPack } from "@/server/packs";
import { listAbmtProposals } from "@/server/queries";
import { createHarness, expectDomainCode, type Harness } from "@/test/helpers";

describe("ABMT thin journey", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("draft → pending → publish mints BBNJ-ABMT- and hides pending from public", () => {
    h = createHarness();
    expectDomainCode(() => createAbmtProposal(h.db, h.party(), { title: "  " }, h.key()), "validation");
    expectDomainCode(() => createAbmtProposal(h.db, h.nonstate(), { title: "No" }, h.key()), "forbidden");

    const k = h.key();
    const draft = createAbmtProposal(h.db, h.party(), { title: "Seamount MPA proposal stub" }, k);
    expect(draft.created).toBe(true);
    expect(draft.event.status).toBe("draft");
    expect(draft.event.stage).toBe("proposal_stub");
    expect(createAbmtProposal(h.db, h.party(), { title: "ignored" }, k).proposal.id).toBe(draft.proposal.id);

    const pending = submitAbmtProposal(h.db, h.party(), draft.proposal.id, h.key());
    expect(pending.event.status).toBe("pending");
    expect(pending.event.receiptId).toMatch(/^BBNJ-RCPT-/);
    expect(listAbmtProposals(h.db, h.pub())).toHaveLength(0);

    expectDomainCode(
      () => publishPack(h.db, h.party(), { domain: "abmt", recordId: draft.proposal.id, stage: "proposal_stub" }),
      "forbidden",
    );
    const pub = publishPack(h.db, h.secretariat(), { domain: "abmt", recordId: draft.proposal.id, stage: "proposal_stub" });
    expect(pub.event.publicRecordId).toMatch(PUBLIC_RECORD_ID_PATTERN);
    expect(pub.event.publicRecordId).toMatch(/^BBNJ-ABMT-/);
    expect(getAbmtProposal(h.db, draft.proposal.id)?.publicRecordId).toBe(pub.event.publicRecordId);
    expect(listAbmtProposals(h.db, h.pub()).some((p) => p.id === draft.proposal.id)).toBe(true);
  });
});
