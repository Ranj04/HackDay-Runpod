"use client";

import { useEffect, useRef, useState } from "react";

import sample from "../../../fixtures/sample-shot.json";
import { analyzeShot } from "@/lib/analysis";
import { ShotCaptureSchema, type AnalysisResult } from "@/lib/contracts";

import {
  BASKETBALL_HERO_SIZES,
  BasketballScene,
  EchoOverlay,
} from "./EchoOverlay";

function LoadingFilmRoom({ height }: { height: number }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-[var(--ink)]">
      <div className="relative" style={{ height }}>
        <BasketballScene preload sizes={BASKETBALL_HERO_SIZES} />
        <div
          aria-live="polite"
          className="absolute bottom-5 left-5 z-20 flex items-center gap-3 border border-border bg-background/90 px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground"
          role="status"
        >
          <span className="size-2 animate-pulse bg-primary" />
          Aligning sample motion
        </div>
      </div>
      <div aria-hidden="true" className="h-20 border-t border-border bg-background" />
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
          scene
          scenePreload
          sceneSizes={BASKETBALL_HERO_SIZES}
          width={size.width}
        />
      ) : (
        <LoadingFilmRoom height={size.height} />
      )}
    </section>
  );
}
