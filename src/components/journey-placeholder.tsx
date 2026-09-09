import { AppShell } from "@/components/app-shell";

export function JourneyPlaceholder({
  title,
  summary,
  nextSteps,
}: {
  title: string;
  summary: string;
  nextSteps: string[];
}) {
  return (
    <AppShell title={title}>
      <div className="space-y-6">
        <p className="max-w-3xl text-muted-foreground">{summary}</p>
        <section className="rounded-lg border bg-card p-6">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Build next
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            {nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
