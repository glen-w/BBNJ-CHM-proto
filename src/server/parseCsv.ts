/**
 * Minimal RFC 4180 CSV parser (quoted fields, commas, newlines in quotes).
 * Enough for fixtures/bbnj-chm-seed-pack/csv — no streaming, no Excel.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows = splitCsvRecords(text.replace(/^\uFEFF/, ""));
  if (rows.length === 0) return [];
  const header = rows[0]!.map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((c) => c.trim() !== "")).map((cells) => {
    const out: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) {
      out[header[i]!] = (cells[i] ?? "").trim();
    }
    return out;
  });
}

function splitCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
      row.push(field);
      records.push(row);
      row = [];
      field = "";
      i += ch === "\r" ? 2 : 1;
      continue;
    }
    if (ch === "\r") {
      row.push(field);
      records.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }
  return records;
}
