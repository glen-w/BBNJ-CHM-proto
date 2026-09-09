import { ChevronDown, Lightbulb, List, ScrollText, Search, Upload } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";

import {
  HOME_WELCOME_COOKIE,
  HOME_WELCOME_JUMPS,
  homeWelcomeGetStarted,
  homeWelcomeSubmitMode,
  homeWelcomeVisible,
  type HomeWelcomeCard,
} from "@/lib/home-welcome";
import { cn } from "@/lib/utils";
import { setHomeWelcomeAction } from "@/server/actions";
import { can } from "@/server/policy";
import { getSessionUser } from "@/server/session";

const JUMP_ICON: Record<string, typeof Lightbulb> = {
  "#get-started": Lightbulb,
  "#recent-records": List,
  "/about": ScrollText,
};

const CARD_ICON = {
  learn: Lightbulb,
  search: Search,
  submit: Upload,
} as const;

export async function HomeWelcomeBand() {
  const visible = homeWelcomeVisible((await cookies()).get(HOME_WELCOME_COOKIE)?.value);
  const principal = await getSessionUser();
  const mode = homeWelcomeSubmitMode(
    can(principal, "submit"),
    can(principal, "submit", { domain: "cbtmt", recordKind: "offer" }),
  );
  const cards = homeWelcomeGetStarted(mode);

  if (!visible) {
    return (
      <div className="flex items-center justify-between gap-4">
        <h1 className="sr-only">Clearing-House Mechanism</h1>
        <form action={setHomeWelcomeAction} className="ms-auto">
          <input type="hidden" name="show" value="1" />
          <button
            type="submit"
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Show welcome
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <section aria-labelledby="home-welcome-heading" className="relative overflow-hidden rounded-t-lg border border-b-0 border-institutional/25">
        <div className="pointer-events-none absolute inset-0">
          <Image
            src="/home-welcome-still.jpg"
            alt=""
            fill
            preload
            sizes="(max-width: 1152px) 100vw, 1152px"
            className="object-cover object-[68%_42%] opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[color-mix(in_oklch,var(--institutional)_55%,black)]/88 from-[0%] via-[color-mix(in_oklch,var(--institutional)_32%,transparent)] via-[48%] to-transparent" />
        </div>
        <div className="relative z-10 flex min-h-52 flex-col justify-between gap-5 px-5 py-6 sm:min-h-60 sm:px-6 sm:py-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 max-w-2xl">
              <h1 id="home-welcome-heading" className="text-xl font-semibold tracking-tight text-institutional-foreground sm:text-2xl">
                Welcome to the BBNJ Clearing-House Mechanism
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-institutional-foreground/90">
                Your gateway to biodiversity records, collaboration and action — connecting Parties, sharing
                notifications, and supporting the Agreement. Without prejudice to COP1.
              </p>
            </div>
            <form action={setHomeWelcomeAction} className="shrink-0">
              <input type="hidden" name="show" value="0" />
              <button
                type="submit"
                className="text-xs text-institutional-foreground/80 underline underline-offset-2 hover:text-institutional-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Hide welcome
              </button>
            </form>
          </div>
          <nav aria-label="Welcome shortcuts" className="grid gap-2 sm:grid-cols-3">
            {HOME_WELCOME_JUMPS.map((jump) => {
              const Icon = JUMP_ICON[jump.href] ?? ScrollText;
              const isHash = jump.href.startsWith("#");
              const className =
                "inline-flex min-h-11 items-center justify-between gap-2 rounded-md border border-white/75 bg-[color-mix(in_oklch,var(--institutional)_38%,white)]/35 px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-institutional-foreground shadow-sm backdrop-blur-[2px] hover:bg-[color-mix(in_oklch,var(--institutional)_48%,white)]/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
              const inner = (
                <>
                  <span className="inline-flex items-center gap-2">
                    <Icon aria-hidden="true" className="size-4" />
                    {jump.label}
                  </span>
                  <ChevronDown aria-hidden="true" className="size-4 opacity-80" />
                </>
              );
              return isHash ? (
                <a key={jump.href} href={jump.href} className={className}>{inner}</a>
              ) : (
                <Link key={jump.href} href={jump.href} className={className}>{inner}</Link>
              );
            })}
          </nav>
        </div>
      </section>

      <section
        id="get-started"
        aria-labelledby="get-started-heading"
        className="scroll-mt-20 rounded-b-lg border border-t-0 bg-muted/50 px-5 py-4 sm:px-6"
      >
        <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-line pb-2">
          <h2 id="get-started-heading" className="text-base font-semibold tracking-tight">
            Get started
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {cards.map((card) => (
            <GetStartedCard key={card.key} card={card} />
          ))}
        </div>
      </section>
    </div>
  );
}

function GetStartedCard({ card }: { card: HomeWelcomeCard }) {
  const Icon = CARD_ICON[card.key];
  return (
    <article className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <Link
        href={card.headerHref}
        className="flex items-center gap-2 bg-institutional px-3 py-2 text-institutional-foreground hover:bg-action focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Icon aria-hidden="true" className="size-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{card.label}</span>
        <span aria-hidden="true" className="ms-auto text-sm">
          →
        </span>
      </Link>
      <ul className="list-disc space-y-1.5 px-4 py-3 ps-8 text-sm">
        {card.links.map((link) => (
          <li key={`${card.key}-${link.href}-${link.label}`}>
            {link.external ? (
              <a
                href={link.href}
                rel="noopener noreferrer"
                target="_blank"
                className={cn("text-foreground underline-offset-2 hover:text-institutional hover:underline")}
              >
                {link.label}
              </a>
            ) : (
              <Link href={link.href} className="text-foreground underline-offset-2 hover:text-institutional hover:underline">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}
