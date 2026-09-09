/** Identifier minting steps shown on record pages and after submit/publish redirects. */
export type MintKind = "internal" | "receipt" | "bSbi" | "publicRecordId";

export const MINT_KINDS = {
  mgr: ["internal", "receipt", "bSbi", "publicRecordId"] as const,
  default: ["internal", "receipt", "publicRecordId"] as const,
} satisfies Record<string, readonly MintKind[]>;

export function parseMinted(value: string | undefined): MintKind | undefined {
  if (value === "internal" || value === "receipt" || value === "bSbi" || value === "publicRecordId") return value;
  return undefined;
}

export const MINT_LABELS: Record<MintKind, string> = {
  internal: "internalId",
  receipt: "receiptId",
  bSbi: "B-SBI",
  publicRecordId: "publicRecordId",
};
