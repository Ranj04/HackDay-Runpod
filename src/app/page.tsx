import { ArrowRight, Crosshair, ScanLine } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { BaseballShowcase, HeroShowcase } from "@/components/overlay";
import { parseSport, SPORTS } from "@/lib/sports";
import { cn } from "@/lib/utils";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string | string[] }>;
}) {
  const sport = parseSport((await searchParams).sport);
  const copy = SPORTS[sport];

  return (
    <main className="relative isolate flex flex-1 overflow-hidden">
      <div className="hero-glow absolute inset-0 -z-10" />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <section>
          <div className="mb-6 flex w-fit rounded-full border border-border bg-muted p-1" aria-label="Choose a sport">
            {(["basketball", "baseball"] as const).map((id) => (
              <Link
                aria-current={sport === id ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  sport === id
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                href={id === "basketball" ? "/" : "/?sport=baseball"}
                key={id}
              >
                {SPORTS[id].label}
              </Link>
            ))}
          </div>
          <Badge
            variant="outline"
            className="h-7 border-border bg-muted px-3 backdrop-blur"
          >
            {copy.discipline}
          </Badge>
          <h1 className="mt-7 max-w-3xl text-6xl font-semibold leading-[0.95] tracking-[-0.065em] sm:text-7xl">
            {copy.headline}
            <br />
            <span className="text-primary">{copy.accentHeadline}</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
            {copy.description}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              className={cn(
                buttonVariants(),
                "h-12 rounded-full bg-accent-brand px-6 font-medium text-accent-brand-foreground hover:bg-accent-brand/90",
              )}
              href={copy.primaryHref}
            >
              {copy.primaryLabel}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-12 rounded-full bg-muted px-6",
              )}
              href={copy.sampleHref}
            >
              {copy.secondaryLabel}
            </Link>
          </div>
          <div className="mt-11 flex flex-wrap gap-x-7 gap-y-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <span className="flex items-center gap-2">
              <ScanLine className="size-4 text-primary" />
              {copy.trackedLabel}
            </span>
            <span className="flex items-center gap-2">
              <Crosshair className="size-4 text-primary" />
              {copy.alignedLabel}
            </span>
          </div>
        </section>

        {sport === "baseball" ? <BaseballShowcase compact /> : <HeroShowcase />}
      </div>
    </main>
  );
}
