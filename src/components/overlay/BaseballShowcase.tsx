"use client";

import { Activity } from "lucide-react";

function PitcherFigure({ reference = false }: { reference?: boolean }) {
  const color = reference ? "var(--blue)" : "var(--bone)";

  return (
    <svg
      aria-hidden="true"
      className={reference ? "h-full opacity-65" : "h-full opacity-95"}
      viewBox="0 0 190 260"
    >
      <g fill="none" stroke={color} strokeLinecap="square" strokeWidth="6">
        <circle cx="94" cy="28" r="17" strokeWidth="5" />
        <path d="M91 48 82 112 119 143" />
        <path d="M85 65 45 88 20 68" />
        <path d="M87 68 130 53 160 73" />
        <path d="M82 111 51 156 22 224" />
        <path d="M83 111 116 151 162 207" />
      </g>
      {!reference && (
        <>
          <circle cx="165" cy="73" r="8" fill="var(--orange)" />
          <circle
            cx="51"
            cy="156"
            fill="none"
            r="23"
            stroke="var(--orange)"
            strokeDasharray="7 6"
            strokeWidth="3"
          />
        </>
      )}
    </svg>
  );
}

export function BaseballShowcase({
  score = 68,
  observed = 28,
  reference = 42,
}: {
  compact?: boolean;
  score?: number;
  observed?: number;
  reference?: number;
}) {
  return (
    <section
      aria-label="Baseball delivery comparison"
      className="overflow-hidden rounded-md border border-border bg-[var(--ink)]"
    >
      <div className="relative min-h-[24rem] overflow-hidden sm:min-h-[31rem]">
        <div className="capture-grid absolute inset-0 opacity-25" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4 sm:p-6">
          <div className="border-l-2 border-accent-brand pl-3 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-foreground">
            <span className="block text-muted-foreground">Bullpen 01</span>
            Side view
          </div>
          <div className="grid gap-2 bg-black/30 px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.12em] sm:px-4">
            <span className="flex items-center gap-3 text-foreground">
              <span className="h-px w-8 bg-foreground" /> You
            </span>
            <span className="flex items-center gap-3 text-primary">
              <span className="h-px w-8 bg-primary" /> Reference
            </span>
          </div>
        </div>

        <div className="absolute inset-x-4 bottom-16 top-16 grid grid-cols-2 items-end gap-3 sm:inset-x-[18%] sm:bottom-12 sm:top-20 sm:gap-16">
          <div className="flex h-full min-w-0 flex-col items-center border-r border-border/70 pr-3 sm:pr-10">
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.15em] text-muted-foreground">
              Observed / {observed}°
            </span>
            <div className="mt-4 min-h-0 flex-1">
              <PitcherFigure />
            </div>
          </div>
          <div className="flex h-full min-w-0 flex-col items-center pl-3 sm:pl-10">
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.15em] text-primary">
              Reference / {reference}°
            </span>
            <div className="mt-4 min-h-0 flex-1">
              <PitcherFigure reference />
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 flex items-center gap-3 border border-accent-brand bg-background/90 px-3 py-2 sm:bottom-6 sm:left-6">
          <Activity aria-hidden="true" className="size-4 text-accent-brand" />
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-foreground">
            Landing leg late
          </span>
        </div>
        <span className="absolute bottom-5 right-4 font-mono text-xs text-muted-foreground sm:bottom-7 sm:right-6">
          Form {score}/100
        </span>
      </div>

      <div className="border-t border-border bg-background px-5 py-4 sm:px-7">
        <div className="relative h-12">
          <div className="absolute inset-x-0 top-2 h-px bg-muted-foreground/70" />
          <div className="absolute left-0 top-2 h-0.5 w-[62%] bg-accent-brand" />
          <span className="absolute left-[62%] top-2 size-3 -translate-x-1/2 -translate-y-1/2 bg-accent-brand" />
          <div className="absolute inset-x-0 top-5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground sm:text-[0.65rem]">
            <span className="absolute left-0">Load</span>
            <span className="absolute left-[62%] -translate-x-1/2 text-foreground">
              Foot strike
            </span>
            <span className="absolute right-0">Release</span>
          </div>
        </div>
      </div>
    </section>
  );
}
