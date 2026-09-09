import { MGR_TEMPLATE_NAME, MGR_TEMPLATE_VERSION } from "@/lib/mgr-fields";
import { buildMgrTemplate } from "@/server/template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const buf = await buildMgrTemplate();
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${MGR_TEMPLATE_NAME}-v${MGR_TEMPLATE_VERSION}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
