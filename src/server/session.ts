import { cookies } from "next/headers";

import { getDb } from "@/lib/db";
import { type Principal, principalFromCookie } from "./policy";

export const SESSION_COOKIE = "chm_demo_user";

/** Demo session: cookie holds a user id. Anything not a known active user → anonymous public. */
export async function getSessionUser(): Promise<Principal> {
  const store = await cookies();
  return principalFromCookie(getDb(), store.get(SESSION_COOKIE)?.value);
}

export async function setSessionUser(userId: string | null): Promise<void> {
  const store = await cookies();
  if (userId) {
    store.set(SESSION_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  } else {
    store.delete(SESSION_COOKIE);
  }
}
