import { CircleDashed, CircleDot } from "lucide-react";
import Link from "next/link";

import { SPORTS, sportHref, type SportId } from "@/lib/sports";
import { cn } from "@/lib/utils";

export function SportSwitcher({
  sport,
  pathname,
  className,
  compact = false,
}: {
  sport: SportId;
  pathname: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      aria-label="Choose a sport"
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-md border border-border bg-background",
        compact ? "h-10" : "h-12",
        className,
      )}
    >
      {(["basketball", "baseball"] as const).map((id, index) => {
        const selected = id === sport;
        const Icon = id === "basketball" ? CircleDot : CircleDashed;

        return (
          <Link
            aria-current={selected ? "page" : undefined}
            className={cn(
              "flex min-w-0 items-center justify-center gap-2 px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              index === 1 && "border-l border-border",
              selected
                ? "bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_var(--primary)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            href={sportHref(pathname, id)}
            key={id}
          >
            <Icon
              aria-hidden="true"
              className={cn("size-4 shrink-0", selected && "text-primary")}
            />
            <span className="truncate">{SPORTS[id].label}</span>
          </Link>
        );
      })}
    </div>
  );
}
