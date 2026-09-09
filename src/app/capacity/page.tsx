import { JourneyPlaceholder } from "@/components/journey-placeholder";

export default function CapacityPage() {
  return (
    <JourneyPlaceholder
      title="Capacity-building and transfer of marine technology (CBTMT)"
      summary="Needs and offers board with rule-based match rows (needId, offerId, rule, at) and outbox match_suggested events — UX inspired by CTCN, not forked."
      nextSteps={[
        "Need and offer intake forms",
        "cbtmt_matches table insert on rule hit",
        "Match chip on need/offer detail views",
        "match_suggested notification kind in bell drawer",
      ]}
    />
  );
}
