import { describe, expect, it } from "vitest";

import { parseCsv } from "@/server/parseCsv";

describe("parseCsv", () => {
  it("parses quoted commas and escaped quotes", () => {
    const rows = parseCsv(`a,b\n"hello, world","say ""hi"""\n`);
    expect(rows).toEqual([{ a: "hello, world", b: 'say "hi"' }]);
  });
});
