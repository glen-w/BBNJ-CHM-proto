import { MINT_KINDS, MINT_LABELS, type MintKind } from "@/lib/mint";
import { cn } from "@/lib/utils";

export function MintStepper({
  domain,
  highlight,
  values,
}: {
  domain: "mgr" | "eia" | "cbtmt" | "abmt";
  highlight?: MintKind;
  values: Partial<Record<MintKind, string | undefined>>;
}) {
  const steps = domain === "mgr" ? MINT_KINDS.mgr : MINT_KINDS.default;

  return (
    <section
      className="rounded-lg border bg-card p-4"
      aria-label="Identifier sequence"
      aria-live={highlight ? "polite" : undefined}
    >
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Identifiers, in order</h2>
      <ol className="flex flex-wrap items-center gap-1 text-xs">
        {steps.map((step, i) => {
          const issued = Boolean(values[step]);
          const active = highlight === step;
          return (
            <li key={step} className="flex items-center gap-1">
              <span
                className={cn(
                  "rounded-md border px-2 py-1 transition-colors motion-reduce:transition-none",
                  active && "border-institutional bg-institutional/15 font-semibold text-institutional ring-2 ring-institutional/30",
                  !active && issued && "border-institutional/40 bg-institutional/5 font-medium text-institutional",
                  !active && !issued && "text-muted-foreground",
                )}
                title={issued ? values[step] : "Not yet issued"}
              >
                {MINT_LABELS[step]}
                {active ? <span className="ms-1 font-normal normal-case">(just minted)</span> : null}
              </span>
              {i < steps.length - 1 ? <span className="text-muted-foreground" aria-hidden="true">→</span> : null}
            </li>
          );
        })}
      </ol>
      {highlight ? (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-mono text-foreground">{values[highlight] ?? "—"}</span> — identifiers never change across versions.
        </p>
      ) : null}
    </section>
  );
}
