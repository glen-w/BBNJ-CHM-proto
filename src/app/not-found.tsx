import Link from "next/link";

// Rendered outside AppShell (no session/DB read on an error surface); matches the desk canvas and type.
export default function NotFound() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-md focus:outline-none focus:ring-3 focus:ring-ring/50"
      >
        Skip to content
      </a>
      <header className="border-b bg-card">
        <div className="mx-auto w-full max-w-6xl px-6 py-2.5">
          <Link href="/" className="flex items-baseline gap-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <span className="text-base font-semibold tracking-tight text-institutional">BBNJ Cl-HM</span>
            <span className="text-xs text-muted-foreground">working desk</span>
          </Link>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-xl space-y-3 px-6 py-16 text-sm outline-none">
        <h1 className="text-xl font-semibold tracking-tight">Not found</h1>
        <p className="leading-relaxed text-muted-foreground">
          Either this record does not exist or it is not visible to your current role (drafts, pending packs and restricted tiers are hidden from the
          public). Switching login may reveal it.
        </p>
        <p>
          <Link href="/" className="text-institutional underline underline-offset-2">
            Home
          </Link>{" "}
          ·{" "}
          <Link href="/login" className="text-institutional underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
