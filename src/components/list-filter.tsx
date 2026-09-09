"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

/**
 * Live filter over already-visible rows. Matches text in `tbody tr` and `[data-filter-row]`.
 * Rows with `data-empty="true"` are left alone. No round-trip; header Search remains the FTS path.
 */
export function ListFilter({
  label,
  placeholder,
  children,
}: {
  label: string;
  placeholder: string;
  children: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const inputId = useId();

  useEffect(() => {
    const root = box.current;
    if (!root) return;
    const needle = q.trim().toLowerCase();
    const rows = root.querySelectorAll<HTMLElement>("tbody tr, [data-filter-row]");
    let visible = 0;
    rows.forEach((row) => {
      if (row.dataset.empty === "true") return;
      const show = !needle || (row.textContent ?? "").toLowerCase().includes(needle);
      row.toggleAttribute("hidden", !show);
      if (show) {
        row.style.removeProperty("display");
        visible += 1;
      } else {
        row.style.display = "none";
      }
    });
    const empty = root.querySelector<HTMLElement>("[data-filter-empty]");
    if (empty) empty.hidden = !needle || visible > 0;
  }, [q]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={inputId} className="text-sm text-muted-foreground">
          {label}
        </label>
        <Input
          id={inputId}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="max-w-sm"
        />
      </div>
      <div ref={box}>{children}</div>
    </div>
  );
}

export function FilterEmpty() {
  return (
    <p data-filter-empty hidden className="text-sm text-muted-foreground">
      No rows match this filter.
    </p>
  );
}
