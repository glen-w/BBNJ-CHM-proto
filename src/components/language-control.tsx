"use client";

import { useRouter } from "next/navigation";

import { TREATY_LANG_COOKIE, TREATY_LANGS, type TreatyLangCode } from "@/lib/locale";
import { cn } from "@/lib/utils";

/**
 * Native-label links to official BBNJ pages. Persists treaty-text locale only —
 * never machine-translates the UI.
 */
export function LanguageControl({ active }: { active: TreatyLangCode }) {
  const router = useRouter();

  function choose(code: TreatyLangCode, url: string) {
    document.cookie = `${TREATY_LANG_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    window.open(url, "_blank", "noopener,noreferrer");
    router.refresh();
  }

  return (
    <nav aria-label="Treaty text languages" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      {TREATY_LANGS.map((lang, i) => (
        <span key={lang.code} className="inline-flex items-center gap-x-2">
          {i > 0 ? (
            <span aria-hidden="true" className="select-none text-line">
              ·
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => choose(lang.code, lang.url)}
            className={cn(
              "rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              lang.code === active ? "font-semibold text-foreground" : "",
            )}
            title={`Open official BBNJ page (${lang.label}) in a new tab`}
          >
            {lang.label}
          </button>
        </span>
      ))}
    </nav>
  );
}
