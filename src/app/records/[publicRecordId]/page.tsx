import { notFound, redirect } from "next/navigation";

import { getDb } from "@/lib/db";
import { domainPath } from "@/lib/format";
import { resolvePublicRecord } from "@/server/queries";
import { getSessionUser } from "@/server/session";

type Props = { params: Promise<{ publicRecordId: string }> };

/** Stable public URL: /records/BBNJ-MGR-2026-00001 → the record's page, subject to the read policy. */
export default async function RecordResolverPage({ params }: Props) {
  const { publicRecordId } = await params;
  const p = await getSessionUser();
  const hit = resolvePublicRecord(getDb(), p, decodeURIComponent(publicRecordId));
  if (!hit) notFound();
  redirect(domainPath(hit.domain, hit.recordId));
}
