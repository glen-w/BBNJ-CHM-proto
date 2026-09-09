import { Children, cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

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

type FieldControlProps = {
  id?: string;
  required?: boolean;
  "aria-required"?: boolean | "true" | "false";
  "aria-invalid"?: boolean | "true" | "false";
  "aria-describedby"?: string;
};

/**
 * Label + optional hint/basis/error wired for assistive tech.
 * Clones a single control child to set id, required, aria-*.
 */
export function Field({
  label,
  hint,
  basis,
  children,
  required,
  error,
}: {
  label: string;
  hint?: string;
  basis?: string;
  children: ReactNode;
  required?: boolean;
  error?: string;
}) {
  const uid = useId();
  const controlId = `${uid}-control`;
  const hintId = `${uid}-hint`;
  const errorId = `${uid}-error`;
  const hasHint = Boolean(hint || basis);
  const describedBy = [hasHint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  const child = Children.only(children);
  const control = isValidElement(child)
    ? cloneElement(child as ReactElement<FieldControlProps>, {
        id: (child.props as FieldControlProps).id ?? controlId,
        required: required || (child.props as FieldControlProps).required,
        "aria-required": required || undefined,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })
    : children;

  const forId = isValidElement(control) ? ((control.props as FieldControlProps).id ?? controlId) : controlId;

  return (
    <label className="block space-y-1" htmlFor={forId}>
      <span className="text-sm font-medium">
        {label}
        {required ? (
          <span className="text-destructive">
            {" "}
            *<span className="sr-only"> (required)</span>
          </span>
        ) : null}
      </span>
      {control}
      {hasHint ? (
        <span id={hintId} className="block text-xs text-muted-foreground">
          {hint}
          {basis ? <span className="ml-1 italic">({basis})</span> : null}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="block text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export const selectClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
