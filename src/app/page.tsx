import {
  ArrowRight,
  ScanLine,
  ShieldCheck,
  Upload,
  Video,
} from "lucide-react";
import Link from "next/link";

import { BaseballShowcase, HeroShowcase } from "@/components/overlay";
import { buttonVariants } from "@/components/ui/button";
import { parseSport, SPORTS, sportHref } from "@/lib/sports";
import { cn } from "@/lib/utils";

function uploadHref(sport: "basketball" | "baseball") {
  return sport === "baseball"
    ? "/capture?sport=baseball&mode=upload"
    : "/capture?mode=upload";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string | string[] }>;
}) {
  const sport = parseSport((await searchParams).sport);
  const copy = SPORTS[sport];
  const flashConfigured = Boolean(process.env.RUNPOD_API_KEY);

  return (
    <main className="flex-1 overflow-hidden">
      <div className="mx-auto w-full max-w-[1536px] px-5 pb-20 pt-10 sm:px-8 sm:pt-12 lg:pt-10">
        <section aria-labelledby="home-title">
          <div className="grid gap-7 pb-9 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)] lg:items-end lg:gap-16">
            <div>
              <p className="eyebrow mb-4">
                {copy.label} / {copy.movement} analysis
              </p>
              <h1
                className="max-w-4xl text-[clamp(3.75rem,8vw,6rem)] font-semibold leading-[0.86] tracking-[-0.065em] text-foreground"
                id="home-title"
              >
                One video. One fix.
              </h1>
            </div>
            <p className="max-w-xl border-l border-border pl-6 text-lg leading-8 text-muted-foreground sm:text-xl lg:mb-2">
              Record or upload a {copy.movement}. Echo compares your motion with
              a reference and gives you the one correction to train next.
            </p>
          </div>

          {sport === "baseball" ? <BaseballShowcase compact /> : <HeroShowcase />}

          <div className="grid gap-5 border-b border-border py-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                className={cn(
                  buttonVariants(),
                  "h-16 justify-start rounded-md bg-accent-brand px-7 text-base font-semibold text-accent-brand-foreground hover:bg-accent-brand/90 sm:min-w-72",
                )}
                href={sportHref("/capture", sport)}
              >
                <Video aria-hidden="true" className="size-5" />
                Record a {copy.movement}
                <ArrowRight aria-hidden="true" className="ml-auto size-4" />
              </Link>
              <Link
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-16 justify-start rounded-md bg-transparent px-7 text-base font-medium hover:border-primary hover:bg-primary/5 sm:min-w-72",
                )}
                href={uploadHref(sport)}
              >
                <Upload aria-hidden="true" className="size-5" />
                Upload video
              </Link>
            </div>

            <div className="flex flex-wrap gap-x-7 gap-y-3 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground lg:justify-center">
              <span className="flex items-center gap-2">
                <span className="size-1.5 bg-primary" />
                {copy.trackedLabel}
              </span>
              <span className="flex items-center gap-2">
                <span className="size-1.5 bg-primary" />
                {copy.alignedLabel}
              </span>
              <span className="flex items-center gap-2">
                <span className="size-1.5 bg-primary" />
                RunPod Flash {flashConfigured ? "connected" : "ready"}
              </span>
            </div>

            <Link
              className="group inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
              href={sportHref("/results", sport)}
            >
              View sample analysis
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        </section>

        <section
          aria-labelledby="workflow-title"
          className="grid border-b border-border py-14 lg:grid-cols-[0.8fr_2.2fr] lg:gap-16"
        >
          <div>
            <p className="eyebrow">The training loop</p>
            <h2
              className="mt-4 text-4xl font-semibold leading-none tracking-[-0.045em] sm:text-5xl"
              id="workflow-title"
            >
              Film. Compare. Correct.
            </h2>
          </div>
          <ol className="mt-10 grid border-t border-border lg:mt-0 lg:grid-cols-3">
            {[
              {
                icon: Video,
                number: "01",
                title: `Capture one ${copy.movement}`,
                body: "A side view is enough. Record live or upload an existing clip.",
              },
              {
                icon: ScanLine,
                number: "02",
                title: "Read the difference",
                body: "Echo aligns your mechanics to a reference at the moments that matter.",
              },
              {
                icon: ShieldCheck,
                number: "03",
                title: "Train one correction",
                body: "Leave with a focused cue and drill—not a wall of disconnected metrics.",
              },
            ].map((step) => (
              <li
                className="border-b border-border py-6 lg:border-b-0 lg:border-l lg:px-7 lg:py-0 first:lg:border-l-0"
                key={step.number}
              >
                <div className="flex items-center justify-between">
                  <step.icon aria-hidden="true" className="size-5 text-primary" />
                  <span className="font-mono text-xs text-muted-foreground">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-8 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 max-w-sm leading-7 text-muted-foreground">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
