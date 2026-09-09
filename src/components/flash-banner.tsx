"use client";

import { useEffect, useRef } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Flash } from "@/components/flash";

/** Focuses the alert region after a redirect so keyboard / SR users notice the flash. */
export function FlashBanner({ flash }: { flash?: Flash }) {
  const ref = useRef<HTMLDivElement>(null);
  const hasFlash = Boolean(flash?.notice || flash?.error);

  useEffect(() => {
    if (hasFlash) ref.current?.focus();
  }, [hasFlash, flash?.notice, flash?.error]);

  if (!hasFlash) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="space-y-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {flash?.error ? (
        <Alert variant="destructive">
          <AlertTitle>Not accepted</AlertTitle>
          <AlertDescription>{flash.error}</AlertDescription>
        </Alert>
      ) : null}
      {flash?.notice ? (
        <Alert>
          <AlertTitle>Done</AlertTitle>
          <AlertDescription>{flash.notice}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
