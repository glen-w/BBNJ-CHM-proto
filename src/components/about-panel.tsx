import { cn } from "@/lib/utils";

/** Essays and technical evidence one level down — native details, closed by default. */
export function AboutPanel({
  title,
  children,
  id,
  className,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <details id={id} className={cn("rounded-lg border bg-card px-4 py-2 text-sm", className)}>
      <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        {title}
      </summary>
      <div className="mt-3 space-y-3 pb-2 leading-relaxed text-muted-foreground">{children}</div>
    </details>
  );
}
