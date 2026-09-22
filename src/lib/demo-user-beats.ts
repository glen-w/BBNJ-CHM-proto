export type DemoUserBeat = {
  n: number;
  title: string;
  blurb: string;
  login: string;
  href: string;
};

/** Ordered demo path — links resolved at render time from seeded record ids. */
export function demoUserBeats(links: {
  mgrA?: string;
  eia2?: string;
}): DemoUserBeat[] {
  return [
    {
      n: 1,
      title: "Public view",
      blurb: "Published, public records only. Search and exports follow the same rule.",
      login: "public",
      href: "/",
    },
    {
      n: 2,
      title: "Party receipt (B-SBI)",
      blurb: "Submit an MGR pre-collection notification: receiptId and B-SBI appear at valid receipt, before any publish.",
      login: "party.nfp",
      href: links.mgrA ? `/mgr/${links.mgrA}` : "/mgr/new",
    },
    {
      n: 3,
      title: "Secretariat publish + import",
      blurb: "Publish records that are waiting, run the offline Excel import, and review the audit, including refusals.",
      login: "secretariat",
      href: "/mgr/import",
    },
    {
      n: 4,
      title: "STB review",
      blurb: "Published draft EIAs enter the review queue; one consolidated comment per version.",
      login: "stb",
      href: links.eia2 ? `/eia/${links.eia2}` : "/stb",
    },
    {
      n: 5,
      title: "Expression of interest",
      blurb: "The expression-of-interest summary, then how this Clearing House compares with the interim DOALOS pages.",
      login: "public",
      href: "/exhibit",
    },
  ];
}
