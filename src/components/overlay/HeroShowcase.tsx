"use client";
// Landing hero: the real form-vs-ghost loop on sample data — not a decorative
// placeholder. Auto-plays inside the tilted product card.
import { useEffect, useRef, useState } from "react";
import sample from "../../../fixtures/sample-shot.json";
import { analyzeShot } from "@/lib/analysis";
import { GhostOverlay } from "./GhostOverlay";
import { ShotCaptureSchema, type AnalysisResult } from "@/lib/contracts";

function HeroScanPulse() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#080c14]">
      <div className="capture-grid absolute inset-0 opacity-25" />
      <div
        className="pointer-events-none absolute inset-x-0 h-px bg-[var(--blue)] opacity-70"
        style={{ animation: "hero-scan 2.4s ease-in-out infinite" }}
      />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#080c14] to-transparent" />
    </div>
  );
}

export function HeroShowcase() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 380, h: 475 });
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    analyzeShot(ShotCaptureSchema.parse(sample)).then(setResult);
  }, []);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize({ w: Math.floor(width), h: Math.floor(height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <section className="relative mx-auto w-full max-w-lg">
      <div className="absolute -inset-8 -z-10 rounded-full bg-[var(--blue)]/20 blur-3xl" />
      <div className="rotate-2 rounded-[2.2rem] border border-white/10 bg-[#101a2b] p-3 shadow-2xl shadow-black/20">
        <div
          ref={boxRef}
          className="relative aspect-[4/5] overflow-hidden rounded-[1.65rem] bg-[#080c14]"
        >
          {!result ? (
            <HeroScanPulse />
          ) : (
            <GhostOverlay
              compact
              result={result}
              width={size.w}
              height={size.h}
              className="absolute inset-0 h-full w-full"
            />
          )}

          <div className="pointer-events-none absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-xs text-white/80">
            <span className="size-2 animate-pulse rounded-full bg-[var(--orange)]" />
            Shot 01 · side view
          </div>

          <div className="pointer-events-none absolute inset-x-5 bottom-5 rounded-xl border border-white/10 bg-black/55 p-4 text-white">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="text-xs text-white/50">Form score</span>
                <strong className="data mt-1 block text-4xl font-semibold tabular-nums">
                  {result ? result.score : "—"}
                </strong>
              </div>
              {result && (
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: "var(--orange)", color: "#04080f" }}
                >
                  {result.topFlaw.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
