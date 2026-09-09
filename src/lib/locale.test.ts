import { describe, expect, it } from "vitest";

import { TREATY_LANGS, TREATY_LANG_COOKIE, isTreatyLang, treatyLangOf } from "@/lib/locale";

describe("treaty locale stub (not UI i18n)", () => {
  it("exposes the six official BBNJ language codes and URLs", () => {
    expect(TREATY_LANG_COOKIE).toBe("chm_treaty_lang");
    expect(TREATY_LANGS.map((l) => l.code)).toEqual(["ar", "zh", "en", "fr", "ru", "es"]);
    for (const lang of TREATY_LANGS) {
      expect(lang.url).toBe(`https://www.un.org/bbnjagreement/${lang.code}`);
      expect(lang.label.length).toBeGreaterThan(0);
    }
  });

  it("defaults unknown cookies to English and validates codes", () => {
    expect(isTreatyLang("en")).toBe(true);
    expect(isTreatyLang("de")).toBe(false);
    expect(isTreatyLang(undefined)).toBe(false);
    expect(treatyLangOf(undefined).code).toBe("en");
    expect(treatyLangOf("ar").label).toBe("العربية");
    expect(treatyLangOf("bogus").code).toBe("en");
  });
});
