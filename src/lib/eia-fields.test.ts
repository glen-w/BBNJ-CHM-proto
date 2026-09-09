import { describe, expect, it } from "vitest";

import { coerceEiaScreeningInput, EIA_SCREENING_FIELDS, EIA_SCREENING_TEMPLATE_NAME, normaliseEiaHeader } from "@/lib/eia-fields";

describe("eia-fields", () => {
  it("exposes the screening template marker and required headers", () => {
    expect(EIA_SCREENING_TEMPLATE_NAME).toBe("bbnj-chm-eia-screening");
    expect(EIA_SCREENING_FIELDS.map((f) => f.excelHeader)).toEqual([
      "title",
      "abnj_box",
      "party_code",
      "screening_outcome",
      "confidentiality",
    ]);
    expect(normaliseEiaHeader(" ABNJ Box ")).toBe("abnj_box");
  });

  it("coerces a valid screening row and rejects bad outcomes / boxes", () => {
    expect(
      coerceEiaScreeningInput({
        title: "Cable survey",
        abnj_box: "CCZ",
        party_code: "xsd",
        screening_outcome: "eia_required",
        confidentiality: "public",
      }),
    ).toEqual({
      title: "Cable survey",
      abnjBox: "CCZ",
      partyCode: "XSD",
      screeningOutcome: "eia_required",
      confidentiality: "public",
    });
    expect(() =>
      coerceEiaScreeningInput({
        title: "X",
        abnj_box: "Atlantis",
        party_code: "XSD",
        screening_outcome: "eia_required",
        confidentiality: "public",
      }),
    ).toThrow();
    expect(() =>
      coerceEiaScreeningInput({
        title: "X",
        abnj_box: "CCZ",
        party_code: "XSD",
        screening_outcome: "maybe",
        confidentiality: "public",
      }),
    ).toThrow();
  });
});
