/** Always-visible ABMT caveat: the journey prejudges nothing (Art 51.3(a)(ii)). */
export function WithoutPrejudiceBanner() {
  return (
    <div className="rounded-lg border border-dashed border-domain-abmt-line bg-domain-abmt/60 px-4 py-3 text-sm leading-relaxed text-domain-abmt-foreground">
      <strong>Without prejudice to COP1.</strong> Proposals follow the Clearing House receipt and publication path, and do not prejudge how area-based management tools will be decided.
    </div>
  );
}
