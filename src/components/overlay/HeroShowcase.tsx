"use client";

import { useEffect, useRef, useState } from "react";

import sample from "../../../fixtures/sample-shot.json";
import { analyzeShot } from "@/lib/analysis";
import { ShotCaptureSchema, type AnalysisResult } from "@/lib/contracts";

import { EchoOverlay } from "./EchoOverlay";

function LoadingFilmRoom() {
  return (
    <div className="relative flex min-h-80 items-center justify-center overflow-hidden rounded-md border border-border bg-[var(--ink)] sm:min-h-[30rem]">
      <div className="capture-grid absolute inset-0 opacity-25" />
      <div className="relative flex items-center gap-3 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
        <span className="size-2 animate-pulse bg-primary" />
        Aligning sample motion
      </div>
    </div>
  );
}

/** The landing hero runs the real local analysis against the checked-in sample. */
export function HeroShowcase() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1200, height: 470 });
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    let active = true;
    analyzeShot(ShotCaptureSchema.parse(sample)).then((analysis) => {
      if (active) setResult(analysis);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const element = boxRef.current;
    if (!element) return;

    const resize = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      if (width <= 0) return;
      const height = Math.round(
        width >= 900
          ? Math.max(410, Math.min(510, width * 0.34))
          : Math.max(310, Math.min(440, width * 0.72)),
      );
      setSize({ width, height });
    });
    resize.observe(element);
    return () => resize.disconnect();
  }, []);

  return (
    <section aria-label="Interactive form comparison" className="w-full" ref={boxRef}>
      {result ? (
        <EchoOverlay
          className="w-full"
          height={size.height}
          result={result}
          width={size.width}
        />
      ) : (
        <LoadingFilmRoom />
      )}
    </section>
  );
}
