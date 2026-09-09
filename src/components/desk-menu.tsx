import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Native disclosure menu — no extra chrome, works without client JS. */
export function DeskMenu({
  label,
  align = "right",
  children,
}: {
  label: string;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <details className="relative">
      <summary
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer list-none [&::-webkit-details-marker]:hidden")}
      >
        {label}
        <span aria-hidden="true" className="text-muted-foreground">
          ▾
        </span>
      </summary>
      <div
        className={cn(
          "absolute z-20 mt-1 min-w-52 rounded-md border bg-popover py-1 text-sm shadow-sm",
          align === "right" ? "right-0" : "left-0",
        )}
      >
        {children}
      </div>
    </details>
  );
}

export function DeskMenuItem({
  href,
  children,
  title,
}: {
  href: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <a
      href={href}
      title={title}
      className="block px-3 py-1.5 text-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
    </a>
  );
}
