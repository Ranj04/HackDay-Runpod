import type { CSSProperties, ReactNode } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleAlert,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AnalysisResult, CoachingResult } from "@/lib/contracts";
import { cn } from "@/lib/utils";

export interface ResultsViewProps {
  analysis: AnalysisResult;
  coaching: CoachingResult;
  echoOverlay?: ReactNode;
  saveAction?: ReactNode;
}

const severityLabel = {
  low: "Small adjustment",
  med: "Focus area",
  high: "Priority fix",
} as const;

export function ResultsView({
  analysis,
  coaching,
  echoOverlay,
  saveAction,
}: ResultsViewProps) {
  const { topFlaw } = analysis;

  return (
    <div className="space-y-6">
      <section className="grid items-start gap-6 lg:grid-cols-[0.72fr_1.28fr]">
        <Card className="border-0 bg-card text-card-foreground ring-foreground/10">
          <CardHeader>
            <CardDescription className="text-muted-foreground">
              Form score
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-7">
            <div
              className="score-ring grid size-48 place-items-center rounded-full"
              style={
                {
                  "--score": `${analysis.score * 3.6}deg`,
                } as CSSProperties
              }
            >
              <div className="grid size-39 place-items-center rounded-full bg-card text-center">
                <div>
                  <strong className="block text-6xl font-semibold tracking-[-0.06em]">
                    {analysis.score}
                  </strong>
                  <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    out of 100
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm text-link">
              <Sparkles className="size-4" />
              Solid base. One clear focus.
            </div>
            <div className="mt-7 grid w-full grid-cols-2 gap-3">
              <Metric label="Your release" value={`${topFlaw.observed}°`} />
              <Metric label="Reference" value={`${topFlaw.reference}°`} accent />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 ring-white/10">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <Badge
                variant="secondary"
                className="border border-accent-brand/30 bg-accent-brand/15 text-accent-brand-strong"
              >
                <CircleAlert className="size-3" />
                {severityLabel[topFlaw.severity]}
              </Badge>
              <span className="text-xs tabular-nums text-muted-foreground">
                {Math.round(Math.abs(topFlaw.reference - topFlaw.observed))}°
                from reference
              </span>
            </div>
            <CardTitle className="mt-5 text-3xl font-semibold tracking-[-0.04em]">
              {topFlaw.label}
            </CardTitle>
            <CardDescription className="max-w-xl text-base leading-7">
              {coaching.summary}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2 overflow-hidden rounded-2xl border bg-muted">
              {echoOverlay ?? (
                <div className="relative grid min-h-52 place-items-center">
                  <div className="capture-grid absolute inset-0 opacity-25" />
                  <div className="relative flex items-center gap-5">
                    <div className="h-28 w-px rotate-12 bg-foreground/20 shadow-[14px_20px_0_color-mix(in_oklab,var(--foreground),transparent_80%),-10px_52px_0_color-mix(in_oklab,var(--foreground),transparent_80%)]" />
                    <div className="h-28 w-px -rotate-6 bg-[var(--blue)] shadow-[10px_18px_0_var(--blue),-8px_52px_0_var(--blue)]" />
                  </div>
                  <span className="absolute bottom-4 left-4 text-xs font-medium text-muted-foreground">
                    Echo overlay slot
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-0 ring-white/10">
        <CardHeader>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <RotateCcw className="size-4 text-primary" />
            Corrective drill
          </div>
          <CardTitle className="mt-2 text-2xl font-semibold">
            {coaching.drill.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 lg:grid-cols-3">
            {coaching.drill.steps.map((step, index) => (
              <li
                className="flex gap-3 rounded-xl bg-muted p-4 text-sm leading-6"
                key={step}
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs text-secondary-foreground">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <a
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
            href={coaching.drill.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Source: {coaching.drill.sourceTitle}
            <ArrowUpRight className="size-4" />
          </a>
        </CardContent>
      </Card>

      <div className="flex flex-col justify-between gap-3 sm:flex-row">
        <Link
          className={cn(buttonVariants({ variant: "outline" }), "h-11 px-5")}
          href="/capture"
        >
          Try another shot
        </Link>
        {saveAction ?? (
          <Link
            className={cn(buttonVariants(), "h-11 px-5 font-medium")}
            href="/history"
          >
            <Check className="size-4" />
            Save &amp; view progress
            <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
    </div>
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
    <div className="rounded-xl border bg-muted p-4">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <strong
        className={cn(
          "mt-1 block text-2xl font-semibold tabular-nums",
          accent && "text-primary",
        )}
      >
        {value}
      </strong>
    </div>
  );
}
