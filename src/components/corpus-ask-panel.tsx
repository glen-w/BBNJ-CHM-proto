"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Scope = "all" | "treaty" | "literature";

type Citation = { title: string; href?: string };

type AskResponse = {
  answer: string;
  mode: "paperful" | "local";
  citations: Citation[];
};

export function CorpusAskPanel({ className }: { className?: string }) {
  const [question, setQuestion] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResponse | null>(null);

  async function onAsk() {
    const q = question.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/assist/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, scope }),
      });
      const body = (await res.json()) as AskResponse & { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Ask failed.");
        return;
      }
      setResult(body);
    } catch {
      setError("Could not reach the assist service.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <details className={cn("rounded-lg border p-4", className)}>
      <summary className="cursor-pointer text-sm font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        Ask the corpus
      </summary>
      <div className="mt-3">
        <p className="text-xs text-muted-foreground">
          Assist over Agreement excerpts and the published literature slice. Answers cite sources; they are not filings or official text.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {(
            [
              ["all", "Agreement + literature"],
              ["treaty", "Agreement only"],
              ["literature", "Literature only"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setScope(id)}
              className={cn(
                "rounded border px-2 py-1",
                scope === id ? "border-institutional bg-institutional/10 font-medium" : "border-line text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Textarea
          className="mt-3 min-h-[4.5rem] text-sm"
          placeholder="e.g. When does screening apply outside a regional fisheries measure?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" disabled={loading || !question.trim()} onClick={() => void onAsk()}>
            {loading ? "Asking…" : "Ask"}
          </Button>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Local assist</span>
        </div>
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        {result ? (
          <div className="mt-3 space-y-2 rounded-md border border-dashed bg-muted/20 p-3 text-sm">
            <p className="whitespace-pre-wrap">{result.answer}</p>
            {result.citations.length > 0 ? (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {result.citations.map((c, i) => (
                  <li key={`${c.title}-${i}`}>
                    {c.href ? (
                      <a href={c.href} rel="noopener noreferrer" target="_blank" className="underline underline-offset-2 hover:text-institutional">
                        {c.title}
                      </a>
                    ) : (
                      c.title
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {result.mode === "paperful" ? "Via Paperful" : "Local keyword assist"}
            </p>
          </div>
        ) : null}
      </div>
    </details>
  );
}
