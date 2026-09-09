/**
 * Treaty-text locale stub — not UI i18n.
 * UI strings stay English; these codes only pick which official BBNJ page to open
 * and what the masthead shows as “Treaty text: …”.
 */
export const TREATY_LANG_COOKIE = "chm_treaty_lang";

export const TREATY_LANGS = [
  { code: "ar", label: "العربية", url: "https://www.un.org/bbnjagreement/ar" },
  { code: "zh", label: "中文", url: "https://www.un.org/bbnjagreement/zh" },
  { code: "en", label: "English", url: "https://www.un.org/bbnjagreement/en" },
  { code: "fr", label: "Français", url: "https://www.un.org/bbnjagreement/fr" },
  { code: "ru", label: "Русский", url: "https://www.un.org/bbnjagreement/ru" },
  { code: "es", label: "Español", url: "https://www.un.org/bbnjagreement/es" },
] as const;

export type TreatyLangCode = (typeof TREATY_LANGS)[number]["code"];

export function isTreatyLang(value: string | undefined | null): value is TreatyLangCode {
  return !!value && TREATY_LANGS.some((l) => l.code === value);
}

export function treatyLangOf(value: string | undefined | null): (typeof TREATY_LANGS)[number] {
  return TREATY_LANGS.find((l) => l.code === value) ?? TREATY_LANGS.find((l) => l.code === "en")!;
}
