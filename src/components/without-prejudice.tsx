/** Calm, always-visible caveat on ABMT pages: the journey is a stub and prejudges nothing (Art 51.3(a)(ii)). */
export function WithoutPrejudiceBanner() {
  return (
    <div className="rounded-lg border border-dashed border-domain-abmt-line bg-domain-abmt/60 px-4 py-3 text-sm leading-relaxed text-domain-abmt-foreground">
      <strong>Without prejudice to COP1.</strong> A thin stub on the shared receipt → publish rails; it implies nothing about the future ABMT process.
    </div>
  );
}
