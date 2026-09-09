/** Calm, always-visible caveat on ABMT pages: the journey is a stub and prejudges nothing (Art 51.3(a)(ii)). */
export function WithoutPrejudiceBanner() {
  return (
    <div className="rounded-lg border border-dashed border-domain-abmt-line bg-domain-abmt/60 px-4 py-3 text-sm leading-relaxed text-domain-abmt-foreground">
      <strong>Without prejudice to COP1.</strong> This journey demonstrates only that an ABMT proposal can be received, held pending and published on the shared
      receipt → publish record. It implies nothing about the future ABMT process, its content requirements or the bodies involved (Arts 17–26 remain
      for the COP to operationalise).
    </div>
  );
}
