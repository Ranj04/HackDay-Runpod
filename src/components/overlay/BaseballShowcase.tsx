"use client";

import { Activity, Gauge, MoveRight } from "lucide-react";

function PitcherFigure({ echo = false }: { echo?: boolean }) {
  const color = echo ? "var(--blue)" : "var(--foreground)";

  return (
    <svg
      aria-hidden="true"
      className={echo ? "opacity-45" : "opacity-90"}
      viewBox="0 0 150 240"
    >
      <g fill="none" stroke={color} strokeLinecap="round" strokeWidth="7">
        <circle cx="76" cy="31" r="18" strokeWidth="6" />
        <path d="M73 50 67 110 103 143" />
        <path d="M69 70 35 94 17 76" />
        <path d="M70 72 111 56 132 75" />
        <path d="M68 109 42 153 15 199" />
        <path d="M69 109 95 154 127 204" />
      </g>
      {!echo && <circle cx="135" cy="76" r="8" fill="var(--orange)" />}
    </svg>
  );
}

export function BaseballShowcase({ compact = false }: { compact?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-card shadow-2xl shadow-black/30">
      <div className="capture-grid absolute inset-0 opacity-20" />
      <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-accent-brand shadow-[0_0_12px_var(--orange)]" />
          Pitch 01 · side view
        </span>
        <span className="font-mono">68 / 100</span>
      </div>
      <div className={compact ? "relative h-[25rem]" : "relative h-[32rem]"}>
        <div className="absolute inset-x-8 top-8 flex items-center justify-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <Activity className="size-3.5 text-primary" />
          Foot strike checkpoint
        </div>
        <div className="absolute inset-x-5 bottom-20 top-16 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <PitcherFigure />
          <MoveRight className="size-6 text-accent-brand" />
          <PitcherFigure echo />
        </div>
        <div className="absolute inset-x-5 bottom-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-background/70 p-3 backdrop-blur">
            <span className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">You</span>
            <strong className="mt-1 flex items-center gap-2 font-mono text-xl">28° <Gauge className="size-4 text-accent-brand" /></strong>
          </div>
          <div className="rounded-xl border border-primary/25 bg-primary/10 p-3 backdrop-blur">
            <span className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">Reference</span>
            <strong className="mt-1 block font-mono text-xl text-primary">42°</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
