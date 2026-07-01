"use client";

// Reads the shot the capture page just recorded (sessionStorage), runs the real
// analyze + coach server action on it, and renders the canvas + results. Falls
// back to the bundled sample shot when there's no live capture, so the page
// never blanks during a demo.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";

import { EchoOverlay } from "@/components/overlay";
import { ResultsView } from "@/components/results";
import { loadCapture, loadCapturedClip } from "@/lib/capture-store";
import {
  AnalysisResultSchema,
  CoachingResultSchema,
  type AnalysisResult,
  type CoachingResult,
} from "@/lib/contracts";
import { mockShotCapture } from "@/lib/sample-shot";

import { analyzeAndCoach } from "../capture/actions";
import { SaveSessionButton } from "./save-session-button";

type State =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | {
      phase: "ready";
      analysis: AnalysisResult;
      coaching: CoachingResult;
      live: boolean;
      clip: Blob | null;
      compute: "flash-gpu" | "browser-fallback";
      gpuMs?: number;
      modelLoadMs?: number;
      warning?: string;
      upgrading?: boolean; // instant browser result shown; GPU pass in flight
    };

export function ResultsClient() {
  const [state, setState] = useState<State>({ phase: "loading" });
  // Guard against double-run (React strict mode / fast refresh).
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const live = loadCapture();
    const capture = live ?? mockShotCapture;
    const clip = live ? loadCapturedClip() : null;
    let cancelled = false;

    // 1) Instant: analyze the browser keypoints we already captured — renders in
    //    ~1s instead of blocking on a cold GPU. The GPU pass then upgrades below.
    analyzeAndCoach(capture)
      .then((result) => {
        if (cancelled) return;
        setState({
          phase: "ready",
          analysis: result.analysis,
          coaching: result.coaching,
          live: Boolean(live),
          clip,
          compute: "browser-fallback",
          upgrading: Boolean(clip),
        });
      })
      .catch((caught) => {
        if (cancelled) return;
        setState({
          phase: "error",
          message:
            caught instanceof Error ? caught.message : "Could not analyze that shot.",
        });
      });

    // 2) Background upgrade: GPU pose on the clip, swapped in when (if) it lands.
    //    A slow/failed GPU never blocks — the browser result already rendered.
    if (clip) {
      const form = new FormData();
      form.set("capture", JSON.stringify(capture));
      form.set(
        "clip",
        new File([clip], `echo-${capture.id}.webm`, {
          type: clip.type || "video/webm",
        }),
      );
      fetch("/api/analyze", { method: "POST", body: form })
        .then(async (response) => {
          const payload = await response.json().catch(() => null);
          if (cancelled) return;
          if (!response.ok || !payload || payload.compute !== "flash-gpu") {
            setState((prev) =>
              prev.phase === "ready" ? { ...prev, upgrading: false } : prev,
            );
            return;
          }
          setState((prev) =>
            prev.phase === "ready"
              ? {
                  ...prev,
                  analysis: AnalysisResultSchema.parse(payload.analysis),
                  coaching: CoachingResultSchema.parse(payload.coaching),
                  compute: "flash-gpu",
                  gpuMs:
                    typeof payload.gpuMs === "number" ? payload.gpuMs : undefined,
                  modelLoadMs:
                    typeof payload.modelLoadMs === "number"
                      ? payload.modelLoadMs
                      : undefined,
                  upgrading: false,
                }
              : prev,
          );
        })
        .catch(() => {
          if (cancelled) return;
          setState((prev) =>
            prev.phase === "ready" ? { ...prev, upgrading: false } : prev,
          );
        });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.phase === "loading") {
    return (
      <div className="grid min-h-[31rem] place-items-center rounded-[2rem] border border-border bg-card text-muted-foreground">
        <p className="flex items-center gap-2 text-sm">
          <LoaderCircle className="size-5 animate-spin" /> Analyzing your shot…
        </p>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="space-y-4 rounded-[2rem] border border-border bg-card p-8 text-muted-foreground">
        <p className="text-sm text-destructive">{state.message}</p>
        <Link
          className="text-sm underline hover:text-foreground"
          href="/capture"
        >
          Record another shot
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!state.live && (
        <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground">
          Sample shot — record your own to see your mechanics.
        </p>
      )}
      {state.live && (
        <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground">
          {state.upgrading ? (
            <>
              <LoaderCircle className="size-3 animate-spin" /> Verifying on RunPod GPU…
            </>
          ) : state.compute === "flash-gpu" ? (
            `RunPod Flash GPU${state.gpuMs ? ` · ${(state.gpuMs / 1000).toFixed(1)}s` : ""}`
          ) : (
            "Browser analysis"
          )}
          {!state.upgrading && state.warning ? ` · ${state.warning}` : ""}
        </p>
      )}
      <ResultsView
        analysis={state.analysis}
        coaching={state.coaching}
        echoOverlay={<EchoOverlay result={state.analysis} />}
        saveAction={
          <SaveSessionButton
            analysis={state.analysis}
            coaching={state.coaching}
            clip={state.clip}
            compute={{
              provider: state.compute,
              gpuMs: state.gpuMs,
              modelLoadMs: state.modelLoadMs,
            }}
          />
        }
      />
      <Link
        className="inline-block text-sm text-muted-foreground underline hover:text-foreground"
        href="/capture"
      >
        Record another shot
      </Link>
    </div>
  );
}
