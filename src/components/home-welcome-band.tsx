import Image from "next/image";
import { cookies } from "next/headers";

import { HOME_WELCOME_COOKIE, homeWelcomeVisible } from "@/lib/home-welcome";
import { setHomeWelcomeAction } from "@/server/actions";

export async function HomeWelcomeBand() {
  const visible = homeWelcomeVisible((await cookies()).get(HOME_WELCOME_COOKIE)?.value);

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
    <section
      aria-labelledby="home-welcome-heading"
      className="relative flex max-h-[11.25rem] overflow-hidden rounded-lg border border-institutional/20 bg-[color-mix(in_oklch,var(--institutional)_9%,var(--canvas))]"
    >
      <div className="pointer-events-none absolute inset-0">
        <Image
          src="/home-welcome-still.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 1152px) 100vw, 1152px"
          className="object-cover object-[72%_48%] opacity-[0.38]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[color-mix(in_oklch,var(--institutional)_11%,var(--canvas))] from-[12%] via-[color-mix(in_oklch,var(--institutional)_9%,var(--canvas))]/75 via-[48%] to-transparent" />
      </div>
      <div className="relative z-10 min-w-0 flex-1 px-4 py-3">
        <h1 id="home-welcome-heading" className="text-lg font-semibold tracking-tight text-foreground">
          BBNJ Clearing-House Mechanism
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-snug text-foreground/80">
          Shared rails for submit, manage, publish, notify and audit. Without prejudice to COP1.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <a
            href="#about-desk"
            className="text-sm text-institutional underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            About this Cl-HM
          </a>
          <form action={setHomeWelcomeAction}>
            <input type="hidden" name="show" value="0" />
            <button
              type="submit"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Hide welcome
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
