import { JourneyPlaceholder } from "@/components/journey-placeholder";

export default function EiaPage() {
  return (
    <JourneyPlaceholder
      title="Environmental impact assessment (EIA)"
      summary="Pack status on events; activity currentStage with optional latestPackStatus. Public and STB see published packs only — including published draft_eia while the activity remains open."
      nextSteps={[
        "Activity detail with coexisting pack chips (screening, draft_eia, etc.)",
        "STB review queue for published draft_eia packs",
        "Subscription preferences by abnjBox and domain",
        "Published screening with screeningOutcome (eia_required | no_eia)",
      ]}
    />
  );
}
