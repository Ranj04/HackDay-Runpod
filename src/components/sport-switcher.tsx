import { CircleDashed, CircleDot } from "lucide-react";
import Link from "next/link";

import {
  SPORTS,
  SPORT_IDS,
  sportHref,
  type SportId,
} from "@/lib/sports";
import { cn } from "@/lib/utils";

function FootballIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <ellipse
        cx="12"
        cy="12"
        rx="8.5"
        ry="5"
        stroke="currentColor"
        strokeWidth="1.8"
        transform="rotate(-32 12 12)"
      />
      <path d="m9.2 10.7 5.6 2.6M10.6 9.7l-1 2M12.5 10.6l-1 2M14.4 11.4l-1 2" stroke="currentColor" strokeLinecap="square" strokeWidth="1.4" />
    </svg>
  );
}

function switchHref(pathname: string, sport: SportId, query?: string) {
  const params = new URLSearchParams(query ?? "");
  const nextPath = params.get("next");

  // The auth screen carries its post-sign-in destination in `next`. When the
  // athlete changes sports there, update both the visible auth state and that
  // nested return URL so the choice survives authentication.
  if (
    pathname === "/auth" &&
    nextPath?.startsWith("/") &&
    !nextPath.startsWith("//")
  ) {
    const nextUrl = new URL(nextPath, "http://echo.local");
    params.set(
      "next",
      `${sportHref(nextUrl.pathname, sport, nextUrl.searchParams)}${nextUrl.hash}`,
    );
  }

  return sportHref(pathname, sport, params);
}

export function SportSwitcher({
  sport,
  pathname,
  className,
  compact = false,
  query,
}: {
  sport: SportId;
  pathname: string;
  className?: string;
  compact?: boolean;
  query?: string;
}) {
  return (
    <div
      aria-label="Choose a sport"
      role="group"
      className={cn(
        "grid grid-cols-3 overflow-hidden rounded-md border border-border bg-background",
        compact ? "h-10" : "h-12",
        className,
      )}
    >
      {SPORT_IDS.map((id, index) => {
        const selected = id === sport;
        const Icon = id === "basketball" ? CircleDot : CircleDashed;

        return (
          <Link
            aria-current={selected ? "page" : undefined}
            className={cn(
              "flex min-w-0 items-center justify-center gap-1.5 px-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-2 sm:px-4 sm:text-sm",
              index > 0 && "border-l border-border",
              selected
                ? "bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_var(--primary)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            href={switchHref(pathname, id, query)}
            key={id}
          >
            {id === "football" ? (
              <FootballIcon
                className={cn("size-4 shrink-0", selected && "text-primary")}
              />
            ) : (
              <Icon
                aria-hidden="true"
                className={cn("size-4 shrink-0", selected && "text-primary")}
              />
            )}
            <span className="truncate">{SPORTS[id].label}</span>
          </Link>
        );
      })}
    </div>
  );
}
