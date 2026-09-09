import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Hidden idempotency key + return path — every mutating form carries these. */
export function KeyFields({ returnTo }: { returnTo?: string }) {
  return (
    <>
      <input type="hidden" name="_key" value={crypto.randomUUID()} />
      {returnTo ? <input type="hidden" name="_return" value={returnTo} /> : null}
    </>
  );
}

export function SubmitButton({
  children,
  variant = "default",
  size = "default",
  className,
  formAction,
  title,
}: {
  children: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "sm" | "xs" | "lg";
  className?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  title?: string;
}) {
  return (
    <button type="submit" formAction={formAction} title={title} className={cn(buttonVariants({ variant, size }), className)}>
      {children}
    </button>
  );
}

export function Field({ label, hint, basis, children, required }: { label: string; hint?: string; basis?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
      {hint || basis ? (
        <span className="block text-xs text-muted-foreground">
          {hint}
          {basis ? <span className="ml-1 italic">({basis})</span> : null}
        </span>
      ) : null}
    </label>
  );
}

export const selectClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
