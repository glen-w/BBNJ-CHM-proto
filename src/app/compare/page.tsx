import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/lib/db";
import { cn } from "@/lib/utils";
import { findEventByKey } from "@/server/outbox";
import { can } from "@/server/policy";
import { getSessionUser } from "@/server/session";

type Row = { area: string; interim: string; prototype: string; links: { href: string; label: string; external?: boolean }[] };
type Section = { n: number; title: string; para: string; rows: Row[] };

export default async function ComparePage() {
  const p = await getSessionUser();
  const db = getDb();
  // Seeded records reached through their fixed idempotency keys — links survive db:reset.
  const rec = (key: string) => findEventByKey(db, `seed:${key}`)?.recordId;
  const mgrA = rec("mgr-a");
  const mgrD = rec("mgr-d");
  const eia2 = rec("eia-2");
  const eia3 = rec("eia-3");
  const need = rec("cbtmt-need");
  const secretariat = can(p, "view_full_audit");
  const loginHint = secretariat ? "" : " (sign in as secretariat to see the full projection)";

  const sections: Section[] = [
    {
      n: 1,
      title: "Receipt, management and storage of information",
      para: "Consolidated study ¶61: submission/publishing, search/retrieval, reporting/export. The interim set-up receives documents; the prototype receives structured records, validates them, versions them and exports them.",
      rows: [
        {
          area: "Intake",
          interim: "Informal e-mail / static pages; documents as files",
          prototype: "Structured forms generated from one field definition (Art 12.2 a–j); offline .xlsx template with the same headers; Secretariat-assisted import",
          links: [
            { href: "/mgr/new", label: "MGR form" },
            { href: "/api/template/mgr.xlsx", label: "Template .xlsx", external: true },
            { href: "/mgr/import", label: "Import (Secretariat)" },
          ],
        },
        {
          area: "Offline / SIDS loop",
          interim: "No offline path; no validation feedback",
          prototype: "Download → fill offline → import → per-row validation → error workbook pre-filled with failed rows → fix → re-import. Durable run record.",
          links: [{ href: "/mgr/import", label: "Import runs" }],
        },
        {
          area: "Identifiers",
          interim: "No Art 12 B-SBI; file names",
          prototype: "internalId → receiptId (pending) → B-SBI at valid pre-collection receipt, before publish → publicRecordId at first publish. Stable /records/<id> URL.",
          links: [...(mgrA ? [{ href: `/mgr/${mgrA}`, label: "Batch DEMO-01" }] : []), { href: "/records/BBNJ-MGR-2026-00001", label: "/records/…" }],
        },
        {
          area: "Versioning",
          interim: "Replace the file",
          prototype: "Published packs are amended as pending v+1 with a change note; material changes re-notify earlier readers; every version stays in the outbox.",
          links: mgrA ? [{ href: `/mgr/${mgrA}#versions`, label: "Version history (post-collection v1 → v2)" }] : [],
        },
        {
          area: "Confidentiality",
          interim: "All or nothing",
          prototype: "public / restricted / confidential enforced in SQL for lists, counts, feeds, audit, exports and notifications; each page states who can see it.",
          links: [...(mgrD ? [{ href: `/mgr/${mgrD}`, label: "Restricted batch (404 for public)" }] : []), { href: "/login", label: "Switch role" }],
        },
        {
          area: "Search / retrieval",
          interim: "Browse pages",
          prototype: "Role-filtered lists with search; stable record pages; version history; append-only timeline per record.",
          links: [{ href: "/mgr?q=CCZ", label: "Search MGR" }, { href: "/eia", label: "EIA list" }],
        },
        {
          area: "Reporting / export",
          interim: "None",
          prototype: "CSV (RFC 4180) and JSON envelopes per domain and for the audit log; per-record JSON and a one-page PDF stub — all policy-filtered.",
          links: [
            { href: "/api/export/mgr.csv", label: "mgr.csv", external: true },
            { href: "/api/export/audit.json", label: "audit.json", external: true },
            { href: "/api/records/BBNJ-MGR-2026-00001.pdf", label: "record .pdf", external: true },
          ],
        },
        {
          area: "EIA spine",
          interim: "Documents as files",
          prototype: "Pack-level publish spine: screening → notice → draft EIA → STB comments → decision. A published screening and a draft draft-EIA coexist on one activity.",
          links: [...(eia2 ? [{ href: `/eia/${eia2}`, label: "Sediment sampling, CCZ" }] : []), ...(eia3 ? [{ href: `/eia/${eia3}`, label: "Coexistence (activity 3)" }] : [])],
        },
      ],
    },
    {
      n: 2,
      title: "Notification and alerts",
      para: "PrepCom3 annex parameters: subscriptions, deadlines, digests. The interim set-up has no subscription model; the prototype fans every published outbox row out to owners, subscribers, reviewers — with cadence.",
      rows: [
        {
          area: "Subscriptions",
          interim: "Ad hoc mailing",
          prototype: "Per-user filters by domain, ABNJ box and theme; cadence immediate / daily / weekly.",
          links: [{ href: "/preferences", label: "Preferences" }],
        },
        {
          area: "Delivery",
          interim: "None",
          prototype: "Synchronous dispatch after commit; idempotent (UNIQUE user × event × kind); dispatch_log; replay inserts nothing on a consistent DB.",
          links: [{ href: "/notifications", label: "Bell / inbox" }, { href: "/audit", label: `Dispatch column${loginHint}` }],
        },
        {
          area: "Digests",
          interim: "None",
          prototype: "Daily/weekly subscribers are held back per event and receive one digest row per window; runnable on demand and idempotent.",
          links: [{ href: "/notifications", label: "Run digest (Secretariat)" }, { href: "/audit#digests", label: "Digest windows" }],
        },
        {
          area: "Deadlines",
          interim: "None",
          prototype: "Publishing a draft EIA emits a deadline row (demo 30-day window) to owner and subscribers, and an STB review request.",
          links: eia2 ? [{ href: `/eia/${eia2}`, label: "Draft EIA v1" }, { href: "/stb", label: "STB queue" }] : [{ href: "/stb", label: "STB queue" }],
        },
        {
          area: "Matches",
          interim: "None",
          prototype: "CBTMT match = row + match_suggested event; both owners notified; deterministic shared-theme rule.",
          links: [{ href: "/capacity", label: "Capacity board" }, ...(need ? [{ href: `/capacity/${need}`, label: "Seeded need" }] : [])],
        },
      ],
    },
    {
      n: 3,
      title: "User management",
      para: "Role-based access, audit logging, account lifecycle. The interim set-up has a limited role taxonomy; the prototype enforces four roles server-side and records every refusal.",
      rows: [
        {
          area: "Roles",
          interim: "Limited; uploads by Secretariat",
          prototype: "Party / Secretariat (publishing authority) / STB / public; anonymous on any bad cookie; one can() and one SQL visibility clause for every read.",
          links: [{ href: "/login", label: "Sign in" }],
        },
        {
          area: "Refusal audit",
          interim: "Unclear",
          prototype: "Every denied action (publish as Party, import as public, reading a restricted record…) is an append-only refusal row in the Secretariat projection.",
          links: [{ href: "/audit#refusals", label: `Refusal log${loginHint}` }],
        },
        {
          area: "Audit trail",
          interim: "Unclear",
          prototype: "Every receipt, transition and publication is an immutable outbox row; public and Secretariat projections of the same table.",
          links: [{ href: "/audit", label: "Audit" }, { href: "/api/export/audit.csv", label: "audit.csv", external: true }],
        },
        {
          area: "Sandbox lifecycle",
          interim: "—",
          prototype: "Reset in one click (env-gated) or `npm run db:reset`; seeds run through the same domain functions as the UI; `npm run smoke` proves the invariants.",
          links: [{ href: "/audit", label: "Reset database (SANDBOX_RESET=1)" }, { href: "/api/health", label: "Health", external: true }],
        },
      ],
    },
  ];

  return (
    <AppShell title="DOALOS interim set-up vs this prototype — by Session 1 basic function">
      <div className="space-y-6">
        <p className="max-w-3xl text-muted-foreground">
          The interim Cl-HM operated by DOALOS is largely static and informational: documents, meeting pages, contact points. This prototype is
          transactional — structured receipt → validation → storage → publication → alert → audit — organised around the three basic functions the
          webinar series asks for. Every row below links into the live sandbox for your current role.
        </p>

        {sections.map((s) => (
          <section key={s.n} className="space-y-3">
            <h2 className="text-lg font-semibold">
              {s.n}. {s.title}
            </h2>
            <p className="max-w-3xl text-sm text-muted-foreground">{s.para}</p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 font-medium">Area</th>
                    <th className="px-4 py-2 font-medium">Interim DOALOS</th>
                    <th className="px-4 py-2 font-medium">This prototype</th>
                    <th className="px-4 py-2 font-medium">See it live</th>
                  </tr>
                </thead>
                <tbody>
                  {s.rows.map((r) => (
                    <tr key={r.area} className="border-b align-top last:border-0">
                      <td className="px-4 py-2 font-medium">{r.area}</td>
                      <td className="px-4 py-2 text-muted-foreground">{r.interim}</td>
                      <td className="px-4 py-2">{r.prototype}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {r.links.map((l) =>
                            l.external ? (
                              <a key={l.href} href={l.href} className={cn(buttonVariants({ variant: "outline", size: "xs" }))}>
                                {l.label}
                              </a>
                            ) : (
                              <Link key={l.href} href={l.href} className={cn(buttonVariants({ variant: "outline", size: "xs" }))}>
                                {l.label}
                              </Link>
                            ),
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <section className="rounded-lg border p-4 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Read this honestly.</strong> Static/informational → transactional workflow across Agreement areas — same
            rails, multiple journeys. Mapping: consolidated draft study (DOALOS, Mar 2026) ¶61 basic functionalities; PrepCom3 informal outcome annex
            parameters (roles, TK, alerts, offline, languages); Art 51.5 (access for developing States / SIDS without undue burden). Demo values are
            labelled as such (30-day comment window, B-SBI shape). Not implemented by design: production authentication, e-mail, federation, full-text
            search, ABS tracing, ML matching, GIS. Without prejudice to COP1.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
