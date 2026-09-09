import { can, recordRefusal } from "@/server/policy";
import { getSessionUser } from "@/server/session";
import { speedLogText } from "@/server/speed-lab";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The lab log as plain text (one JSON object per line). Secretariat only, like the lab page. */
export async function GET() {
  const p = await getSessionUser();
  if (!can(p, "import")) {
    recordRefusal(p, "import", { path: "/api/lab/speed-runs.jsonl", reason: "Speed lab log requested without the import permission" });
    return new Response("Not found", { status: 404 });
  }
  return new Response(speedLogText(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="speed-runs.jsonl"',
      "Cache-Control": "no-store",
    },
  });
}
