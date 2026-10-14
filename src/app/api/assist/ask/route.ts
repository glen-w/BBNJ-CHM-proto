import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { isAssistOverlaysEnabled, localCorpusAsk, paperfulCorpusAsk } from "@/server/assist-overlays";

const Body = z.object({
  question: z.string().min(3).max(2000),
  scope: z.enum(["all", "treaty", "literature"]).default("all"),
});

export async function POST(req: Request) {
  const db = getDb();
  if (!isAssistOverlaysEnabled(db)) {
    return NextResponse.json({ error: "Assist overlays are off for this desk." }, { status: 403 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const paperful = await paperfulCorpusAsk(parsed.question, parsed.scope);
  if (paperful) {
    return NextResponse.json({
      answer: paperful.answer,
      mode: "paperful",
      citations: paperful.citations,
    });
  }

  const hits = localCorpusAsk(db, parsed.question, parsed.scope, 5);
  if (hits.length === 0) {
    return NextResponse.json({
      answer: "No matching excerpts in the selected corpus. Try broader terms or switch scope.",
      mode: "local",
      citations: [],
    });
  }

  const lines = hits.map((h) => `• ${h.chunk.title}: ${h.chunk.text}`);
  return NextResponse.json({
    answer: lines.join("\n\n"),
    mode: "local",
    citations: hits.map((h) => ({ title: h.chunk.title, href: h.chunk.href })),
  });
}
