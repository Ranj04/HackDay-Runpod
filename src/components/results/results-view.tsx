import type { ReactNode } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleAlert,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { AnalysisResult, CoachingResult } from "@/lib/contracts";
import { cn } from "@/lib/utils";

export interface ResultsViewProps {
  analysis: AnalysisResult;
  coaching: CoachingResult;
  echoOverlay?: ReactNode;
  saveAction?: ReactNode;
  metricLabels?: readonly [string, string];
  scoreBlurb?: string;
  scoreLabel?: string;
  retryHref?: string;
  retryLabel?: string;
  showSaveAction?: boolean;
}

const severityLabel = {
  low: "Small adjustment",
  med: "Focus area",
  high: "High impact",
} as const;

export function ResultsView({
  analysis,
  coaching,
  echoOverlay,
  saveAction,
  metricLabels = ["Your release", "Reference"],
  scoreBlurb = "Solid base. One clear focus.",
  scoreLabel = "Form score",
  retryHref = "/capture",
  retryLabel = "Try another shot",
  showSaveAction = true,
}: ResultsViewProps) {
  const { topFlaw } = analysis;

  return (
    <section aria-label={`${scoreLabel} analysis`} className="space-y-5">
      <div className="grid border-y border-border lg:grid-cols-[minmax(0,1.65fr)_minmax(19rem,0.72fr)]">
        <div className="min-w-0 py-4 sm:py-6 lg:pr-7">
          <div className="overflow-hidden rounded-lg border border-border bg-card p-2 sm:p-3">
            <div className="relative grid min-h-80 place-items-center overflow-hidden rounded-md bg-background [&>*]:!w-full [&>*]:!rounded-md">
              {echoOverlay ?? (
                <div className="relative grid min-h-[32rem] w-full place-items-center">
                  <div className="capture-grid absolute inset-0 opacity-25" />
                  <div className="relative flex items-center gap-5">
                    <div className="h-28 w-px rotate-12 bg-foreground/20 shadow-[14px_20px_0_color-mix(in_oklab,var(--foreground),transparent_80%),-10px_52px_0_color-mix(in_oklab,var(--foreground),transparent_80%)]" />
                    <div className="h-28 w-px -rotate-6 bg-primary shadow-[10px_18px_0_var(--primary),-8px_52px_0_var(--primary)]" />
                  </div>
                  <span className="absolute bottom-4 left-4 text-xs font-medium text-muted-foreground">
                    Motion comparison
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col border-t border-border py-6 lg:border-l lg:border-t-0 lg:py-6 lg:pl-7">
          <div>
            <div className="flex items-center justify-between gap-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-brand-strong">
                <CircleAlert className="size-4" />
                Priority fix
              </p>
              <span className="data text-xs text-muted-foreground">
                {severityLabel[topFlaw.severity]} ·{" "}
                {Math.round(Math.abs(topFlaw.reference - topFlaw.observed))}° off
              </span>
            </div>
            <h2 className="mt-3 text-3xl font-semibold uppercase leading-[0.98] tracking-[-0.035em] text-foreground sm:text-4xl">
              {topFlaw.label}
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {coaching.summary}
            </p>
          </div>

          <dl className="mt-6 border-y border-border">
            <div className="flex items-end justify-between gap-4 py-4">
              <div>
                <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {scoreLabel}
                </dt>
                <dd className="data mt-1 text-4xl font-semibold tracking-[-0.05em] text-foreground">
                  {analysis.score}
                  <span className="ml-1 text-base font-normal text-muted-foreground">
                    / 100
                  </span>
                </dd>
              </div>
              <p className="flex max-w-40 items-center justify-end gap-1.5 text-right text-xs leading-5 text-muted-foreground">
                <Sparkles className="size-3.5 shrink-0 text-link" />
                {scoreBlurb}
              </p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
              <Metric label={metricLabels[0]} value={`${topFlaw.observed}°`} />
              <Metric
                accent
                label={metricLabels[1]}
                value={`${topFlaw.reference}°`}
              />
            </div>
          </dl>

          <section className="mt-6">
            <p className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-accent-brand-strong">
              <RotateCcw className="size-3.5" />
              Corrective drill
            </p>
            <h3 className="mt-2 text-xl font-semibold uppercase leading-tight tracking-[-0.02em]">
              {coaching.drill.title}
            </h3>
            <ol className="mt-3 space-y-2 border-l border-border pl-4">
              {coaching.drill.steps.map((step, index) => (
                <li className="flex gap-2 text-xs leading-5 text-muted-foreground" key={step}>
                  <span className="data text-accent-brand-strong">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              className={cn(
                buttonVariants(),
                "h-11 w-full bg-accent-brand px-5 font-medium text-accent-brand-foreground hover:bg-accent-brand/90",
              )}
              href={retryHref}
            >
              <RotateCcw className="size-4" />
              {retryLabel}
            </Link>
            <a
              className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-link underline decoration-link/30 underline-offset-4 hover:decoration-link"
              href={coaching.drill.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              View source: {coaching.drill.sourceTitle}
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </aside>
      </div>

      {showSaveAction && (
        <div className="flex justify-end">
          {saveAction ?? (
            <Link
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-11 px-5 font-medium",
              )}
              href="/history"
            >
              <Check className="size-4" />
              Save &amp; view progress
              <ChevronRight className="size-4" />
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="py-4 first:pr-4 last:pl-4">
      <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "data mt-1 text-2xl font-semibold tracking-[-0.035em] text-foreground",
          accent && "text-link",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
