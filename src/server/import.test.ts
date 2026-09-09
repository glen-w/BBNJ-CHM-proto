import { afterEach, describe, expect, it } from "vitest";

import { FIELD_DEFS } from "@/lib/mgr-fields";
import { importMgrExcel } from "@/server/import";
import { getMgrBatch } from "@/server/mgr";
import { buildMgrSample, buildMgrTemplate, sheetNames } from "@/server/template";
import { createHarness, expectDomainCodeAsync, type Harness } from "@/test/helpers";

describe("MGR Excel template + import I/O", () => {
  let h: Harness;
  afterEach(() => h?.cleanup());

  it("builds a workbook with Meta, Data and Field guide sheets matching FIELD_DEFS", async () => {
    const buf = await buildMgrTemplate();
    expect(await sheetNames(buf)).toEqual(["Meta", "Data", "Field guide"]);
    expect(FIELD_DEFS.map((f) => f.excelHeader)).toContain("geographical_area");
  });

  it("imports the sample fixture as excel-channel batches with a B-SBI", async () => {
    h = createHarness();
    const fixture = await buildMgrSample({ rows: 2 });
    const res = await importMgrExcel(h.db, h.secretariat(), fixture, "XSD", h.key());
    expect(res.accepted).toBe(2);
    expect(res.rejected).toBe(0);
    const batch = getMgrBatch(h.db, res.rows[0].batchId!)!;
    expect(batch.sourceChannel).toBe("excel");
    expect(batch.bSbi).toMatch(/^BSBI-XSD-/);
    expect(batch.partyCode).toBe("XSD");
  });

  it("rejects bad files and row-errors formula cells", async () => {
    h = createHarness();
    await expectDomainCodeAsync(
      async () => importMgrExcel(h.db, h.party(), await buildMgrSample(), "XSD", h.key()),
      "forbidden",
    );
    await expectDomainCodeAsync(
      () => importMgrExcel(h.db, h.secretariat(), Buffer.from("not-xlsx"), "XSD", h.key()),
      "import_rejected",
    );
    await expectDomainCodeAsync(
      async () => importMgrExcel(h.db, h.secretariat(), await buildMgrTemplate({ templateVersion: 99 }), "XSD", h.key()),
      "import_rejected",
    );
    await expectDomainCodeAsync(
      async () => importMgrExcel(h.db, h.secretariat(), await buildMgrSample({ rows: 201 }), "XSD", h.key()),
      "import_rejected",
    );
    const formula = await importMgrExcel(h.db, h.secretariat(), await buildMgrSample({ withFormula: true }), "XSD", h.key());
    expect(formula.rows.some((r) => !r.ok && /formula/i.test(r.error ?? ""))).toBe(true);
  });
});
