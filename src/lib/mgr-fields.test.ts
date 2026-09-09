import { describe, expect, it } from "vitest";

import {
  FIELD_DEFS,
  MgrPreCollectionInput,
  coerceMgrInput,
  normaliseHeader,
  splitMgrInput,
} from "@/lib/mgr-fields";

describe("FIELD_DEFS → Zod input", () => {
  it("requires title and geographical area", () => {
    const empty = MgrPreCollectionInput.safeParse(coerceMgrInput({}));
    expect(empty.success).toBe(false);
    if (empty.success) return;
    const paths = empty.error.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["title", "locationHint"]));
  });

  it("accepts a minimal valid payload and defaults optional fields", () => {
    const parsed = MgrPreCollectionInput.parse(
      coerceMgrInput({ title: "Cruise", locationHint: "CCZ" }),
    );
    expect(parsed.title).toBe("Cruise");
    expect(parsed.locationHint).toBe("CCZ");
    expect(parsed.tkFpicFlag).toBe(false);
    expect(parsed.confidentiality).toBe("public");
    expect(parsed.objectives).toBe("");
  });
});

describe("coerceMgrInput", () => {
  it("treats common truthy strings as the FPIC boolean", () => {
    for (const v of [true, "on", "true", "1", "yes", "y"]) {
      expect(coerceMgrInput({ tkFpicFlag: v }).tkFpicFlag).toBe(true);
    }
    expect(coerceMgrInput({ tkFpicFlag: "no" }).tkFpicFlag).toBe(false);
  });

  it("lowercases select values and falls back to the first option", () => {
    expect(coerceMgrInput({ confidentiality: " Restricted " }).confidentiality).toBe("restricted");
    expect(coerceMgrInput({ confidentiality: "" }).confidentiality).toBe("public");
  });

  it("stringifies non-string text cells", () => {
    expect(coerceMgrInput({ title: 12 }).title).toBe("12");
    expect(coerceMgrInput({ title: null }).title).toBe("");
  });
});

describe("splitMgrInput / normaliseHeader", () => {
  it("puts column fields on the row and non-empty details in JSON", () => {
    const input = MgrPreCollectionInput.parse(
      coerceMgrInput({
        title: "Cruise",
        locationHint: "CCZ",
        objectives: "Sample",
        methodMeans: "",
      }),
    );
    const { columns, details } = splitMgrInput(input);
    expect(columns.title).toBe("Cruise");
    expect(columns.locationHint).toBe("CCZ");
    expect(details.objectives).toBe("Sample");
    expect(details.methodMeans).toBeUndefined();
  });

  it("normalises spreadsheet headers the same way import does", () => {
    expect(normaliseHeader(" Geographical Area ")).toBe("geographical_area");
    expect(normaliseHeader(undefined)).toBe("");
  });

  it("keeps excelHeader unique and aligned with field keys", () => {
    const headers = FIELD_DEFS.map((f) => f.excelHeader);
    expect(new Set(headers).size).toBe(headers.length);
    expect(FIELD_DEFS.some((f) => f.key === "title" && f.required)).toBe(true);
  });
});
