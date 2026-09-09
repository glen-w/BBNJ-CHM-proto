import { afterEach, describe, expect, it } from "vitest";

import { mintBSbi, mintPublicRecordId, mintReceiptId, nextCounter, nowIso, yearOf } from "@/server/ids";
import { BSBI_PATTERN, PUBLIC_RECORD_ID_PATTERN, RECEIPT_ID_PATTERN } from "@/lib/contracts/extensions";
import { createHarness, type Harness } from "@/test/helpers";

describe("yearOf / nowIso", () => {
  it("reads the UTC year from an ISO timestamp", () => {
    expect(yearOf("2026-12-31T23:00:00.000Z")).toBe(2026);
  });

  it("returns a parseable ISO datetime", () => {
    expect(Number.isNaN(Date.parse(nowIso()))).toBe(false);
  });
});

describe("identifier mints (SQLite counters)", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("zero-pads and advances per name", () => {
    h = createHarness();
    expect(nextCounter(h.db, "demo")).toBe(1);
    expect(nextCounter(h.db, "demo")).toBe(2);
    expect(nextCounter(h.db, "other")).toBe(1);
  });

  it("formats publicRecordId / receiptId / bSbi and uppercases the party code", () => {
    h = createHarness();
    const prid = mintPublicRecordId(h.db, "cbtmt", 2026);
    expect(prid).toBe("BBNJ-CBTMT-2026-00001");
    expect(PUBLIC_RECORD_ID_PATTERN.test(prid)).toBe(true);

    const rcpt = mintReceiptId(h.db, 2026);
    expect(rcpt).toBe("BBNJ-RCPT-2026-00001");
    expect(RECEIPT_ID_PATTERN.test(rcpt)).toBe(true);

    const a = mintBSbi(h.db, "xsd", 2026);
    const b = mintBSbi(h.db, "XSD", 2026);
    expect(a).toBe("BSBI-XSD-2026-00001");
    expect(b).toBe("BSBI-XSD-2026-00002");
    expect(BSBI_PATTERN.test(a)).toBe(true);
    expect(PUBLIC_RECORD_ID_PATTERN.test(a)).toBe(false);
  });

  it("keeps domain sequences independent", () => {
    h = createHarness();
    expect(mintPublicRecordId(h.db, "mgr", 2026)).toBe("BBNJ-MGR-2026-00001");
    expect(mintPublicRecordId(h.db, "eia", 2026)).toBe("BBNJ-EIA-2026-00001");
    expect(mintPublicRecordId(h.db, "mgr", 2027)).toBe("BBNJ-MGR-2027-00001");
  });
});
