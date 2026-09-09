import { getDb } from "@/lib/db";
import { DomainError } from "@/server/errors";
import { getImportRun } from "@/server/import";
import { getSessionUser } from "@/server/session";
import { buildMgrErrorReport } from "@/server/template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Secretariat only: the rejected rows of one import run, re-filled into the current template with an Error column. */
export async function GET(_req: Request, ctx: { params: Promise<{ runId: string }> }) {
  const { runId } = await ctx.params;
  const p = await getSessionUser();
  let run;
  try {
    run = getImportRun(getDb(), p, runId);
  } catch (e) {
    if (e instanceof DomainError && e.code === "forbidden") return new Response("Forbidden", { status: 403 });
    throw e;
  }
  if (!run) return new Response("Not found", { status: 404 });
  const buf = await buildMgrErrorReport(run);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="mgr-import-${runId.slice(0, 8)}-errors.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
