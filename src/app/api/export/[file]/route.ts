import { getDb } from "@/lib/db";
import { envelope, EXPORT_DOMAINS, exportTable, type ExportDomain, toCsv } from "@/server/export";
import { recordRefusal } from "@/server/policy";
import { getSessionUser } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/export/{mgr|eia|cbtmt|audit}.{csv|json}
 * Rows are exactly what the caller's role sees on the corresponding page.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const m = /^([a-z]+)\.(csv|json)$/.exec(file);
  if (!m || !(EXPORT_DOMAINS as string[]).includes(m[1])) return new Response("Not found", { status: 404 });
  const domain = m[1] as ExportDomain;
  const format = m[2] as "csv" | "json";
  const p = await getSessionUser();
  const db = getDb();
  const table = exportTable(db, p, domain);
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "csv") {
    return new Response(toCsv(table), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="chm-${domain}-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }
  return Response.json(
    { ...envelope(p, table.rows), columns: table.columns },
    { headers: { "Content-Disposition": `inline; filename="chm-${domain}-${stamp}.json"`, "Cache-Control": "no-store" } },
  );
}

/** Anything else (POST etc.) is refused and logged. */
export async function POST(req: Request) {
  const p = await getSessionUser();
  recordRefusal(p, "export_write", { path: new URL(req.url).pathname, reason: "Exports are read-only" });
  return new Response("Method not allowed", { status: 405 });
}
