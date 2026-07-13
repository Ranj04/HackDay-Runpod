"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { parseSport, sportHref } from "@/lib/sports";

export function SignInLink() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sport = parseSport(searchParams.get("sport") ?? undefined);
  const currentQuery = searchParams.toString();
  const nextPath =
    pathname === "/auth"
      ? sportHref("/capture", sport)
      : `${pathname}${currentQuery ? `?${currentQuery}` : ""}`;
  const authParams = new URLSearchParams({ next: nextPath });

  if (sport !== "basketball") {
    authParams.set("sport", sport);
  }

  return (
    <Link
      className="inline-flex h-11 items-center rounded-md border border-border px-5 font-medium text-foreground transition hover:border-primary hover:bg-primary/10"
      href={`/auth?${authParams.toString()}`}
    >
      Sign in
    </Link>
  );
}
