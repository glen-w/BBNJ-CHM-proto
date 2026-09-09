# Visual charter — BBNJ Cl-HM day prototype

**Name for the look:** Working Cl-HM desk  
**Positioning:** Between [UN BBNJ Agreement](https://www.un.org/bbnjagreement/en) solemnity and [High Seas Alliance](https://highseasalliance.org/) legibility — **neither** campaign brochure **nor** grey PDF warehouse.  
**Audience tell:** A SIDS NFP can finish a form without squinting; a Party official trusts it enough to publish.

This charter governs the day‑1 / second‑wave UI. It is a **team choice**, not an EOI mandate. Soft cues (Art 51.5 light pages, HSA Designing paper dashboards/filters, ABSCH/BCH institutional desk) inform it.

---

## 1. Principles

1. **Transactional, not promotional** — chrome exists for submit → manage → publish → notify → audit.  
2. **Functions first** — home shows shared rails; journeys (MGR / EIA / capacity) are entry points, not competing brands.  
3. **Institutional trust** — restrained blues, sober type, no advocacy hero imagery.  
4. **Legible density** — information-dense lists and pack timelines; generous line-height; avoid sparse “marketing” whitespace.  
5. **Light by default** — no mandatory maps/GIS; offline template affordances visible; progressive enhancement only.  
6. **Status is visible** — pack chips (`draft` / `pending` / `published`) always carry **text labels** (never colour-only).  
7. **Without prejudice** — role names (e.g. Secretariat / authorised publisher) must not imply a COP1 organ chart. Legal and sandbox caveats live in the README, not in product chrome.

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

- **Shell:** top bar with product mark (**BBNJ Cl-HM** · working desk), rail labels + role switcher + bell; journey tabs secondary. Disabled ABMT tab is quiet (no “not in this build” badge).  
- **Record lists:** domain badge (quiet tint + optional Lucide icon with label) · public record id · status chip (**text + colour**, never colour-only) · updated — scannable tables/cards, shadcn `Table` / `Badge` / `Button`.  
- **Domain accent:** soft left rail (`border-l-2`) on journey cards and mixed-domain feed rows only — not page chrome.  
- **Icons (Lucide):** labelled only — submit / notify / roles / MGR / EIA / capacity. No icon-only status. Manage / Publish / Audit rails stay text-only.  
- **Pack / EIA rail:** vertical stage rail with **per-pack** chips; published screening may sit beside draft `draft_eia`.  
- **CBTMT:** two-column needs↔offers; match as chip, not confetti.  
- **Forms:** clear labels, inline validation, “Download template” as a first-class control on MGR intake.  
- **Notify:** bell drawer — list, not toast spam.  
- **Compare (`/compare`):** docs-style contrast page; **not** linked from the shell — open by URL from README / demo script.

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
- Product chrome reads as a finished working desk — no “prototype”, “substrate”, “sandbox”, “demo” chips, or COP1 disclaimers in the shell. Those caveats live in the README.  
- Role labels: “Secretariat / authorised publishing role” — not “Publishing Authority” as a BBNJ organ.  
- Empty ABMT: short unavailable copy, not roadmap marketing or contract-enum lectures.

---

## 9. Implementation notes (repo)

- Encode tokens in CSS variables / shadcn theme — in this repo: `src/app/globals.css` (`--canvas`, `--ink`, `--institutional`, `--action`, `--draft`, `--pending`, `--published`, `--danger`, `--domain-mgr|eia|cbtmt` are mapped onto the shadcn / Tailwind theme; no second theme system).  
- Status chip and domain badge are shared across pillars (`src/components/chips.tsx`). Domain icons live in `src/components/domain-icons.tsx`.  
- Do not fork ABSCH CSS; reimplement the *desk* feel in shadcn.  
- Screenshot golden paths into `docs/screenshots/` when the shell lands (optional day‑1).

---

## 10. One-line pitch (EOI / README)

> A **working Cl-HM desk**: UN-level restraint, product-level clarity — built for Parties to submit, publish, and notify, not to browse a brochure.
