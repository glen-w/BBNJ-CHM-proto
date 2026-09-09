# Accessibility assessment — UN WCAG 2.1 AA

Assessment of the BBNJ Cl-HM prototype against the [United Nations Web Accessibility Guidelines](https://www.un.org/en/webaccessibility/) and the [Homepage / POUR checklist](https://www.un.org/en/webaccessibility/guidelines/homepage.html).

**Standard:** WCAG **2.1 Level AA**, with enhanced attention to text contrast (UN requirement).  
**Product shape:** transactional working desk (not a UN marketing homepage). Media/carousel rules are mostly N/A; shell, forms, structure, and downloadables dominate.  
**Charter:** [`VISUAL-CHARTER.md`](VISUAL-CHARTER.md) §6–7 (team choice; Art 51.5 context in `SHIPPED-VS-DEFERRED.md`).

This document is a living gap analysis, not a formal certification.

**Art 51.5 cross-link.** `SHIPPED-VS-DEFERRED.md` marks Art 51.5 accessibility as **Partial — pattern proof**. The evidence is the offline Excel loop (MGR pre-collection and EIA screening templates → Secretariat import → error workbook → re-import) together with server-rendered pages and native forms: a demonstration of low-bandwidth, assisted access for developing States and SIDS. It is a *pattern*, not a WCAG conformance claim; the WCAG 2.1 AA verdicts in this file remain **Partial** and no third-party audit has been done.

---

## Summary

| Area | Verdict |
|---|---|
| Overall posture | **Partial** — strong semantic/SSR foundations; shell and form associations were the main gaps |
| Perceivable | Partial → largely Pass after token check (no content images; contrast measured) |
| Operable | Partial — skip link and nav current-page state addressed; bell remains native `<details>` |
| Understandable | Partial — consistent shell; Field now wires describedby / invalid / required |
| Robust / documents | Partial — semantic HTML; export links now state file type in visible text |

---

## POUR mapping

### P — Perceivable

| UN topic | Finding | Status |
|---|---|---|
| Text alternatives | No content `<img>` / hero imagery (charter). Lucide icons use `aria-hidden`. | Pass (N/A) |
| Time-based media | No video, carousel, or autoplay. | Pass (N/A) |
| Colour / contrast | Status chips always include **text + colour**. Token spot-check (approx. relative luminance): ink/canvas **16.6:1**; muted-foreground/canvas **6.5:1**; nav `foreground/80` **~8.9:1**; chip fg/bg pairs **≥8:1**; action button **~8.9:1**. All meet WCAG AA (≥4.5:1) for normal text. | Pass |
| Adaptable structure | `lang="en"`; landmarks (`header` / labelled `nav` / `main` / `footer`); lists and tables used; homepage `h1` → section `h2`. Skip link + `id="main-content"` on `<main>`. | Pass |

### O — Operable

| UN topic | Finding | Status |
|---|---|---|
| Keyboard | Focus-visible rings on shell links, buttons, inputs. Skip-to-content link present. | Pass |
| Enough time / seizures | No autoplay or flashing UI; `prefers-reduced-motion` in `globals.css`. | Pass |
| Consistent navigation | Shared `AppShell`; Rails / Journeys mark `aria-current="page"`. ABMT is an enabled, quiet journey tab leading to the thin stub (list + one-field form); its accessible name is the journey name, not “unavailable”. | Pass |
| Downloads as access path | Offline `.xlsx` templates (MGR, EIA screening) and the error workbook are the Art 51.5 pattern proof for low-bandwidth users; link text states the format. Spreadsheet accessibility itself (header rows, no merged cells, field guide sheet) is by construction, not audited. | Partial |
| Notifications disclosure | Bell uses native `<details>`/`<summary>` (keyboard-openable) with a named `region`. Not a modal dialog; Escape-to-close is browser-dependent. | Partial |

### U — Understandable

| UN topic | Finding | Status |
|---|---|---|
| Predictable | Same chrome across journeys; plain English labels. | Pass |
| Page hierarchy | Pages use heading levels for sections; avoid skipping for visual effect alone. | Pass |
| Input assistance | Shared `Field` associates label, hint/basis (`aria-describedby`), `required` / `aria-required`, and optional `error` → `aria-invalid`. Flash banner uses `role="alert"` and receives focus after redirect. Field-level server errors still surface primarily via query-string flash (not per-control). | Partial |

### R — Robust

| UN topic | Finding | Status |
|---|---|---|
| Compatible | Prefer native HTML controls and SSR forms over custom widgets. ARIA used where chrome needs names (`nav`, bell, regions). | Pass |
| Documents / downloads | UN asks for **file type (and size when known)** in link text. Template, CSV, JSON, and PDF controls now include the extension/format in visible text. Sizes are dynamic (policy-filtered exports) so size is omitted rather than guessed. | Partial |

---

## Remediation shipped with this assessment

1. Skip link → `#main-content`
2. `aria-current="page"` on Rails and Journeys
3. ABMT journey tab enabled (EOI wave); the earlier “unavailable” accessible name was removed with the thin stub
4. Bell panel: `role="region"` + labelled heading
5. `Field`: ids, `aria-describedby`, `aria-invalid`, native `required`
6. Flash banner focus on mount when notice/error present
7. Export / template link text includes format (`.csv` / `.json` / `.pdf` / `.xlsx`)

---

## Backlog (not in this pass)

- Full axe / pa11y CI gate on priority routes (`/`, `/login`, `/mgr/new`, `/mgr/import`, `/eia/[id]`, `/capacity`, `/preferences`)
- Replace bell `<details>` with a disclosure/dialog that supports Escape and focus trap if product needs it
- Per-field error mapping from Zod (beyond flash banner)
- Six UN languages; tagged/accessible certified PDFs
- Formal third-party WCAG audit

---

## Priority surfaces for manual check

Keyboard + one screen reader pass: home (incl. related-systems footer), login (five logins), MGR new/edit, Excel import (MGR + EIA screening), EIA pack form with artifact references, CBTMT post + facilitation note, ABMT stub, preferences, notifications bell, `/compare`.

---

## Sources

- [UN Accessibility Guidelines (overview)](https://www.un.org/en/webaccessibility/)
- [UN Homepage guidelines (POUR)](https://www.un.org/en/webaccessibility/guidelines/homepage.html)
- W3C WCAG 2.1 Level AA
