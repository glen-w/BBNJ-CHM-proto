import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl space-y-3 px-6 py-16 text-sm">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="text-muted-foreground">
        Either this record does not exist or it is not visible to your current role (drafts, pending packs and restricted tiers are hidden from the
        public). Switching login may reveal it.
      </p>
      <p>
        <Link href="/" className="underline">
          Home
        </Link>{" "}
        ·{" "}
        <Link href="/login" className="underline">
          Sandbox logins
        </Link>
      </p>
    </div>
  );
}
