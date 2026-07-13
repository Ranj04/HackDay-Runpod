"use client";

// Reads the shot the capture page just recorded (sessionStorage), runs the real
// analyze + coach server action on it, and renders the canvas + results. Falls
// back to the bundled sample shot when there's no live capture, so the page
// never blanks during a demo.
import { useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";

import { EchoOverlay } from "@/components/overlay";
import { BaseballShowcase } from "@/components/overlay";
import { ResultsView } from "@/components/results";
import { baseballSampleAnalysis, baseballSampleCoaching } from "@/lib/baseball-sample";
import { loadCapture, loadCapturedClip } from "@/lib/capture-store";
import {
  AnalysisResultSchema,
  CoachingResultSchema,
  type AnalysisResult,
  type CoachingResult,
} from "@/lib/contracts";
import { mockShotCapture } from "@/lib/sample-shot";
import type { SportId } from "@/lib/sports";

import { analyzeAndCoach, analyzeBaseballAndCoach } from "../capture/actions";
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

export function ResultsClient({ sport }: { sport: SportId }) {
  if (sport === "baseball") {
    return <BaseballResultsClient />;
  }

  return <BasketballResultsClient />;
}

function clipAsFile(clip: Blob, captureId: string): File {
  const extension = clip.type.includes("quicktime")
    ? "mov"
    : clip.type.includes("mp4")
      ? "mp4"
      : "webm";
  return new File([clip], `echo-${captureId}.${extension}`, {
    type: clip.type || "video/webm",
  });
}

function BaseballResultsClient() {
  const [state, setState] = useState<State>({
    phase: "ready",
    analysis: baseballSampleAnalysis,
    coaching: baseballSampleCoaching,
    live: false,
    clip: null,
    compute: "browser-fallback",
  });

  useEffect(() => {
    const live = loadCapture("baseball");
    const clip = live ? loadCapturedClip("baseball") : null;
    let cancelled = false;

    if (!live) {
      return () => {
        cancelled = true;
      };
    }

    analyzeBaseballAndCoach(live)
      .then((result) => {
        if (cancelled) return;
        setState({
          phase: "ready",
          analysis: result.analysis,
          coaching: result.coaching,
          live: true,
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
            caught instanceof Error
              ? caught.message
              : "Could not analyze that pitch.",
        });
      });

    if (clip) {
      const form = new FormData();
      form.set("capture", JSON.stringify(live));
      form.set("clip", clipAsFile(clip, live.id));
      form.set("sport", "baseball");
      fetch("/api/analyze", { method: "POST", body: form })
        .then(async (response) => {
          const payload = await response.json().catch(() => null);
          if (cancelled) return;
          if (!response.ok || !payload) {
            setState((previous) =>
              previous.phase === "ready"
                ? {
                    ...previous,
                    upgrading: false,
                    warning: payload?.error ?? "GPU verification was unavailable",
                  }
                : previous,
            );
            return;
          }
          setState((previous) =>
            previous.phase === "ready"
              ? {
                  ...previous,
                  analysis: AnalysisResultSchema.parse(payload.analysis),
                  coaching: CoachingResultSchema.parse(payload.coaching),
                  compute:
                    payload.compute === "flash-gpu"
                      ? "flash-gpu"
                      : "browser-fallback",
                  gpuMs:
                    typeof payload.gpuMs === "number" ? payload.gpuMs : undefined,
                  modelLoadMs:
                    typeof payload.modelLoadMs === "number"
                      ? payload.modelLoadMs
                      : undefined,
                  warning:
                    typeof payload.warning === "string"
                      ? payload.warning
                      : undefined,
                  upgrading: false,
                }
              : previous,
          );
        })
        .catch((caught) => {
          if (cancelled) return;
          setState((previous) =>
            previous.phase === "ready"
              ? {
                  ...previous,
                  upgrading: false,
                  warning:
                    caught instanceof Error
                      ? caught.message
                      : "GPU verification was unavailable",
                }
              : previous,
          );
        });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.phase === "loading") {
    return (
      <div className="grid min-h-[31rem] place-items-center border-y border-border text-muted-foreground">
        <p className="flex items-center gap-2 text-sm">
          <LoaderCircle className="size-5 animate-spin" /> Analyzing your pitch…
        </p>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="space-y-4 border-y border-border py-10 text-muted-foreground">
        <p className="text-sm text-destructive">{state.message}</p>
        <Link
          className="text-sm font-medium text-accent-brand-strong underline decoration-accent-brand/40 underline-offset-4 hover:decoration-accent-brand"
          href="/capture?sport=baseball"
        >
          Record or upload another pitch
        </Link>
      </div>
    );
  }

  const { analysis, coaching } = state;
  return (
    <div>
      <p
        aria-live="polite"
        className="mb-4 flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground"
      >
        {state.live ? (
          state.upgrading ? (
            <>
              <LoaderCircle className="size-3 animate-spin" /> Verifying on RunPod
              GPU…
            </>
          ) : state.compute === "flash-gpu" ? (
            `RunPod Flash GPU${state.gpuMs ? ` · ${(state.gpuMs / 1000).toFixed(1)}s` : ""}`
          ) : (
            `Browser analysis${state.warning ? ` · ${state.warning}` : ""}`
          )
        ) : (
          "Sample pitch — record or upload your own to see your delivery."
        )}
      </p>
      <ResultsView
        analysis={analysis}
        coaching={coaching}
        echoOverlay={
          <BaseballShowcase
            observed={analysis.topFlaw.observed}
            reference={analysis.topFlaw.reference}
            score={analysis.score}
          />
        }
        metricLabels={["Your separation", "Reference"]}
        scoreBlurb={
          analysis.topFlaw.id === "pitch_sequence_on_target"
            ? "Strong sequence. Keep the same tempo."
            : "One timing cue for your next bullpen."
        }
        scoreLabel="Delivery score"
        retryHref="/capture?sport=baseball"
        retryLabel="Try another pitch"
        showSaveAction={false}
      />
    </div>
  );
}

function BasketballResultsClient() {
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    const live = loadCapture("basketball");
    const capture = live ?? mockShotCapture;
    const clip = live ? loadCapturedClip("basketball") : null;
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
        clipAsFile(clip, capture.id),
      );
      form.set("sport", "basketball");
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
      <div className="grid min-h-[31rem] place-items-center border-y border-border text-muted-foreground">
        <p className="flex items-center gap-2 text-sm">
          <LoaderCircle className="size-5 animate-spin" /> Analyzing your shot…
        </p>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="space-y-4 border-y border-border py-10 text-muted-foreground">
        <p className="text-sm text-destructive">{state.message}</p>
        <Link
          className="text-sm font-medium text-accent-brand-strong underline decoration-accent-brand/40 underline-offset-4 hover:decoration-accent-brand"
          href="/capture"
        >
          Record another shot
        </Link>
      </div>
    );
  }

  return (
    <div>
      {!state.live && (
        <p className="mb-4 flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
          Sample shot — record your own to see your mechanics.
        </p>
      )}
      {state.live && (
        <p
          aria-live="polite"
          className="mb-4 flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground"
        >
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
        echoOverlay={
          <EchoOverlay
            className="!w-full [&>div:first-child]:!h-auto [&>div:first-child]:!w-full [&>div:first-child>div:first-child]:!h-auto [&>div:first-child>div:first-child]:!w-full [&_canvas]:!h-auto [&_canvas]:!w-full"
            height={520}
            result={state.analysis}
            width={760}
          />
        }
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
    </div>
  );
}
