# BBNJ Clearing-House Mechanism (Cl-HM / CHM) — Deep-Dive Briefing

**For:** Glen Wright — mini-prototype + HSA webinar EOI  
**Session:** Designing the BBNJ Cl-HM: Basic Functions Across the Agreement — **15 Oct 2026, 15:00 CEST**  
**EOI deadline:** **28 Sep 2026**  
**Zotero target collection:** `7R77ZJFH` (`BBNJ / clearing house mechanism`)  
**Companion files:** `sources-for-zotero.json` · `call-EOI-notes.md`  
**Compiled:** 8 Sep 2026 (Europe/Paris)

---

## 1. EOI / webinar framing — what Session 1 wants

High Seas Alliance (with partners) is running a **functional** webinar series on Cl-HM prototypes. Session 1 is **not** about MGR vs EIA vs ABMT in isolation. It asks presenters to demo **basic cross-cutting functions**:

| # | Basic function (Session 1) | Maps to consolidated study ¶61 |
|---|---|---|
| 1 | Receipt, management and storage of information | Submission/publishing; search/retrieval; reporting/export |
| 2 | Making information publicly available, including through notifications | Notifications/alerts (subscription, deadline, digests) |
| 3 | User management | Role-based access, audit logging, account lifecycle |

**Success criteria for a competitive EOI**

- Mini-prototype (or mock-up/workflow) of **≥1** of the three functions.  
- Explicit **comparison to DOALOS interim set-up** → gaps & opportunities.  
- Preferential: **hands-on** interaction; **open-source**; prior CHM/portal experience; **developing country / SIDS** experience.  
- Pro bono; no recording; Chatham House discussion; without prejudice to COP1.

**Strategic window:** PrepCom3 agreed a path toward an **official prototype before COP1**, but as of late Aug 2026 the official track is **unlikely to deliver** one in time. This series fills a momentum/learning gap — ideal for a crisp, open, SIDS-aware basic-functions demo.

---

## 2. BBNJ Cl-HM — legal functions, users, data types, phasing, interim

### 2.1 Article 51 core architecture

Art. 51 establishes the Cl-HM as **primarily an open-access platform**; COP sets modalities. Key duties (Art. 51.3):

- **(a)** Central platform to access/provide/disseminate information on: **MGR** (Part II); **ABMTs/MPAs** (Part III); **EIAs** (Part IV); **CBTMT** requests/opportunities (Part V).  
- **(b)** **Matchmaking** capacity needs ↔ support / marine technology providers (incl. non-State donors).  
- **(c)** Links to other CHMs, gene banks, repositories, databases (incl. IPLC traditional knowledge where applicable) and, where possible, public private/NGO platforms.  
- **(d)** Build on global/regional/subregional clearing-houses when establishing regional/subregional nodes under the global mechanism.  
- **(e)** Enhance transparency (e.g. environmental baseline data).  
- **(f)** Foster scientific/technical cooperation.  
- **(g)** Other functions as COP decides.

**Art. 51.5:** facilitate access for **developing States / SIDS** without undue obstacles or administrative burdens; programmes for awareness and use.

The Cl-HM is referenced **~38 times across ~15 articles** (Gaebel et al. 2025) — it is cross-cutting infrastructure, not a side portal.

### 2.2 Cross-cutting CHM duties by pillar (what must land in storage + notify + auth)

**MGR / ABS (Part II)** — highest automation load  
- Pre-collection notification → Cl-HM **auto-generates BBNJ standardised batch identifier** (Art. 12).  
- Post-collection + utilisation/commercialisation notifications (publications, patents, products, revenue).  
- ABS Committee reporting draws on Cl-HM information.  
- TK associated with MGR: access **may** be facilitated via Cl-HM **only with FPIC** (Art. 13) — CARE + metadata-first default in PrepCom3 annex.  
- Note (consolidated study): Cl-HM receives/maintains notifications and generates B-SBI; it does **not** itself “track and trace” MGR/DSI end-to-end — provenance linking is the design challenge (see CILJ / SISGen analogies).

**ABMT (Part III)** — fewer *explicit* Cl-HM citations, but Art. 51.3(a)(ii) + process articles imply: proposals, consultation records, COP decisions/objections, monitoring/review — geographic tagging, milestone alerts.

**EIA (Part IV)** — densest notification chain  
Screening (incl. “no EIA”) → registered concerns / STB recommendations → public notification of planned activity → draft EIA → final report → decision docs → monitoring → adverse-impact notifications → further concerns. Deadlines make **real-time / subscription alerts** non-optional.

**CBTMT (Part V)** — human + platform  
Needs assessments (self or via Committee/Cl-HM); publish requests & offers; **matchmaking** (Art. 51.3(b)). Pure website matching underperforms; CTCN-style guided requests + human brokerage are the lesson.

### 2.3 Users & data types (indicative)

| User class | Typical actions |
|---|---|
| National focal points / authorised State users | Submit official notifications; approve delegates; verify entities |
| Subsidiary bodies (STB, ABS Cttee, CBTMT Cttee) | Review, recommend, synthesise |
| Scientists / cruise operators / repositories | Pre/post MGR filings; deposit metadata |
| Other IFBs | Cross-post EIA/ABMT-related docs |
| IPLC knowledge holders | Consent-controlled TK pathways |
| CBTMT providers (govt/NGO/private) | Offer support; respond to matches |
| Public / civil society | View-only; comment where process allows |

Data types: structured notification forms; documents (PDF/Word); geospatial tags; identifiers (B-SBI, DOIs); confidentiality flags; capacity offers/requests; baseline environmental data (by link more than by bulk ingest).

### 2.4 Phased ops & PrepCom process to date

| Phase | Status / intent |
|---|---|
| PrepCom1 (Apr 2025) | Phased/incremental; functional approach; pilot interest; accessibility/SIDS emphasis |
| PrepCom2 | Informal technical group ToRs stalled; DOALOS consultancy commissioned |
| PrepCom3 (Mar–Apr 2026) | Consolidated technical study; informal outcome → **prototype path to COP1** |
| Official prototype | Co-Chairs + Bureau + Secretariat guide; EOIs for technical partner; **late-Aug assessment: official prototype before COP1 unlikely** |
| This webinar series | Parallel learning track; not a replacement |

**Consolidated study (9 Mar 2026) structure:** (a) stock-take of existing CHMs; (b) technical options; (c) phased roadmap; (d) initial workplan. Recommends hybrid **centralised + federated** thinking (treaty-generated records vs links to external repositories).

**¶61 basic functionalities (must underpin any option):**  
(a) submission & publishing (forms, upload, version control); (b) search & retrieval; (c) notifications & alerts; (d) user management (RBAC, audit, lifecycle); (e) confidentiality controls; (f) reporting & export.

**PrepCom3 informal outcome — early prototype priorities:** MGR notifications + B-SBI; CBTMT matchmaking; EIA notifications; basic ABMT infrastructure. Annex interim guidance on: metadata/offline Excel-Word submission; confidentiality categories; user role taxonomy (NFP admins; registered non-State uploaders; public view-only); TK as metadata + FPIC flag; subscription alerts (thematic/geo); early interoperability links; central system design-for-future-nodes; English-first prototype → six UN languages later (**explicit caution against ungoverned AI translation**); cybersecurity baseline; Art. 51.5 accessibility.

### 2.5 DOALOS interim set-up (what to compare against)

Public materials describe DOALOS as providing **interim Secretariat** support, existing UN ocean/law-of-the-sea web properties, capacity-building pages, and document/meeting infrastructure — **not** a full Art. 51 transactional Cl-HM (no automatic B-SBI issuance, limited structured notification workflows, limited role taxonomy for non-Party uploaders, limited subscription/deadline alerting, limited offline/low-bandwidth paths).

**Prototype opportunity vs interim:** show structured receipt → validate → store → publish → alert → audit, with SIDS-friendly submission modes, on top of (or clearly gap-filling against) static DOALOS pages.

IOC-UNESCO offered (Mar 2026) to act as Art. 51.4 technical partner on an 18-month pilot (functional by COP1, tested by COP2); PrepCom did not lock a partner — procurement/EOI path left open.

---

## 3. Comparative lessons table

Focus: lessons for the **three Session 1 basic functions**. ★ = high prototype relevance.

| Mechanism | Agreement / body | Strengths | Pitfalls | Relevance to basic functions |
|---|---|---|---|---|
| ★ **Nagoya ABSCH** | Nagoya Protocol (CBD) | Publishing authorities; IRCC common formats; phased pilot before EIF; joint modalities with CBD CHM & BCH; multilingual push | Slow national publishing; weak checkpoint communiqués; capacity bottlenecks; confidentiality edge-cases | **User mgmt** (national publishing authorities); **receipt/storage** of legal certificates; public records with limited confidential fields |
| ★ **Cartagena BCH** | Cartagena Protocol | Early capacity-building functions; LMO decision notifications; national nodes; toolkit/tutorials | Dual central/national complexity; uneven node quality | **Notifications** of regulatory decisions; national-user roles; capacity overlays on basic platform |
| CBD CHM (Art. 18) | CBD | Hub-and-spoke national CHMs; knowledge management strategy | Laihonen et al. 2004: many national sites thin/unprocessed; ownership disparity | Federated **storage** + interoperability standards; don’t equate “a website” with usable information |
| ★ **Antarctic EIES + EIA DB** | Antarctic Treaty / Madrid Protocol | Pre-season / annual / permanent information exchange; filterable EIA list (IEE/CEE); Party-authenticated operators | Incomplete preliminary-level projects; weak cumulative-impact meta-data; login walls for operators | Closest analogue for **EIA receipt + public listing + filters**; role-gated upload vs public read |
| ★ **UNFCCC CTCN / TT:CLEAR / Cap-Building Portal** | UNFCCC | Guided technical-assistance request templates; active TA database; technology needs assessments | Matchmaking needs **human** brokerage; portal sprawl across CTCN/TT:CLEAR/CB | CBTMT **receipt of requests** + public opportunity boards; less about pure notify |
| ★ **BRS Joint CHM** | Basel, Rotterdam, Stockholm | Synergies across three treaties; workshop library filters; regional node experiments (e.g. Brazil sync); InforMEA links | Gradual implementation; resource-constrained collaborative-platform ambition | Categorisation/filter UX; multi-instrument **storage**; regional node path |
| Aarhus Clearinghouse | Aarhus Convention | Principle 10 / access-to-info culture; curated resource portal | More library than transactional filing system | Public availability norms; weaker model for authenticated submissions |
| WTO Notifications Portal | WTO | Strong country/topic filters; dedicated TA overview pages; e-learning | Trade-specific ontology | **Search/filter** patterns for public notification feeds |
| CMS capacity pages / e-community | CMS | Dedicated CB overview pages; e-community | Fragmented tools | Navigation UX; human community layer |
| ★ **OBIS / ODIS / Ocean InfoHub** | IOC-UNESCO IODE | FAIR marine biodiversity data; global/regional/thematic nodes; SIDS-relevant nodes; DOI/provenance practice | Scientific data ≠ legal notification workflow | Interoperability **links**; ABMT/EIA baselines; possible B-SBI/DOI patterns; open-source culture |
| ★ **ISA DeepData** | UNCLOS Part XI / ISA | Contractor environmental data; OBIS/ODIS node integration; FAIR push | Confidential commercial/resource data tension; governance politics | Confidentiality tiers; ABNJ data; federated discovery |
| SISGen (Brazil) | National ABS law | Access codes as legal anchors across IP/publication workflows; informed BBNJ batch-ID thinking | National scope; not a multilateral CHM | Provenance for **MGR receipt → identifier → downstream disclosure** |
| IPBES / InforMEA / gen. MEA portals | Various | Document repositories; cross-MEA discoverability | Passive information hubs | Lower priority for Session 1 transactional basics |
| CITES Trade Database / CMS Info | CITES / CMS | Long-running structured trade/species records | Different compliance logic | Structured **storage** + query; less notification-deadline UX |
| PRTR / pollutant registers | Aarhus PRTR Protocol & kin | Facility-level public pollutant data; standardised reporting | Industrial focus | Public **availability** + standardised fields |

### Cross-cutting comparative takeaways for Session 1

1. **Ship basic rails first** (submit → store → search → notify → roles) before pillar-specific sophistication — CBD BCH CB-first phasing and ABSCH pre-EIF pilot both support this.  
2. **Authenticated publishers + public readers** is the dominant MEA pattern (ABSCH, EIES, BCH).  
3. **Filters, stable record pages, persistent IDs** beat “PDF dumping grounds.”  
4. **Alerts with deadlines** are under-built in many MEA portals — BBNJ EIA calendar is a differentiator.  
5. **Offline / assisted / low-bandwidth submission** is rare but decisive for SIDS (Pacific “light” architectures; PrepCom3 Excel/Word interim path).  
6. **Matchmaking ≠ database** — plan a thin digital layer + human facilitation.  
7. **TK: metadata + consent pointers**, not open dump (COSPPac; PrepCom3 annex; CARE).  
8. **No single existing CHM covers BBNJ’s full stack** — innovation required, but UX patterns are reusable (Gaebel et al.; HSA Aug 2025).

---

## 4. Prototype design implications (three basic functions)

### 4.1 Receipt, management and storage

- **Structured forms per record type** (MGR pre/post/utilisation; EIA screening/draft/final/decision/monitoring; ABMT proposal package; CBTMT request/offer) with schema validation / completeness checks.  
- **Version control** + material-change notifications (Art. 12 updates).  
- **Offline path:** Excel/Word templates → Secretariat or NFP assisted upload (PrepCom3 interim); design API/import for later.  
- **Export:** CSV/JSON/PDF/Word/Excel for Parties & subsidiary bodies (¶61(f)).  
- **Persistent record URLs** + (for MGR) auto **B-SBI** on valid pre-collection receipt — even a demo ID namespace is pedagogically powerful.  
- Open-source angle: JSON Schema + static validator + simple object store; document every field against Art. 12 / EIA articles.

### 4.2 Public availability & notifications

- Default **public in real time** for non-confidential records (HSA guidance).  
- **Subscription alerts:** thematic tags + user-defined geography (prototype can start manual geo search; design for geospatial later).  
- **Deadline digests** for EIA comment windows / STB review — email + in-app.  
- Filter UX borrowed from **Antarctic EIA DB** and **WTO Notifications**.  
- Distinguish Part II “notification = submission” vs Parts III/IV “notification = public alert” in UI copy (HSA footnote problem).

### 4.3 User management

- Role taxonomy (PrepCom3): **NFP administrators** (verify entities); **authenticated submitters** (Party-linked); **registered non-State uploaders** (Secretariat-managed list); **public view-only**.  
- Audit log of who submitted/changed what (integrity + compliance narrative).  
- Delegation / least-privilege; separate confidential storage from public indexes.  
- Hands-on webinar: pre-create roles (NFP, scientist, public) for participants to click through.

### 4.4 Open-source / SIDS / hands-on angles (preferential criteria)

| Angle | Concrete prototype move |
|---|---|
| Open-source | MIT/Apache repo: schemas, stub UI, seed data, Docker compose; README maps features → Art. 51 / ¶61 |
| SIDS / low bandwidth | “Light” pages; offline templates; no heavy GIS in v0; progressive enhancement; document latency budget |
| Hands-on | Public sandbox + 3 demo accounts; 10-minute scripted journey (submit MGR pre-collection → receive B-SBI → public alert email → NFP audit view) |
| Compare DOALOS interim | Side-by-side slide: interim = documents/static info; demo = transactional workflow + roles + alerts |

---

## 5. Suggested EOI angle / differentiators

**Working title:** *“Basic Rails for BBNJ: An Open, Offline-Capable Mini-Prototype of Receipt → Notify → Roles (Compared to the DOALOS Interim)”*

**Pitch (≤150 words for form):**  
Session 1 needs the cross-cutting substrate every pillar shares. We propose a small open-source mini-prototype that implements (1) structured receipt/storage with versioned records and export, (2) public record pages plus subscription/deadline notifications, and (3) role-based user management (NFP / authorised submitter / public). A scripted sandbox lets webinar participants run a full MGR pre-collection → B-SBI → alert path and an EIA deadline alert path. Design choices explicitly target Art. 51.5 (SIDS): offline Excel/Word intake, low-bandwidth UI, no dependency on proprietary GIS. We contrast this with the DOALOS interim (informational pages vs transactional Cl-HM), mapping gaps to consolidated study ¶61 and PrepCom3 annex parameters — without prejudice to COP1.

**Differentiators to claim (honestly, only if true for Glen’s build):**  
- Functional (basic rails) not pillar-siloed.  
- Hands-on sandbox before/during webinar.  
- Open-source from day one.  
- SIDS/offline first-class.  
- Grounded in comparative CHM patterns (ABSCH publishing authorities; EIES EIA filters; CTCN request UX) rather than greenfield fantasy.  
- Clear DOALOS gap analysis.

**Avoid:** over-claiming full ABS tracing, blockchain/IP-NFT as Session 1 core (CILJ is useful background, not Session 1 centre of gravity); AI translation (PrepCom3 caution).

---

## 6. Annotated core reading list

### ★★★ Must-reads for prototype design (Top 5)

1. **★ Consolidated draft study on technical aspects of BBNJ Cl-HM operationalization** (DOALOS consultancy, 9 Mar 2026) — `2A23GMFJ` already in Zotero. **Why:** ¶61 basic functionalities; options; phased roadmap; stock-take. PDF on disk: `ConsolidatedDraftBBNJCHMStudy.pdf`.  
2. **★ PrepCom3 Informal CHM Outcome** (Palau & NZ, 2 Apr 2026) — `U9NCB4F7`. **Why:** prototype priorities + annex parameters (roles, TK, alerts, offline, languages). PDF: `CHMInformalDiscussionOutcome.pdf`.  
3. **★ HSA / NRDC / OceanCare — Designing an Effective BBNJ CHM: Insights from Comparable Tools** (Aug 2025) — likely `C89XAXA6`. **Why:** Session 1 language almost verbatim; comparative UX; backend checklist. PDF: `HSA-Designing-Effective-BBNJ-CHM.pdf`.  
4. **★ Gaebel et al. (2025) Frontiers in Ocean Sustainability** — `HBKC5HQX`. **Why:** full function/user/source map; comparative Table 2; human element; costs; hub-and-spoke. https://doi.org/10.3389/focsu.2025.1584927  
5. **★ Lyu, Langlet-Uranüs & Vadrot (2026) Marine Policy** — *From data rationales to data infrastructure* — `HJV7CH3C`. **Why:** design is political; 12 questions; equity lens for user/access choices. https://doi.org/10.1016/j.marpol.2026.107079  

### Other high-value (already in library — do not duplicate)

- HSA PrepCom3 Consolidated Cl-HM briefing — `AX4EZP5D`  
- Pastra et al. 2026 — `H7MNNCWP` / `N9K56ZCW`  
- Chen & Zhang 2026 preprint — `D2MRE4XN`  
- Muraki Gottlieb et al. 2026 (AI) — `CA5H5PF6`  
- Older CBD CHM items — `L3P7YMZ9`, `YX6BM5P5`, `UGHDNDIU`  

### Strong NEW / comparative (see `sources-for-zotero.json`)

- Schutz Veiga & Marcos (2025) CILJ blog — SISGen + digital backbone (MGR identifier narrative).  
- Boettcher & Brent (2024) Front. Clim. — CHM & knowledge pluralism in EIA/mCDR.  
- Harden-Davies et al. (2024) npj Ocean Sustain. — CBTMT into practice.  
- OBIS (2025) digital foundation note — FAIR/DOI/B-SBI interoperability.  
- Laihonen et al. (2004) — classic CBD CHM evaluation.  
- CBD ABSCH progress / IAC / SBI INF reviews — publishing authority lessons.  
- BRS joint CHM strategy & COP decisions — multi-treaty platform.  
- IOC CHM response (Mar 2026) — technical partner offer / phasing.  
- Co-Chairs PrepCom1 oral report on CHM modalities (Apr 2025).

---

## 7. NEW vs already-in-Zotero (summary)

| Bucket | Count (approx.) | Action |
|---|---|---|
| Already in Zotero (known keys) | 12 flagged in JSON | `already_in_zotero_key` set → **skip ingest** |
| NEW official / grey BBNJ | ~10 | Ingest → `7R77ZJFH` |
| NEW academic (BBNJ + comparative) | ~12 | Ingest |
| NEW comparative grey (CBD/BRS/UNFCCC/IOC/ISA/OBIS etc.) | ~15 | Ingest |
| **Target NEW high-value after dedupe** | **~35–37** | Cap respected |

Full item-level detail: `sources-for-zotero.json`.

---

## 8. Fetch / source notes

| Resource | Status |
|---|---|
| Consolidated CHM study PDF | OK — downloaded + `pdftotext` |
| PrepCom3 informal outcome PDF | OK |
| HSA Designing Effective CHM PDF | OK (via OceanCare mirror; HSA URL also listed) |
| Gaebel Frontiers HTML | OK via WebFetch |
| CILJ Schutz Veiga & Marcos | OK via WebFetch |
| OBIS BBNJ digital foundation page | OK |
| ENB PrepCom3 summary | WebFetch blocked (Cloudflare); used secondary summaries |
| IOC_CHMResponse_26March.pdf | WebFetch timeout; content partially recovered via search snippets / ENB secondary |
| Some UN PDFs | Initial 403 without UA; succeeded with browser UA |

Local PDFs/TXT live under `/workspace/bbnj-chm-deepdive/`.
