import { describe, expect, it } from "vitest";

import {
  sandboxBasicAuthorized,
  sandboxBasicBypassPath,
  sandboxBasicConfigured,
  sandboxBasicExpected,
} from "./sandbox-gate";

function basic(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

describe("sandboxBasicConfigured", () => {
  it("is off unless a password is set", () => {
    expect(sandboxBasicConfigured({})).toBe(false);
    expect(sandboxBasicConfigured({ SANDBOX_BASIC_USER: "bbnj" })).toBe(false);
    expect(sandboxBasicConfigured({ SANDBOX_BASIC_PASSWORD: "secret" })).toBe(true);
  });
});

describe("sandboxBasicExpected", () => {
  it("defaults the user to bbnj", () => {
    expect(sandboxBasicExpected({ SANDBOX_BASIC_PASSWORD: "secret" })).toEqual({
      user: "bbnj",
      password: "secret",
    });
  });

  it("honours SANDBOX_BASIC_USER when set", () => {
    expect(sandboxBasicExpected({ SANDBOX_BASIC_USER: " review ", SANDBOX_BASIC_PASSWORD: "x" })).toEqual({
      user: "review",
      password: "x",
    });
  });
});

describe("sandboxBasicAuthorized", () => {
  const env = { SANDBOX_BASIC_USER: "bbnj", SANDBOX_BASIC_PASSWORD: "s3cret" };

  it("allows all traffic when the gate is off", () => {
    expect(sandboxBasicAuthorized(null, {})).toBe(true);
    expect(sandboxBasicAuthorized("Basic Zm9v", {})).toBe(true);
  });

  it("accepts the configured pair", () => {
    expect(sandboxBasicAuthorized(basic("bbnj", "s3cret"), env)).toBe(true);
  });

  it("rejects missing, wrong, or malformed credentials", () => {
    expect(sandboxBasicAuthorized(null, env)).toBe(false);
    expect(sandboxBasicAuthorized("Bearer nope", env)).toBe(false);
    expect(sandboxBasicAuthorized(basic("bbnj", "wrong"), env)).toBe(false);
    expect(sandboxBasicAuthorized(basic("other", "s3cret"), env)).toBe(false);
    expect(sandboxBasicAuthorized("Basic not-base64!!!", env)).toBe(false);
  });

  it("compares user:password as one string so a colon in the password still works", () => {
    const colon = { SANDBOX_BASIC_USER: "bbnj", SANDBOX_BASIC_PASSWORD: "a:b:c" };
    expect(sandboxBasicAuthorized(basic("bbnj", "a:b:c"), colon)).toBe(true);
    expect(sandboxBasicAuthorized(basic("bbnj", "a:b"), colon)).toBe(false);
  });
});

describe("sandboxBasicBypassPath", () => {
  it("opens only the Fly health probe", () => {
    expect(sandboxBasicBypassPath("/api/health")).toBe(true);
    expect(sandboxBasicBypassPath("/api/health/")).toBe(false);
    expect(sandboxBasicBypassPath("/login")).toBe(false);
    expect(sandboxBasicBypassPath("/")).toBe(false);
  });
});
