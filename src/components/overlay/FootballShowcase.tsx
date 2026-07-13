"use client";

import { Activity } from "lucide-react";

function QuarterbackFigure({ reference = false }: { reference?: boolean }) {
  const color = reference ? "var(--blue)" : "var(--bone)";
  const torso = reference
    ? "M76 68 126 61 98 139 76 136"
    : "M74 65 128 72 101 139 78 134";
  const throwingArm = reference
    ? "M126 61 162 64 198 54"
    : "M128 72 164 82 201 63";
  const guideArm = reference
    ? "M76 68 51 91 72 106"
    : "M74 65 46 88 69 109";
  const leadLeg = reference
    ? "M98 139 146 177 155 250"
    : "M101 139 151 180 161 250";
  const trailLeg = reference
    ? "M78 136 58 188 27 236"
    : "M78 134 61 191 24 239";

  return (
    <svg
      aria-hidden="true"
      className={
        reference
          ? "h-full w-full max-w-[15rem] opacity-65"
          : "h-full w-full max-w-[15rem] opacity-95"
      }
      preserveAspectRatio="xMidYMax meet"
      viewBox="0 0 220 280"
    >
      <g
        fill="none"
        stroke={color}
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="6"
      >
        <circle cx="103" cy="29" r="17" strokeWidth="5" />
        <path d="M116 23 130 28 130 38 119 39" strokeWidth="4" />
        <path d="M101 47 98 60" strokeWidth="5" />
        <path d={torso} />
        <path d={throwingArm} />
        <path d={guideArm} />
        <path d={leadLeg} />
        <path d={trailLeg} />
        <path d="M147 250 177 250" strokeWidth="5" />
        <path d="M25 239 8 249" strokeWidth="5" />
      </g>

      {!reference ? (
        <>
          <g transform="translate(204 60) rotate(-13)">
            <path
              d="M-15 0C-10-10 10-10 15 0 10 10-10 10-15 0Z"
              fill="var(--orange)"
            />
            <path
              d="M-5-3 5 3M-2-5 8 1M-8-1 2 5"
              fill="none"
              stroke="var(--ink)"
              strokeLinecap="square"
              strokeWidth="1.8"
            />
          </g>
          <circle
            cx="128"
            cy="72"
            fill="none"
            r="23"
            stroke="var(--orange)"
            strokeDasharray="7 6"
            strokeWidth="3"
          />
          <path
            d="M110 58A25 25 0 0 1 151 72"
            fill="none"
            stroke="var(--orange)"
            strokeLinecap="square"
            strokeWidth="3"
          />
        </>
      ) : null}
    </svg>
  );
}

export function FootballShowcase({
  compact = false,
  score = 70,
  observed = 18,
  reference = 32,
}: {
  compact?: boolean;
  score?: number;
  observed?: number;
  reference?: number;
}) {
  const sequenceCue =
    Math.abs(reference - observed) <= 7
      ? "Sequence on target"
      : observed < reference
        ? "Front shoulder early"
        : "Chest rotation late";

  return (
    <section
      aria-label="Football quarterback throwing comparison"
      className="overflow-hidden rounded-md border border-border bg-[var(--ink)]"
    >
      <span className="sr-only">
        Observed shoulder separation {observed} degrees, reference {reference}{" "}
        degrees, throwing score {score} out of 100.
      </span>

      <div
        className={
          compact
            ? "relative min-h-[22rem] overflow-hidden sm:min-h-[29rem]"
            : "relative min-h-[24rem] overflow-hidden sm:min-h-[31rem]"
        }
      >
        <div className="capture-grid absolute inset-0 opacity-25" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4 sm:p-6">
          <div className="border-l-2 border-accent-brand pl-3 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-foreground">
            <span className="block text-muted-foreground">Pass 01</span>
            Throwing-side view
          </div>
          <div className="grid gap-2 bg-black/30 px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.12em] sm:px-4">
            <span className="flex items-center gap-3 text-foreground">
              <span className="h-px w-8 bg-foreground" /> You
            </span>
            <span className="flex items-center gap-3 text-primary">
              <span className="h-px w-8 bg-primary" /> Echo
            </span>
          </div>
        </div>

        <div className="absolute inset-x-3 bottom-16 top-[4.75rem] grid grid-cols-2 items-end gap-2 sm:inset-x-[15%] sm:bottom-12 sm:top-20 sm:gap-14">
          <div className="flex h-full min-w-0 flex-col items-center border-r border-border/70 pr-2 sm:pr-8">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground sm:text-[0.62rem] sm:tracking-[0.15em]">
              Observed / {observed}°
            </span>
            <div className="mt-3 flex min-h-0 w-full flex-1 justify-center sm:mt-4">
              <QuarterbackFigure />
            </div>
          </div>
          <div className="flex h-full min-w-0 flex-col items-center pl-2 sm:pl-8">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-primary sm:text-[0.62rem] sm:tracking-[0.15em]">
              Reference / {reference}°
            </span>
            <div className="mt-3 flex min-h-0 w-full flex-1 justify-center sm:mt-4">
              <QuarterbackFigure reference />
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 flex max-w-[calc(100%-7.5rem)] items-center gap-2 border border-accent-brand bg-background/90 px-2.5 py-2 sm:bottom-6 sm:left-6 sm:max-w-none sm:gap-3 sm:px-3">
          <Activity aria-hidden="true" className="size-4 text-accent-brand" />
          <span className="truncate font-mono text-[0.58rem] uppercase tracking-[0.1em] text-foreground sm:text-[0.62rem] sm:tracking-[0.12em]">
            {sequenceCue}
          </span>
        </div>
        <span className="absolute bottom-5 right-4 font-mono text-[0.68rem] text-muted-foreground sm:bottom-7 sm:right-6 sm:text-xs">
          Throw {score}/100
        </span>
      </div>

      <div className="border-t border-border bg-background px-5 py-4 sm:px-7">
        <div className="relative h-12">
          <div className="absolute inset-x-0 top-2 h-px bg-muted-foreground/70" />
          <div className="absolute left-0 top-2 h-0.5 w-[58%] bg-accent-brand" />
          <span className="absolute left-[58%] top-2 size-3 -translate-x-1/2 -translate-y-1/2 bg-accent-brand" />
          <div className="absolute inset-x-0 top-5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground sm:text-[0.65rem]">
            <span className="absolute left-0">Set</span>
            <span className="absolute left-[58%] -translate-x-1/2 text-foreground">
              Foot plant
            </span>
            <span className="absolute right-0">Release</span>
          </div>
        </div>
      </div>
    </section>
  );
}
