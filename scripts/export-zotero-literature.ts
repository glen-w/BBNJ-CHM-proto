/**
 * One-shot snapshot of BBNJ Zotero collections into research_items.csv.
 * Zotero stays the catalog of record; the CHM stores metadata + link-out only.
 * Not a runtime sync. Idea and collection map: fixtures/bbnj-chm-seed-pack/README.md
 * Run only when refreshing the fixture:
 *   ZOTERO_SQLITE="/path/to/zotero.sqlite" npx tsx scripts/export-zotero-literature.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import Database from "better-sqlite3";

import { parseCsv } from "../src/server/parseCsv";

const SQLITE = process.env.ZOTERO_SQLITE;
if (!SQLITE) throw new Error("Set ZOTERO_SQLITE to the path of zotero.sqlite");
const OUT = join(process.cwd(), "fixtures/bbnj-chm-seed-pack/csv/research_items.csv");
const PREV = OUT;

const COLLECTIONS: Record<string, { pillars: string[]; ifbs: string[] }> = {
  AQZKN2SC: { pillars: ["eia"], ifbs: [] }, // EIA / SEA
  AXS8G4Q2: { pillars: ["abmt"], ifbs: [] }, // ABMT / MPAs
  B9PCHGGP: { pillars: ["mgr"], ifbs: [] }, // MGR / ABS / DSI
  Q8I32C5G: { pillars: ["cbtmt"], ifbs: [] }, // CBTMT / equity
  Q3KZ4DWE: { pillars: ["eia"], ifbs: ["RFMO"] }, // fisheries / RFMOs
  J2SEXDC5: { pillars: ["abmt"], ifbs: ["ISA"] }, // seabed / ISA
  XA44HPDQ: { pillars: ["abmt"], ifbs: ["ISA"] }, // not undermine / IFBs
  "7SC83H3M": { pillars: ["cbtmt"], ifbs: [] }, // finance / financial mechanism
  XFD86ZFP: { pillars: [], ifbs: [] }, // institutions — catalog only
  "7R77ZJFH": { pillars: [], ifbs: [] }, // clearing house — catalog only
};

const TYPES = new Set([
  "journalArticle",
  "report",
  "document",
  "bookSection",
  "conferencePaper",
  "book",
  "preprint",
  "thesis",
  "manuscript",
  "videoRecording",
]);

const GEO: { box: string; re: RegExp }[] = [
  { box: "Sargasso Sea Core", re: /sargasso/i },
  { box: "Clarion-Clipperton South", re: /clarion[-\s]?clipperton south/i },
  { box: "CCZ", re: /\bccz\b|clarion[-\s]?clipperton/i },
  { box: "Mid-Atlantic Splashdown Corridor", re: /splashdown|\bre-?entr|\bspace objects?\b/i },
  { box: "NE Atlantic Mesopelagic Belt", re: /mesopelagic/i },
  { box: "North Atlantic OAE Trial Box", re: /ocean alkalinity|\boae\b|alkalinity enhancement|marine carbon dioxide removal/i },
  { box: "Costa Rica Thermal Dome", re: /costa rica (thermal )?dome|\bthermal dome\b/i },
  { box: "Central Indian Ridge", re: /central indian ridge|carlsberg ridge/i },
  { box: "Tonga-Kermadec Arc", re: /\btonga\b|\bkermadec\b/i },
  { box: "Southern Ocean Polar Front", re: /polar front|southern ocean/i },
  { box: "Reykjanes Ridge", re: /reykjanes/i },
];

type Row = {
  zoteroKey: string;
  doi: string;
  title: string;
  year: string;
  citation: string;
  oaUrl: string;
  licence: string;
  pillars: Set<string>;
  geographies: Set<string>;
  ifbs: Set<string>;
  summary: string;
};

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function plain(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function yearOf(date: string): string {
  const m = date.match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : "";
}

function shortLicence(rights: string): string {
  const cc = rights.match(/CC[-\s]?BY(?:[-\s]?(?:NC|ND|SA|NC-ND|NC-SA))?/i);
  if (cc) return cc[0].replace(/\s+/g, "-").replace(/--/g, "-").toUpperCase().replace("CC-BY", "CC-BY");
  if (/creative commons|open access/i.test(rights)) return "CC-BY";
  return "link-out";
}

function cite(names: string[], year: string): string {
  const who =
    names.length === 0
      ? ""
      : names.length === 1
        ? names[0]!
        : names.length === 2
          ? `${names[0]} & ${names[1]}`
          : names.length === 3
            ? `${names[0]}, ${names[1]} & ${names[2]}`
            : `${names[0]} et al.`;
  return [who, year].filter(Boolean).join(" ");
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const db = new Database(SQLITE, { readonly: true, fileMustExist: true });

const keys = Object.keys(COLLECTIONS);
const placeholders = keys.map(() => "?").join(",");

type ItemRow = {
  itemID: number;
  key: string;
  typeName: string;
  collectionKey: string;
};

const items = db
  .prepare(
    `SELECT i.itemID AS itemID, i.key AS key, it.typeName AS typeName, c.key AS collectionKey
     FROM items i
     JOIN itemTypes it ON it.itemTypeID = i.itemTypeID
     JOIN collectionItems ci ON ci.itemID = i.itemID
     JOIN collections c ON c.collectionID = ci.collectionID
     LEFT JOIN deletedItems d ON d.itemID = i.itemID
     WHERE d.itemID IS NULL AND c.key IN (${placeholders})`,
  )
  .all(...keys) as ItemRow[];

const byId = new Map<number, { key: string; typeName: string; collections: Set<string> }>();
for (const row of items) {
  const cur = byId.get(row.itemID) ?? { key: row.key, typeName: row.typeName, collections: new Set<string>() };
  cur.collections.add(row.collectionKey);
  byId.set(row.itemID, cur);
}

const ids = [...byId.entries()].filter(([, v]) => TYPES.has(v.typeName)).map(([id]) => id);
console.log(`items in collections: ${byId.size}; kept types: ${ids.length}`);

const idPlaceholders = ids.map(() => "?").join(",");
const fields = db
  .prepare(
    `SELECT d.itemID AS itemID, f.fieldName AS fieldName, v.value AS value
     FROM itemData d
     JOIN fields f ON f.fieldID = d.fieldID
     JOIN itemDataValues v ON v.valueID = d.valueID
     WHERE d.itemID IN (${idPlaceholders})
       AND f.fieldName IN ('title','date','DOI','url','abstractNote','rights')`,
  )
  .all(...ids) as { itemID: number; fieldName: string; value: string }[];

const fieldMap = new Map<number, Record<string, string>>();
for (const f of fields) {
  const bag = fieldMap.get(f.itemID) ?? {};
  bag[f.fieldName] = f.value;
  fieldMap.set(f.itemID, bag);
}

const creators = db
  .prepare(
    `SELECT ic.itemID AS itemID, c.lastName AS lastName, c.firstName AS firstName, c.fieldMode AS fieldMode, ic.orderIndex AS orderIndex
     FROM itemCreators ic
     JOIN creators c ON c.creatorID = ic.creatorID
     WHERE ic.itemID IN (${idPlaceholders})
     ORDER BY ic.itemID, ic.orderIndex`,
  )
  .all(...ids) as { itemID: number; lastName: string; firstName: string; fieldMode: number; orderIndex: number }[];

const creatorMap = new Map<number, string[]>();
for (const c of creators) {
  const name = c.fieldMode === 1 ? c.lastName : c.lastName || c.firstName;
  if (!name) continue;
  const list = creatorMap.get(c.itemID) ?? [];
  list.push(name);
  creatorMap.set(c.itemID, list);
}

const rows = new Map<string, Row>();
const geoCounts: Record<string, number> = {};

for (const id of ids) {
  const meta = byId.get(id)!;
  const f = fieldMap.get(id) ?? {};
  const title = plain(f.title ?? "");
  if (!title) continue;
  const year = yearOf(f.date ?? "");
  const doi = (f.DOI ?? "").replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim();
  const url = (f.url ?? "").trim();
  const oaUrl = /^https?:\/\//i.test(url) ? url : "";
  const licence = shortLicence(f.rights ?? "");
  const abstract = plain(f.abstractNote ?? "");
  const blob = `${title} ${abstract}`;
  const pillars = new Set<string>();
  const ifbs = new Set<string>();
  const geographies = new Set<string>();
  for (const ck of meta.collections) {
    const map = COLLECTIONS[ck];
    if (!map) continue;
    for (const p of map.pillars) pillars.add(p);
    for (const i of map.ifbs) ifbs.add(i);
  }
  for (const g of GEO) {
    if (!g.re.test(blob)) continue;
    if (g.box === "NE Atlantic Mesopelagic Belt" && !/atlantic|bbnj|high seas|rfmo/i.test(blob)) continue;
    if (g.box === "CCZ" && /clarion[-\s]?clipperton south/i.test(blob)) continue;
    geographies.add(g.box);
  }
  if (/sargasso sea commission/i.test(blob)) ifbs.add("Sargasso Sea Commission");
  const summary = abstract.length > 280 ? `${abstract.slice(0, 277).trimEnd()}…` : abstract;
  rows.set(meta.key, {
    zoteroKey: meta.key,
    doi,
    title,
    year,
    citation: cite(creatorMap.get(id) ?? [], year),
    oaUrl,
    licence,
    pillars,
    geographies,
    ifbs,
    summary,
  });
}

const previous = parseCsv(readFileSync(PREV, "utf8"));

function addSemi(set: Set<string>, raw: string | undefined) {
  if (!raw) return;
  for (const part of raw.split(";")) {
    const t = part.trim();
    if (t) set.add(t);
  }
}

let merged = 0;
const consumed = new Set<number>();
for (let i = 0; i < previous.length; i++) {
  const old = previous[i]!;
  let hit = old.zotero_key ? rows.get(old.zotero_key) : undefined;
  if (!hit && old.title) {
    const n = norm(old.title).slice(0, 42);
    hit = [...rows.values()].find((r) => norm(r.title).includes(n) || n.includes(norm(r.title).slice(0, 42)));
  }
  if (!hit) continue;
  consumed.add(i);
  merged += 1;
  addSemi(hit.pillars, old.pillars);
  addSemi(hit.geographies, old.geographies);
  addSemi(hit.ifbs, old.ifbs);
  if (old.summary_snippet && old.summary_snippet.length > hit.summary.length) hit.summary = old.summary_snippet;
  if (!hit.doi && old.doi) hit.doi = old.doi;
  if (!hit.oaUrl && old.oa_url) hit.oaUrl = old.oa_url;
  if (old.licence && old.licence !== "link-out") hit.licence = old.licence;
}

const header = ["zotero_key", "doi", "title", "year", "citation", "oa_url", "licence", "pillars", "geographies", "ifbs", "summary_snippet", "status"];
const ordered = [...rows.values()].sort((a, b) => (b.year || "0000").localeCompare(a.year || "0000") || a.title.localeCompare(b.title));
const lines = [header.join(",")];
for (const r of ordered) {
  for (const g of r.geographies) geoCounts[g] = (geoCounts[g] ?? 0) + 1;
  lines.push(
    [
      r.zoteroKey,
      r.doi,
      r.title,
      r.year,
      r.citation,
      r.oaUrl,
      r.licence,
      [...r.pillars].sort().join(";"),
      [...r.geographies].sort().join(";"),
      [...r.ifbs].sort().join(";"),
      r.summary,
      "published",
    ]
      .map(csvEscape)
      .join(","),
  );
}

for (let i = 0; i < previous.length; i++) {
  if (consumed.has(i)) continue;
  const old = previous[i]!;
  if ([...rows.values()].some((r) => norm(r.title) === norm(old.title ?? ""))) continue;
  lines.push(
    [old.zotero_key ?? "", old.doi ?? "", old.title ?? "", old.year ?? "", old.citation ?? "", old.oa_url ?? "", old.licence ?? "", old.pillars ?? "", old.geographies ?? "", old.ifbs ?? "", old.summary_snippet ?? "", old.status || "published"]
      .map(csvEscape)
      .join(","),
  );
  console.log("kept unmatched seed row:", old.title);
}

writeFileSync(OUT, `${lines.join("\n")}\n`);
console.log(`wrote ${ordered.length + (previous.length - consumed.size)} rows (${merged} merged with previous seed)`);
console.log("geography counts", geoCounts);
console.log("known keys", ["6K6WPBFQ", "U7EHXJMV", "TU7WCKWE", "6TWPSKN8", "PH5MCXV9"].map((k) => `${k}:${rows.has(k)}`).join(" "));

db.close();
