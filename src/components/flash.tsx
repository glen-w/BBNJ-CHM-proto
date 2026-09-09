import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type Flash = { notice?: string; error?: string };

export async function flashFrom(searchParams: Promise<Record<string, string | string[] | undefined>> | undefined): Promise<Flash> {
  const sp = (await searchParams) ?? {};
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  return { notice: pick("notice"), error: pick("error") };
}

export function FlashBanner({ flash }: { flash?: Flash }) {
  if (!flash?.notice && !flash?.error) return null;
  return (
    <div className="space-y-2">
      {flash.error ? (
        <Alert variant="destructive">
          <AlertTitle>Not accepted</AlertTitle>
          <AlertDescription>{flash.error}</AlertDescription>
        </Alert>
      ) : null}
      {flash.notice ? (
        <Alert>
          <AlertTitle>Done</AlertTitle>
          <AlertDescription>{flash.notice}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
