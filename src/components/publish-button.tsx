import { KeyFields, SubmitButton } from "@/components/forms";
import { publishAction } from "@/server/actions";

export function PublishButton({
  domain,
  recordId,
  stage,
  version,
  returnTo,
  label,
}: {
  domain: "mgr" | "eia" | "cbtmt";
  recordId: string;
  stage: string;
  version: number;
  returnTo: string;
  label?: string;
}) {
  return (
    <form action={publishAction} className="inline">
      <KeyFields returnTo={returnTo} />
      <input type="hidden" name="domain" value={domain} />
      <input type="hidden" name="recordId" value={recordId} />
      <input type="hidden" name="stage" value={stage} />
      <input type="hidden" name="expectedVersion" value={version} />
      <SubmitButton size="sm" title="Secretariat / authorised publishing role. Publishing mints the publicRecordId on the record's first publish and fans out notifications.">
        {label ?? `Publish ${stage.replace(/_/g, " ")} v${version}`}
      </SubmitButton>
    </form>
  );
}
