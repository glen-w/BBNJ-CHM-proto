"use client";

import { useId, useRef } from "react";

import type { Domain } from "@/lib/contracts/events";
import { citesForPacks, type TreatyCite } from "@/lib/treatyCites";
import { cn } from "@/lib/utils";

/**
 * Quiet “Agreement basis” / § control — side panel lists only relevant article(s)
 * for the packs on this detail page.
 */
export function TreatyCiteDrawer({
  domain,
  stages,
  className,
}: {
  domain: Domain;
  stages: string[];
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const cites: TreatyCite[] = citesForPacks(domain, stages);

  function open() {
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <div className={cn("inline-flex", className)}>
      <button
        type="button"
        onClick={open}
        className="inline-flex items-center gap-1 rounded-md border border-line bg-card px-2 py-1 text-xs text-muted-foreground hover:border-institutional/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        title="Agreement basis — articles for packs on this record"
      >
        <span aria-hidden="true">§</span>
        <span>Agreement basis</span>
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="fixed inset-y-0 right-0 m-0 ml-auto h-full max-h-none w-full max-w-sm border-l border-line bg-card p-0 text-foreground shadow-lg open:flex open:flex-col backdrop:bg-ink/20"
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        onCancel={close}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 id={titleId} className="text-sm font-medium">
            Agreement basis
          </h2>
          <button
            type="button"
            onClick={close}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {cites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No article mapping for the packs on this record.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {cites.map((c) => (
                <li key={`${c.article}-${c.label}`} className="border-b border-line/70 pb-2 last:border-0">
                  <div className="font-medium text-institutional">{c.article}</div>
                  <div className="text-muted-foreground">{c.label}</div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 text-xs text-muted-foreground">
            Short labels only — open the official BBNJ text via the language control in the header. UI strings stay English.
          </p>
        </div>
      </dialog>
    </div>
  );
}
