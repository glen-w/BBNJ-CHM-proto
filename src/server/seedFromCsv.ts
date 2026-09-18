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
  mgr: {
    interimTemp: string;
    genomicsPacific: string;
    hydrothermalIndian: string;
    sargassoPending: string;
    assistedSids: string;
    southernEdna: string;
  };
  eia: {
    rocket: string;
    marineCdr: string;
    mesopelagic: string;
    noEiaBuoy: string;
    cableSouthern: string;
    ventIndian: string;
  };
  cbtmt: { needs: Record<string, string>; offers: Record<string, string>; matchIds: string[] };
  abmt: { sargasso: string; crDome: string; cczPrecaution: string; indianVents: string };
}

export function seedRichPack(db: Db, party: Principal, secretariat: Principal): RichSeedIds {
  const pack = getSeedPack();

  // ---- MGR (interim TEMP mirror + geographically varied demo cruises)
  const mgrIds: Record<string, string> = {};
  for (const row of pack.mgr) {
    const actor = row.sourceChannel === "assisted" ? secretariat : party;
    const channel = row.sourceChannel === "excel" ? "excel" : "form";
    const r = receivePreCollection(
      db,
      actor,
      {
        title: row.title,
        locationHint: row.locationHint,
        objectives: row.objectives,
        methodMeans: row.methodMeans,
        expectedDates: row.expectedDates,
        sponsoringInstitution: row.sponsoringInstitution,
        participationOpportunities: row.participationOpportunities,
        dataManagementPlan: row.dataManagementPlan,
        tkFpicFlag: row.tkFpicFlag,
        confidentiality: row.confidentiality,
      },
      channel,
      csvKey(row.seedKey),
      {
        partyCode: "XSD",
        at: row.at,
        summary: row.summary,
        artifactRefs: row.artifactRefs,
      },
    );
    mgrIds[row.seedKey] = r.batch.id;
    if (row.publish) {
      publishPack(db, secretariat, {
        domain: "mgr",
        recordId: r.batch.id,
        stage: "pre_collection",
        at: row.publishAt,
      });
    }
    if (row.postCollection) {
      const postAt = new Date(Date.parse(row.publishAt) + 24 * 3600_000).toISOString();
      addMgrPack(
        db,
        party,
        r.batch.id,
        "post_collection",
        "Post-collection notification (demo): samples logged; repository deposit pending",
        csvKey(`${row.seedKey}-post`),
        { at: postAt },
      );
      if (row.publish) {
        publishPack(db, secretariat, {
          domain: "mgr",
          recordId: r.batch.id,
          stage: "post_collection",
          at: new Date(Date.parse(postAt) + 3600_000).toISOString(),
        });
      }
    }
    if (row.utilisation) {
      const utilAt = new Date(Date.parse(row.publishAt) + 48 * 3600_000).toISOString();
      addMgrPack(
        db,
        party,
        r.batch.id,
        "utilisation",
        "Utilisation notification (Art 12.8, demo): sequence data deposited; no commercial utilisation declared",
        csvKey(`${row.seedKey}-util`),
        { at: utilAt },
      );
      if (row.publish) {
        publishPack(db, secretariat, {
          domain: "mgr",
          recordId: r.batch.id,
          stage: "utilisation",
          at: new Date(Date.parse(utilAt) + 3600_000).toISOString(),
        });
      }
    }
  }

  // ---- EIA storylines
  const eiaIds: Record<string, string> = {};
  for (const row of pack.eia) {
    const act = createEiaActivity(
      db,
      party,
      { title: row.title, abnjBox: row.abnjBox, confidentiality: row.confidentiality },
      csvKey(row.seedKey),
    );
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
      hydrothermalIndian: mgrIds["mgr-hydrothermal-indian"]!,
      sargassoPending: mgrIds["mgr-sargasso-pending"]!,
      assistedSids: mgrIds["mgr-assisted-sids"]!,
      southernEdna: mgrIds["mgr-southern-edna"]!,
    },
    eia: {
      rocket: eiaIds["eia-rocket-splashdown"]!,
      marineCdr: eiaIds["eia-marine-cdr-oae"]!,
      mesopelagic: eiaIds["eia-mesopelagic-fishery"]!,
      noEiaBuoy: eiaIds["eia-no-eia-buoy"]!,
      cableSouthern: eiaIds["eia-cable-southern"]!,
      ventIndian: eiaIds["eia-vent-indian"]!,
    },
    cbtmt: { needs: needIds, offers: offerIds, matchIds },
    abmt: {
      sargasso: abmtIds["abmt-sargasso"]!,
      crDome: abmtIds["abmt-cr-dome"]!,
      cczPrecaution: abmtIds["abmt-ccz-precaution"]!,
      indianVents: abmtIds["abmt-indian-vents"]!,
    },
  };
}
