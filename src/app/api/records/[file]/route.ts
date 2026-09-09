import { getDb } from "@/lib/db";
import { PUBLIC_RECORD_ID_PATTERN } from "@/lib/contracts/extensions";
import { envelope, exportRecord, recordPdf } from "@/server/export";
import { getSessionUser } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/records/BBNJ-MGR-2026-00001.json | .pdf
 * 404 for unknown or invisible records (a refusal row is written either way,
 * so the public cannot probe for restricted ids).
 */
export async function GET(req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const m = /^(.+)\.(json|pdf)$/.exec(decodeURIComponent(file));
  if (!m || !PUBLIC_RECORD_ID_PATTERN.test(m[1])) return new Response("Not found", { status: 404 });
  const [, publicRecordId, format] = m;
  const p = await getSessionUser();
  const db = getDb();
  const path = new URL(req.url).pathname;
  if (format === "pdf") {
    const pdf = recordPdf(db, p, publicRecordId, path);
    if (!pdf) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${publicRecordId}.pdf"`, "Cache-Control": "no-store" },
    });
  }
  const rec = exportRecord(db, p, publicRecordId, path);
  if (!rec) return new Response("Not found", { status: 404 });
  const env = envelope(p, [rec]);
  return Response.json({ ...env, rows: undefined, record: rec }, { headers: { "Cache-Control": "no-store" } });
}
