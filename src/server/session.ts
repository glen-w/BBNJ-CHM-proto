import { cookies } from "next/headers";

import { getDb } from "@/lib/db";
import { HOME_WELCOME_COOKIE } from "@/lib/home-welcome";
import { isTreatyLang, TREATY_LANG_COOKIE } from "@/lib/locale";
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

/** Persist treaty-text locale only — never UI i18n. */
export async function setTreatyLang(code: string): Promise<void> {
  const store = await cookies();
  const lang = isTreatyLang(code) ? code : "en";
  store.set(TREATY_LANG_COOKIE, lang, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
}

/** Persist Home welcome hide only. Missing cookie = shown (first compose / first visit). */
export async function setHomeWelcome(show: boolean): Promise<void> {
  const store = await cookies();
  if (show) {
    store.delete(HOME_WELCOME_COOKIE);
    return;
  }
  store.set(HOME_WELCOME_COOKIE, "0", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
}
