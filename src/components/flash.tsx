import { parseMinted, type MintKind } from "@/lib/mint";

export type Flash = { notice?: string; error?: string; minted?: MintKind };

export async function flashFrom(searchParams: Promise<Record<string, string | string[] | undefined>> | undefined): Promise<Flash> {
  const sp = (await searchParams) ?? {};
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  return { notice: pick("notice"), error: pick("error"), minted: parseMinted(pick("minted")) };
}

export { FlashBanner } from "@/components/flash-banner";
