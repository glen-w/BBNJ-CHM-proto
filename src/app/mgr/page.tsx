import { JourneyPlaceholder } from "@/components/journey-placeholder";

export default function MgrPage() {
  return (
    <JourneyPlaceholder
      title="Marine genetic resources (MGR)"
      summary="Party submit → valid pre-collection receipt mints bSbi → pending pack → Secretariat publish → publicRecordId → bell + audit outbox. Optional offline Excel template and Secretariat import stub."
      nextSteps={[
        "Pre-collection intake form with sourceChannel (form | excel | assisted)",
        "Receipt validation and B-SBI mint on valid pre-collection receipt",
        "Secretariat publish gate and public record id on first published pack",
        "Notification bell fed by append-only outbox events",
      ]}
    />
  );
}
