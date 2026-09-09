import { AboutPanel } from "@/components/about-panel";
import { AppShell } from "@/components/app-shell";
import { flashFrom } from "@/components/flash";
import { RelatedSystemsList, SecretariatNoticesList } from "@/components/related-systems";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function InstitutionalPage({ searchParams }: Props) {
  const flash = await flashFrom(searchParams);

  return (
    <AppShell title="Institutional" flash={flash}>
      <p className="max-w-3xl text-sm text-muted-foreground">
        Interim DOALOS surfaces for focal points, formal communications and reference portals. These are related systems — not data feeds into
        this desk.
      </p>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Secretariat notices</h2>
        <SecretariatNoticesList />
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Related systems</h2>
        <RelatedSystemsList />
      </section>

      <AboutPanel title="About institutional links">
        <p>
          Links here point to UN BBNJ Agreement interim pages, other MEA portals and reference material. Nothing on this page federates data into
          the Clearing-House Mechanism.
        </p>
        <p>
          Until the Cl-HM is fully operational, Parties may use the interim channels cited in each notice (for example{" "}
          <a href="mailto:doalos@un.org" className="underline underline-offset-2 hover:text-institutional">
            doalos@un.org
          </a>
          ).
        </p>
      </AboutPanel>
    </AppShell>
  );
}
