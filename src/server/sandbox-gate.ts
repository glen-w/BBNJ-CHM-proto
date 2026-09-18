import { timingSafeEqual } from "node:crypto";

/**
 * Optional HTTP Basic gate in front of the demo cookie logins.
 * On when SANDBOX_BASIC_PASSWORD is set (hosted sandbox). Off locally.
 * /api/health stays open so Fly can probe the Machine.
 */
type Env = Record<string, string | undefined>;

const DEFAULT_USER = "bbnj";

export function sandboxBasicConfigured(env: Env = process.env): boolean {
  return Boolean(env.SANDBOX_BASIC_PASSWORD);
}

export function sandboxBasicBypassPath(pathname: string): boolean {
  return pathname === "/api/health";
}

export function sandboxBasicExpected(env: Env = process.env): { user: string; password: string } | null {
  const password = env.SANDBOX_BASIC_PASSWORD;
  if (!password) return null;
  const user = env.SANDBOX_BASIC_USER?.trim() || DEFAULT_USER;
  return { user, password };
}

export function sandboxBasicAuthorized(authorization: string | null | undefined, env: Env = process.env): boolean {
  const expected = sandboxBasicExpected(env);
  if (!expected) return true;
  if (!authorization?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = Buffer.from(authorization.slice("Basic ".length), "base64").toString("utf8");
  } catch {
    return false;
  }
  return safeEqual(decoded, `${expected.user}:${expected.password}`);
}

export function sandboxBasicUnauthorizedResponse(): Response {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="BBNJ Cl-HM sandbox"',
      "Cache-Control": "no-store",
    },
  });
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}
