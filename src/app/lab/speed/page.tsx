import { redirect } from "next/navigation";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Legacy URL — speed tests live under Settings. */
export default async function SpeedLabRedirectPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  q.set("tab", "speed");
  if (typeof sp.notice === "string") q.set("notice", sp.notice);
  if (typeof sp.error === "string") q.set("error", sp.error);
  redirect(`/settings?${q.toString()}`);
}
