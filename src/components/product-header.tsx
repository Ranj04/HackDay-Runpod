"use client";

import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { parseSport, sportHref } from "@/lib/sports";
import { cn } from "@/lib/utils";

import { SportSwitcher } from "./sport-switcher";

export function ProductHeader({ authSlot }: { authSlot: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sport = parseSport(searchParams.get("sport") ?? undefined);
  const analyzeHref = sportHref("/capture", sport);
  const progressHref = sportHref("/history", sport);

  const navItems = [
    { href: analyzeHref, label: "Analyze", active: pathname === "/capture" || pathname === "/results" },
    { href: progressHref, label: "Progress", active: pathname === "/history" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex min-h-20 w-full max-w-[1536px] flex-wrap items-center gap-x-12 px-5 py-3 sm:px-8 lg:flex-nowrap">
        <Link
          aria-label="Echo home"
          className="shrink-0 font-heading text-[2rem] font-bold uppercase leading-none tracking-[-0.055em] text-foreground transition hover:text-primary"
          href={sportHref("/", sport)}
        >
          Echo
        </Link>

        <SportSwitcher
          className="order-3 mt-3 w-full sm:w-96 lg:order-none lg:mt-0"
          pathname={pathname}
          sport={sport}
        />

        <nav
          aria-label="Primary navigation"
          className="ml-auto hidden items-center gap-10 text-base md:flex"
        >
          {navItems.map((item) => (
            <Link
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "py-2 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                item.active && "text-foreground",
              )}
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
          {authSlot}
        </nav>

        <details className="group relative ml-auto md:hidden">
          <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-md border border-border text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <Menu aria-hidden="true" className="size-5" />
            <span className="sr-only">Open navigation</span>
          </summary>
          <nav
            aria-label="Mobile navigation"
            className="absolute right-0 top-13 min-w-48 rounded-md border border-border bg-card p-2 shadow-2xl shadow-black/40"
          >
            {navItems.map((item) => (
              <Link
                className={cn(
                  "block rounded-sm px-3 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                  item.active && "bg-muted text-foreground",
                )}
                href={item.href}
                key={item.label}
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-border p-2 [&_a]:w-full [&_a]:justify-center [&_button]:w-full [&_button]:justify-center">
              {authSlot}
            </div>
          </nav>
        </details>
      </div>
    </header>
  );
}
