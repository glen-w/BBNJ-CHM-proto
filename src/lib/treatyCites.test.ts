import { describe, expect, it } from "vitest";

import { citeCaption, citesFor, citesForPacks } from "@/lib/treatyCites";

describe("treatyCites seed map", () => {
  it("maps MGR receipt / B-SBI and later Art 12 notifications", () => {
    expect(citesFor("mgr", "pre_collection")[0]?.article).toBe("Art 12");
    expect(citesFor("mgr", "batch_id_issued")[0]?.label).toMatch(/B-SBI/);
    expect(citesFor("mgr", "post_collection")[0]?.article).toBe("Art 12.5");
    expect(citesFor("mgr", "utilisation")[0]?.article).toBe("Art 12.8");
  });

  it("maps EIA stages to Arts 31–40 short labels", () => {
    expect(citesFor("eia", "screening")[0]?.article).toBe("Art 31");
    expect(citesFor("eia", "planned_activity_notice")[0]?.article).toBe("Art 32");
    expect(citesFor("eia", "draft_eia")[0]?.article).toBe("Arts 33–34");
    expect(citesFor("eia", "decision_conditions")[0]?.article).toBe("Arts 34/37");
    expect(citesFor("eia", "monitoring_review")[0]?.article).toBe("Arts 38–40");
    expect(citeCaption("eia", "screening")).toContain("Art 31");
  });

  it("maps CBTMT to Art 51.3(b) and dedupes pack lists", () => {
    expect(citesFor("cbtmt", "need_posted")[0]?.article).toBe("Art 51.3(b)");
    expect(citesFor("cbtmt", "match_suggested")[0]?.article).toBe("Art 51.3(b)");
    const packed = citesForPacks("eia", ["screening", "draft_eia", "screening"]);
    expect(packed).toHaveLength(2);
    expect(packed.map((c) => c.article)).toEqual(["Art 31", "Arts 33–34"]);
    expect(citesForPacks("cbtmt", [])[0]?.article).toBe("Art 51.3(b)");
    expect(citesFor("abmt", "proposal_stub")[0]?.article).toBe("Art 51.3(a)(ii)");
  });
});
