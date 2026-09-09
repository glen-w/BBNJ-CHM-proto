import { EIA_SCREENING_TEMPLATE_NAME, EIA_SCREENING_TEMPLATE_VERSION } from "@/lib/eia-fields";
import { buildEiaScreeningTemplate } from "@/server/template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const buf = await buildEiaScreeningTemplate();
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${EIA_SCREENING_TEMPLATE_NAME}-v${EIA_SCREENING_TEMPLATE_VERSION}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
