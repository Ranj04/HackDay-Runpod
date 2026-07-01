"use client";

// Live fan-out replay (Prompt VIZ, Phase 4). Replays A's real `timeline` — one
// {rep_id, worker_id, started_at, finished_at} per clip — as a grid of tiles
// transitioning queued -> processing -> done across the actual timestamps, plus
// an active-workers counter and a 0->N scale-up readout. Overlapping intervals
// surface as multiple tiles "processing" at once, making the Runpod parallelism
// visible. Pure client-side replay: demo-safe, loopable, no network dependency.
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock, Loader2, Pause, Play, Zap } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { TimelineEntry } from "@/lib/sample-report";
import { cn } from "@/lib/utils";

const HOLD_MS = 900; // pause on the finished batch before looping
const MIN_PLAYBACK_S = 2.5; // keep very short batches watchable
const MAX_PLAYBACK_S = 5; // compress very long batches; overlaps stay proportional

type Phase = "queued" | "processing" | "done";

function phaseAt(e: TimelineEntry, t: number): Phase {
  if (t < e.started_at) return "queued";
  if (t < e.finished_at) return "processing";
  return "done";
}

export function FanoutReplay({
  timeline,
  workersMax,
}: {
  timeline: TimelineEntry[];
  workersMax?: number;
}) {
  const duration = useMemo(
    () => Math.max(0.001, ...timeline.map((e) => e.finished_at)),
    [timeline],
  );
  const workers = useMemo(
    () => Array.from(new Set(timeline.map((e) => e.worker_id))).sort(),
    [timeline],
  );
  const totalWorkers = workersMax ?? workers.length;

  const [now, setNow] = useState(0); // replay clock, REAL seconds (0..duration)
  const [playing, setPlaying] = useState(true);
  const playingRef = useRef(playing);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // Static end state — all done, no animation. Defer out of the effect body.
      const r = requestAnimationFrame(() => setNow(duration));
      return () => cancelAnimationFrame(r);
    }
    // Map real timing onto a watchable, loopable window; overlaps stay proportional.
    const playbackS = Math.min(MAX_PLAYBACK_S, Math.max(MIN_PLAYBACK_S, duration));
    const rate = duration / playbackS; // real-seconds advanced per wall-second
    const clock = { t: 0, hold: 0 };
    let raf = 0;
    let last = performance.now();
    const tick = (ts: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (ts - last) / 1000);
      last = ts;
      if (playingRef.current) {
        if (clock.t >= duration) {
          clock.hold += dt * 1000;
          if (clock.hold >= HOLD_MS) {
            clock.t = 0;
            clock.hold = 0;
          }
        } else {
          clock.t = Math.min(duration, clock.t + dt * rate);
        }
      }
      setNow(clock.t);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration]);

  // Defensive: caller omits us when there's no timing, but never render an empty
  // shell if a report somehow carries an empty timeline.
  if (!timeline.length) return null;

  const phases = timeline.map((e) => phaseAt(e, now));
  const activeWorkerIds = new Set(
    timeline.filter((_, i) => phases[i] === "processing").map((e) => e.worker_id),
  );
  const activeWorkers = activeWorkerIds.size;
  const doneClips = phases.filter((p) => p === "done").length;
  const progressPct = (now / duration) * 100;

  function workerPhase(w: string): Phase {
    const es = timeline.filter((e) => e.worker_id === w);
    if (es.some((e) => phaseAt(e, now) === "processing")) return "processing";
    if (es.every((e) => phaseAt(e, now) === "done")) return "done";
    return "queued";
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-5 p-5">
        {/* header: scale-up readout + active-workers counter + controls */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <Zap className="size-3.5 text-primary" />
              Fan-out · live replay
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-semibold tabular-nums text-primary">
                {activeWorkers}
              </span>
              <span className="text-sm text-muted-foreground">
                / {totalWorkers} GPU workers active
              </span>
            </div>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              scaling 0 → {totalWorkers} · {doneClips}/{timeline.length} clips done
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* per-worker scale-up pips */}
            <div className="flex items-center gap-1" aria-hidden>
              {workers.map((w) => {
                const p = workerPhase(w);
                return (
                  <span
                    key={w}
                    className={cn(
                      "size-2.5 rounded-full transition-colors duration-300 ease-out",
                      p === "processing" &&
                        "bg-primary shadow-[0_0_8px_color-mix(in_oklab,var(--primary),transparent_40%)]",
                      p === "done" && "bg-success",
                      p === "queued" && "bg-border",
                    )}
                  />
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:brightness-110"
              aria-label={playing ? "Pause replay" : "Play replay"}
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
          </div>
        </div>

        {/* clip tiles: queued -> processing -> done */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {timeline.map((e, i) => (
            <ClipTile key={e.rep_id} entry={e} phase={phases[i]} />
          ))}
        </div>

        {/* gantt strip: bars span each clip's interval; the playhead sweeps left
            to right — overlapping bars under the playhead = parallel execution. */}
        <div>
          <div
            className="relative w-full rounded-md bg-muted/40 p-1.5"
            style={{ height: timeline.length * 9 + 12 }}
          >
            {timeline.map((e, i) => {
              const left = (e.started_at / duration) * 100;
              const width = Math.max(
                1.5,
                ((e.finished_at - e.started_at) / duration) * 100,
              );
              const p = phases[i];
              return (
                <div
                  key={e.rep_id}
                  className={cn(
                    "absolute h-[6px] rounded-full transition-colors duration-200 ease-out",
                    p === "processing" &&
                      "bg-primary shadow-[0_0_8px_color-mix(in_oklab,var(--primary),transparent_50%)]",
                    p === "done" && "bg-success/80",
                    p === "queued" && "bg-border",
                  )}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    top: i * 9 + 6,
                  }}
                  title={`${e.rep_id} · ${e.worker_id} · ${e.started_at.toFixed(2)}–${e.finished_at.toFixed(2)}s`}
                />
              );
            })}
            {/* playhead */}
            <div
              className="absolute inset-y-0 w-px bg-foreground/70"
              style={{ left: `${progressPct}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>0.00s</span>
            <span>{now.toFixed(2)}s</span>
            <span>{duration.toFixed(2)}s</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ClipTile({ entry, phase }: { entry: TimelineEntry; phase: Phase }) {
  const dur = (entry.finished_at - entry.started_at).toFixed(2);
  const label =
    phase === "queued" ? "queued" : phase === "processing" ? "processing" : `${dur}s`;
  return (
    <div
      className={cn(
        "rounded-lg border p-2.5 transition-colors duration-300 ease-out",
        phase === "queued" && "border-border bg-muted/30 text-muted-foreground",
        phase === "processing" &&
          "border-primary/50 bg-primary/10 text-foreground shadow-[0_0_18px_color-mix(in_oklab,var(--primary),transparent_82%)]",
        phase === "done" && "border-success/40 bg-success/10 text-foreground",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm">{entry.rep_id}</span>
        {phase === "queued" ? (
          <Clock className="size-3.5 text-muted-foreground" />
        ) : phase === "processing" ? (
          <Loader2 className="size-3.5 animate-spin text-primary" />
        ) : (
          <Check className="size-3.5 text-success" />
        )}
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted-foreground">{entry.worker_id}</span>
        <span className="font-mono text-[10px] tabular-nums">{label}</span>
      </div>
    </div>
  );
}
