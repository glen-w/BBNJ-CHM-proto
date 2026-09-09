/**
 * Rich CSV seed pack — domain APIs only, idempotent keys `seed:csv:…`.
 * Loads fixtures/bbnj-chm-seed-pack at runtime; keeps smoke seeds intact.
 */
import type { Db } from "@/lib/db";
import type { ArtifactRef } from "@/lib/contracts/events";
import { createAbmtProposal, submitAbmtProposal } from "./abmt";
import { createCbtmtRecord, setMatchFacilitationNote, suggestMatch } from "./cbtmt";
import { addEiaPack, createEiaActivity } from "./eia";
import { addMgrPack, receivePreCollection } from "./mgr";
import { publishPack } from "./packs";
import type { Principal } from "./policy";
import { csvKey, getSeedPack } from "./seed-pack";

export interface RichSeedIds {
  mgr: { interimTemp: string; genomicsPacific: string };
  eia: {
    rocket: string;
    marineCdr: string;
    mesopelagic: string;
    noEiaBuoy: string;
  };
  cbtmt: { needs: Record<string, string>; offers: Record<string, string>; matchIds: string[] };
  abmt: { sargasso: string; crDome: string; cczPrecaution: string };
}

export function seedRichPack(db: Db, party: Principal, secretariat: Principal): RichSeedIds {
  const pack = getSeedPack();

  // ---- MGR (interim TEMP mirror + companion cruise)
  const mgrIds: Record<string, string> = {};
  for (const row of pack.mgr) {
    const r = receivePreCollection(
      db,
      party,
      {
        title: row.title,
        locationHint: row.locationHint,
        objectives: row.objectives,
        methodMeans: row.methodMeans,
        expectedDates: row.expectedDates,
        sponsoringInstitution: row.sponsoringInstitution,
        participationOpportunities: row.participationOpportunities,
        dataManagementPlan: row.dataManagementPlan,
        tkFpicFlag: false,
        confidentiality: "public",
      },
      "form",
      csvKey(row.seedKey),
      {
        at: row.at,
        summary: row.summary,
        artifactRefs: row.artifactRefs,
      },
    );
    mgrIds[row.seedKey] = r.batch.id;
    publishPack(db, secretariat, {
      domain: "mgr",
      recordId: r.batch.id,
      stage: "pre_collection",
      at: row.publishAt,
    });
    if (row.postCollection) {
      addMgrPack(
        db,
        party,
        r.batch.id,
        "post_collection",
        "Post-collection notification (demo companion cruise): eDNA filtrations logged; repository deposit pending",
        csvKey(`${row.seedKey}-post`),
      );
      publishPack(db, secretariat, {
        domain: "mgr",
        recordId: r.batch.id,
        stage: "post_collection",
        at: "2026-09-07T09:00:00.000Z",
      });
    }
  }

  // ---- EIA storylines
  const eiaIds: Record<string, string> = {};
  for (const row of pack.eia) {
    const act = createEiaActivity(db, party, { title: row.title, abnjBox: row.abnjBox }, csvKey(row.seedKey));
    eiaIds[row.seedKey] = act.activity.id;
    for (const p of row.packs) {
      const refs: ArtifactRef[] | undefined =
        p.stage === "screening" && row.artifact
          ? [row.artifact, { kind: "note", label: "Plausible demo scenario; not a real Party filing" }]
          : undefined;
      addEiaPack(db, party, act.activity.id, p.stage, p.summary, csvKey(`${row.seedKey}-${p.stage}`), {
        screeningOutcome: p.screeningOutcome,
        status: p.status === "published" ? "pending" : p.status,
        artifactRefs: refs,
        at: "2026-09-07T10:00:00.000Z",
      });
      if (p.status === "published") {
        publishPack(db, secretariat, {
          domain: "eia",
          recordId: act.activity.id,
          stage: p.stage,
          at: "2026-09-07T11:00:00.000Z",
        });
      }
    }
  }

  // ---- CBTMT needs / offers / matches
  const needIds: Record<string, string> = {};
  for (const row of pack.cbtmtNeeds) {
    const n = createCbtmtRecord(db, party, { kind: "need", title: row.title, themes: [...row.themes] }, csvKey(row.seedKey));
    needIds[row.seedKey] = n.record.id;
    publishPack(db, secretariat, {
      domain: "cbtmt",
      recordId: n.record.id,
      stage: "need_posted",
      at: "2026-09-07T12:00:00.000Z",
    });
  }
  const offerIds: Record<string, string> = {};
  for (const row of pack.cbtmtOffers) {
    const o = createCbtmtRecord(
      db,
      secretariat,
      { kind: "offer", title: row.title, themes: [...row.themes], provider: row.provider },
      csvKey(row.seedKey),
    );
    offerIds[row.seedKey] = o.record.id;
    publishPack(db, secretariat, {
      domain: "cbtmt",
      recordId: o.record.id,
      stage: "offer_posted",
      at: "2026-09-07T12:30:00.000Z",
    });
  }
  const matchIds: string[] = [];
  for (const row of pack.cbtmtMatches) {
    const needId = needIds[row.needSeedKey];
    const offerId = offerIds[row.offerSeedKey];
    if (!needId || !offerId) throw new Error(`Seed pack match references unknown need/offer: ${row.needSeedKey}/${row.offerSeedKey}`);
    const m = suggestMatch(db, secretariat, needId, offerId, row.rule, csvKey(`match-${row.needSeedKey}-${row.offerSeedKey}`));
    matchIds.push(m.match.id);
    setMatchFacilitationNote(db, secretariat, m.match.id, row.facilitationNote);
  }

  // ---- ABMT stubs
  const abmtIds: Record<string, string> = {};
  for (const row of pack.abmt) {
    const p = createAbmtProposal(db, party, { title: row.title }, csvKey(row.seedKey));
    abmtIds[row.seedKey] = p.proposal.id;
    submitAbmtProposal(db, party, p.proposal.id, csvKey(`${row.seedKey}-submit`));
    if (row.publish) {
      publishPack(db, secretariat, {
        domain: "abmt",
        recordId: p.proposal.id,
        stage: "proposal_stub",
        at: "2026-09-07T14:00:00.000Z",
      });
    }
  }

  return {
    mgr: {
      interimTemp: mgrIds["mgr-interim-temp-001"]!,
      genomicsPacific: mgrIds["mgr-genomics-pacific"]!,
    },
    eia: {
      rocket: eiaIds["eia-rocket-splashdown"]!,
      marineCdr: eiaIds["eia-marine-cdr-oae"]!,
      mesopelagic: eiaIds["eia-mesopelagic-fishery"]!,
      noEiaBuoy: eiaIds["eia-no-eia-buoy"]!,
    },
    cbtmt: { needs: needIds, offers: offerIds, matchIds },
    abmt: {
      sargasso: abmtIds["abmt-sargasso"]!,
      crDome: abmtIds["abmt-cr-dome"]!,
      cczPrecaution: abmtIds["abmt-ccz-precaution"]!,
    },
  };
}
