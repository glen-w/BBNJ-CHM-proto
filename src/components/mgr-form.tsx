import { Field, KeyFields, SubmitButton, selectClass } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FIELD_DEFS } from "@/lib/mgr-fields";
import type { StoredMgrBatch } from "@/lib/contracts/extensions";
import { saveMgrDraftAction, submitMgrAction } from "@/server/actions";

/** Form generated from FIELD_DEFS. Two buttons: save draft (no mint) · submit (mint on valid receipt). */
export function MgrForm({ batch, needsPartyCode, returnTo }: { batch?: StoredMgrBatch; needsPartyCode: boolean; returnTo: string }) {
  const values: Record<string, unknown> = batch
    ? { title: batch.title, locationHint: batch.locationHint ?? "", tkFpicFlag: batch.tkFpicFlag, confidentiality: batch.confidentiality, ...batch.details }
    : {};
  return (
    <form className="space-y-4">
      <KeyFields returnTo={returnTo} />
      {batch ? <input type="hidden" name="batchId" value={batch.id} /> : null}
      {needsPartyCode ? (
        <Field label="Party code (submitting on behalf)" hint="2–3 letters. Demo Party XSD." required>
          <Input name="partyCode" defaultValue={batch?.partyCode ?? "XSD"} maxLength={3} />
        </Field>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {FIELD_DEFS.map((f) => {
          const v = values[f.key];
          if (f.kind === "boolean") {
            return (
              <label key={f.key} className="flex items-start gap-2 rounded-lg border p-3 text-sm md:col-span-2">
                <input type="checkbox" name={f.key} defaultChecked={Boolean(v)} className="mt-0.5" />
                <span>
                  <span className="font-medium">{f.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {f.help} <span className="italic">({f.basis})</span>
                  </span>
                </span>
              </label>
            );
          }
          if (f.kind === "select") {
            return (
              <Field key={f.key} label={f.label} hint={f.help} basis={f.basis} required={f.required}>
                <select name={f.key} defaultValue={(v as string) ?? f.options![0]} className={selectClass}>
                  {f.options!.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>
            );
          }
          if (f.kind === "textarea") {
            return (
              <div key={f.key} className="md:col-span-2">
                <Field label={f.label} hint={f.help} basis={f.basis} required={f.required}>
                  <Textarea name={f.key} defaultValue={(v as string) ?? ""} rows={3} />
                </Field>
              </div>
            );
          }
          return (
            <Field key={f.key} label={f.label} hint={f.help} basis={f.basis} required={f.required}>
              <Input name={f.key} defaultValue={(v as string) ?? ""} />
            </Field>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <SubmitButton formAction={saveMgrDraftAction} variant="outline" title="Stores a draft on this batch. No receipt, no B-SBI.">
          Save draft
        </SubmitButton>
        <SubmitButton formAction={submitMgrAction} title="Valid receipt → receiptId + B-SBI (Art 12). Pack becomes pending; Secretariat publishes.">
          Submit pre-collection notification
        </SubmitButton>
        <span className="text-xs text-muted-foreground">Submitting a saved draft updates the same batch — one batch, one B-SBI.</span>
      </div>
    </form>
  );
}
