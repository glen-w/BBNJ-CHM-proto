/**
 * Role-aware list lead-ins. Public copy must not name pending or restricted
 * records that the current principal cannot open.
 */
export type ListAudience = "operator" | "stb" | "public";

export function listAudienceFromRoles(roles: readonly string[] | undefined): ListAudience {
  if (!roles?.length) return "public";
  if (roles.includes("secretariat") || roles.includes("publishing_authority") || roles.includes("party")) {
    return "operator";
  }
  if (roles.includes("stb")) return "stb";
  return "public";
}

const records = (n: number) => `${n} record${n === 1 ? "" : "s"} visible to your role`;
const activities = (n: number) => `${n} activit${n === 1 ? "y" : "ies"} visible to your role`;
const stubs = (n: number) => `${n} stub${n === 1 ? "" : "s"} visible to your role`;

export function mgrListCaption(audience: ListAudience, n: number): string {
  const head = records(n);
  if (audience === "operator") {
    return `${head} — including an interim DOALOS mirror, a pending Sargasso transect, an assisted Tonga-Kermadec notice, utilisation on the Indian Ridge cruise, and a restricted Polar Front eDNA batch.`;
  }
  if (audience === "stb") {
    return `${head} — published rows including the Indian Ridge utilisation cruise, the assisted Tonga-Kermadec notice, and the restricted Polar Front eDNA batch. Pending packs stay with the owner or Secretariat.`;
  }
  return `${head} — published, public-tier only. Sign in as party.nfp or secretariat to see drafts, pending packs, and restricted-tier batches.`;
}

export function eiaListCaption(audience: ListAudience, n: number): string {
  const head = `${activities(n)}.`;
  if (audience === "operator") {
    return `${head} Open the Polar Front observatory cable for a published decision and monitoring pack; the Indian Ridge vent field still has a pending draft EIA.`;
  }
  if (audience === "stb") {
    return `${head} The Polar Front observatory cable carries a published draft, decision and monitoring pack (in the STB queue until commented). Pending drafts are not visible until the Secretariat publishes.`;
  }
  return `${head} The Polar Front observatory cable carries a published decision and monitoring pack. Drafts and pending packs stay with the owner or Secretariat.`;
}

export function abmtListCaption(audience: ListAudience, n: number): string {
  const head = stubs(n);
  if (audience === "operator") {
    return `${head}. Sargasso and CCZ are published; Costa Rica Dome and the Indian Ridge vent field wait on the publish gate.`;
  }
  if (audience === "stb") {
    return `${head}. Published stubs only (Sargasso, CCZ). Pending candidates wait on the publish gate.`;
  }
  return `${head}. Published stubs only (Sargasso, CCZ). Sign in as party.nfp or secretariat to see pending candidates.`;
}

export function cbtmtListCaption(nNeeds: number, nOffers: number): string {
  return `${nNeeds} need${nNeeds === 1 ? "" : "s"} and ${nOffers} offer${nOffers === 1 ? "" : "s"} visible — including a SIDS sequencing pair with a facilitation note, and unmatched legal-policy / remote-sensing / ship-time rows so the shared-theme rule is not a full join.`;
}
