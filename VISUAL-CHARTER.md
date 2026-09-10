# Visual charter — BBNJ Cl-HM

**Name for the look:** Working Cl-HM desk  
**Positioning:** Between [UN BBNJ Agreement](https://www.un.org/bbnjagreement/en) solemnity and [High Seas Alliance](https://highseasalliance.org/) legibility — **neither** campaign brochure **nor** grey PDF warehouse.  
**Audience tell:** A SIDS NFP can finish a form without squinting; a Party official trusts it enough to publish.

This charter governs the Cl-HM desk UI. It is a **team choice** for this prototype. Soft cues (Art 51.5 light pages, HSA Designing paper dashboards/filters, ABSCH/BCH institutional desk) inform it.

---

## 1. Principles

1. **Transactional, not promotional** — chrome exists for submit → manage → publish → notify → audit.  
2. **Functions first** — home shows shared rails; journeys (MGR / EIA / capacity) are entry points, not competing brands.  
3. **Institutional trust** — restrained blues, sober type, no advocacy hero imagery.  
4. **Legible density** — information-dense lists and pack timelines; generous line-height; avoid sparse “marketing” whitespace.  
5. **Light by default** — no mandatory maps/GIS; offline template affordances visible; progressive enhancement only.  
6. **Status is visible** — pack chips (`draft` / `pending` / `published`) and the `restricted` tier chip always carry **text labels** (never colour-only). Interim provenance is **outlined**; Demo provenance is **subdued**. Both stay first-class list chips, not buried in About.  
7. **Without prejudice** — role names (e.g. Secretariat / authorised publisher) must not imply a COP1 organ chart. Scope caveats live in the README, not in product chrome.

---

## 2. Colour

| Token | Role | Guidance |
|---|---|---|
| `--canvas` | Page background | Near-white / cool grey-white — not pure glare white |
| `--ink` | Body text | Near-black / deep navy-grey |
| `--muted` | Secondary text, meta | Mid grey — still WCAG AA on canvas |
| `--line` | Borders, dividers | Soft cool grey |
| `--institutional` | Primary brand / links / focus | One **UN-adjacent blue** (calm, not electric) |
| `--action` | Primary buttons, key CTAs | Single accent (blue-green or stronger blue) — used sparingly |
| `--draft` | Status chip | Muted grey |
| `--pending` | Status chip | Amber / attention |
| `--published` | Status chip | Teal / success-institutional (not neon green) |
| `--danger` | Errors / refusals | Restrained red — forms only |
| `--domain-mgr` | Domain accent | Soft slate-blue — badge tint + 2px left rail |
| `--domain-eia` | Domain accent | Soft sea-teal — badge tint + 2px left rail |
| `--domain-cbtmt` | Domain accent | Soft sage — badge tint + 2px left rail |
| `--domain-abmt` | Domain accent | Soft warm grey-violet — badge tint + 2px left rail; quieter than the other three (stub domain) |

**Focus:** visible focus rings use `--institutional`.

**Status vs domain:** status chips (`draft` / `pending` / `published`) are the **loud** colour system. Domain accents stay quieter than `--institutional` / `--action` — never whole-page washes, never competing with status chips. Audit id ribbons stay domain-neutral (one ink colour for ids).

**Do not:** ocean photo gradients, rainbow category colours, dark-mode-first (optional later), HSA campaign orange as primary.

---

## 3. Typography

- **UI / product:** one clean sans (e.g. system UI or Inter / Geist via shadcn defaults).  
- **Scale:** compact but readable — body ~14–16px; meta smaller; headings restrained (no display/impact fonts).  
- **Treaties/articles** in UI copy: regular weight + subtle monospace or tabular for ids (`BBNJ-…`, `bSbi`).  
- **Never:** decorative serif for chrome; all-caps paragraphs; low-contrast grey-on-grey.

---

## 4. Layout & components

- **Shell:** three bands — UN masthead (welcome + treaty-text locale); product/account (emblem · **Clearing House** with subtitle *Biodiversity Beyond National Jurisdiction* · rails · Settings gear · global “Search all Cl-HM records” · bell · role switcher); contextual (**Institutional** tab · journey tabs · labelled **Latest transaction** from the last visible outbox event, public identifiers only). The long Agreement title does not sit in chrome. The ABMT tab is **enabled and quiet**: same weight as the other journeys, no “stub” / “not in this build” badge in the tab itself; the stub nature is stated once, in one sentence, on the ABMT page. STB users also get **STB queue** in the rails (`/stb`).  
- **Institutional (`/institutional`):** Secretariat notices + related-systems links (same list as About). Caption related systems as *related systems*, never as “integrations” or “partners”.
- **About this desk:** lives at `/about` (footer link + welcome hero jump). Identifier order, comparison highlights, speed-test explanation, related-systems repeat and `/records/<id>` notes — not stacked above journey tables on home. Per-journey “About this workflow” stays on journey cards. Footer is product mark (**Clearing House**) + About link.
- **Settings (gear):** icon-only in band 2 (after rails, before search). Demo user path, speed tests and desk-config placeholders — not in primary nav.  
- **Deferred capability caption:** where a proprietary or deferred capability is referenced (e-mail delivery, GIS, federation, tagged PDF), use one quiet muted caption in the relevant panel — e.g. *in-app only in this build* — not a banner, not a roadmap list.  
- **Record lists:** domain badge (quiet tint + optional Lucide icon with label) · public record id · status chip (**text + colour**, never colour-only) · **Updated** as a scan column — scannable tables, shadcn `Table` / `Badge` / `Button`. List pages **Filter … records** (live); header search is global FTS. MGR/EIA actions: primary **New** · **Import▾** (template underneath) · **Export▾**.  
- **Home cards:** operational launchers (count + short rail + Open); essays behind “About this workflow”. Recently published: title / status / id+date on separate rows.  
- **Domain accent:** soft left rail (`border-l-2`) on journey cards and mixed-domain feed rows only — not page chrome.  
- **Icons (Lucide):** labelled only — submit / notify / roles / MGR / EIA / capacity. No icon-only status. Manage / Publish / Audit rails stay text-only.  
- **Pack / EIA rail:** vertical stage rail with **per-pack** chips; published screening may sit beside draft `draft_eia`.  
- **CBTMT:** two-column needs↔offers; match as chip, not confetti.  
- **Forms:** clear labels, inline validation, “Download template” as a first-class control on MGR intake.  
- **Notify:** bell drawer — list, not toast spam.  
- **Compare (`/compare`):** docs-style contrast page; **not** linked from the shell — open from `/about`, Settings → Demo user, or README / demo script.
- **Neighbourhood (EIA):** schematic ABNJ diagram (labelled dots, not GIS tiles) above the same-box list — charter-allowed maps-without-hardcore-GIS.

**Elevation:** flat / one soft shadow max. Prefer borders over shadows.

---

## 5. Imagery & illustration

| Allow | Forbid |
|---|---|
| Simple line icons (Lucide) | Stock ocean panoramas / whale heroes |
| Optional tiny diagram for rails | Campaign photography |
| Flag/country as text codes | Decorative wave SVGs behind content |
| Empty states with one short sentence | Lottie celebrations on publish |

---

## 6. Motion

Minimal. Status changes: short fade/chip swap. No page parallax. Respect `prefers-reduced-motion`.

---

## 7. Accessibility & SIDS

- WCAG AA contrast on text/chips/buttons.  
- Keyboardable role switcher, tabs, pack rail.
- Focus rings use `--institutional` (visible, not browser-default only).  
- No hover-only critical actions.  
- Target light payloads; avoid autoplay video/heavy fonts.  
- Offline path always discoverable (template download + import).

UN WCAG 2.1 AA mapping, measured contrast, and remediation status: [`ACCESSIBILITY.md`](ACCESSIBILITY.md).

---

## 8. Voice in the UI

- Plain English; article cites in help text, not in every button.  
- Ids and B‑SBI labelled distinctly.  
- Product chrome reads as a finished working desk — no “prototype”, “substrate”, “sandbox”, or COP1 disclaimers in the shell. Scope notes live in the README.  
- Role labels: “Secretariat / authorised publishing role” — not “Publishing Authority” as a BBNJ organ.  
- ABMT stub page: one sentence saying it is a thin stub without prejudice, then the working list/form — not roadmap marketing or contract-enum lectures. Never “unavailable” (it is available, thinly).  
- Deferred / proprietary captions read as facts, not apologies: *Notifications are in-app in this build.* — no “coming soon”.

---

## 9. Implementation notes (repo)

- Encode tokens in CSS variables / shadcn theme — in this repo: `src/app/globals.css` (`--canvas`, `--ink`, `--institutional`, `--action`, `--draft`, `--pending`, `--published`, `--danger`, `--domain-mgr|eia|cbtmt|abmt` are mapped onto the shadcn / Tailwind theme; no second theme system).  
- Status chip and domain badge are shared across pillars (`src/components/chips.tsx`). Domain icons live in `src/components/domain-icons.tsx`.  
- Do not fork ABSCH CSS; reimplement the *desk* feel in shadcn.  
- Optional: screenshot golden paths into `docs/screenshots/` (directory not checked in yet).

---

## 10. One-line pitch

> A **working Cl-HM desk**: UN-level restraint, product-level clarity — built for Parties to submit, publish, and notify, not to browse a brochure.
