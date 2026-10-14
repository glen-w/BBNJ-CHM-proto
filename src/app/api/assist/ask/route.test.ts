import { afterEach, describe, expect, it } from "vitest";

import { closeDb, getDb } from "@/lib/db";
import { setAssistOverlaysEnabled } from "@/server/assist-overlays";
import { createHarness, type Harness } from "@/test/helpers";

import { POST } from "./route";

function wireHarnessDb(h: Harness) {
  closeDb();
  process.env.DATABASE_PATH = h.dbPath;
  return getDb();
}

describe("POST /api/assist/ask", () => {
  let h: Harness;
  afterEach(() => {
    closeDb();
    h?.cleanup();
  });

  it("returns 403 when assist overlays are off", async () => {
    h = createHarness();
    wireHarnessDb(h);
    const res = await POST(
      new Request("http://localhost/api/assist/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "cumulative impacts", scope: "treaty" }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("returns local hits when assist is on", async () => {
    h = createHarness();
    setAssistOverlaysEnabled(wireHarnessDb(h), true);
    const res = await POST(
      new Request("http://localhost/api/assist/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "cumulative impacts screening", scope: "treaty" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { mode: string; answer: string; citations: unknown[] };
    expect(body.mode).toBe("local");
    expect(body.answer.length).toBeGreaterThan(0);
    expect(body.citations.length).toBeGreaterThan(0);
  });
});
