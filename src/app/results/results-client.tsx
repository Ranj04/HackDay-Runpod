"use client";

// Reads the shot the capture page just recorded (sessionStorage), runs the real
// analyze + coach server action on it, and renders the canvas + results. Falls
// back to the bundled sample shot when there's no live capture, so the page
// never blanks during a demo.
import { type ComponentType, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";

import {
  BaseballShowcase,
  EchoOverlay,
  FootballShowcase,
} from "@/components/overlay";
import { ResultsView } from "@/components/results";
import { baseballSampleAnalysis, baseballSampleCoaching } from "@/lib/baseball-sample";
import {
  loadCapture,
  loadCapturedClip,
  loadCaptureSource,
} from "@/lib/capture-store";
import {
  applyCaptureScorePolicy,
  type CaptureSource,
} from "@/lib/analysis/scorePolicy";
import {
  AnalysisResultSchema,
  CoachingResultSchema,
  type AnalysisResult,
  type CoachingResult,
  type ShotCapture,
} from "@/lib/contracts";
import {
  footballSampleAnalysis,
  footballSampleCoaching,
} from "@/lib/football-sample";
import { mockShotCapture } from "@/lib/sample-shot";
import type { SportId } from "@/lib/sports";

import {
  analyzeAndCoach,
  analyzeBaseballAndCoach,
  analyzeFootballAndCoach,
} from "../capture/actions";
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
    return <ThrowingResultsClient config={BASEBALL_RESULTS} key="baseball" />;
  }

  if (sport === "football") {
    return <ThrowingResultsClient config={FOOTBALL_RESULTS} key="football" />;
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

type ThrowingSportId = Extract<SportId, "baseball" | "football">;
type ThrowingAnalysisAction = (capture: ShotCapture) => Promise<{
  analysis: AnalysisResult;
  coaching: CoachingResult;
}>;
type ThrowingShowcase = ComponentType<{
  observed?: number;
  reference?: number;
  score?: number;
}>;

interface ThrowingResultsConfig {
  sport: ThrowingSportId;
  analyzeAndCoach: ThrowingAnalysisAction;
  sampleAnalysis: AnalysisResult;
  sampleCoaching: CoachingResult;
  sampleStatus: string;
  loadingLabel: string;
  errorFallback: string;
  errorLinkLabel: string;
  metricLabels: readonly [string, string];
  scoreLabel: string;
  scoreBlurb: (analysis: AnalysisResult) => string;
  retryHref: string;
  retryLabel: string;
  Showcase: ThrowingShowcase;
}

const BASEBALL_RESULTS: ThrowingResultsConfig = {
  sport: "baseball",
  analyzeAndCoach: analyzeBaseballAndCoach,
  sampleAnalysis: baseballSampleAnalysis,
  sampleCoaching: baseballSampleCoaching,
  sampleStatus: "Sample pitch — record or upload your own to see your delivery.",
  loadingLabel: "Analyzing your pitch…",
  errorFallback: "Could not analyze that pitch.",
  errorLinkLabel: "Record or upload another pitch",
  metricLabels: ["Your separation", "Reference"],
  scoreLabel: "Delivery score",
  scoreBlurb: (analysis) =>
    analysis.topFlaw.id === "pitch_sequence_on_target"
      ? "Strong sequence. Keep the same tempo."
      : "One timing cue for your next bullpen.",
  retryHref: "/capture?sport=baseball",
  retryLabel: "Try another pitch",
  Showcase: BaseballShowcase,
};

const FOOTBALL_RESULTS: ThrowingResultsConfig = {
  sport: "football",
  analyzeAndCoach: analyzeFootballAndCoach,
  sampleAnalysis: footballSampleAnalysis,
  sampleCoaching: footballSampleCoaching,
  sampleStatus: "Sample throw — record or upload your own to see your sequence.",
  loadingLabel: "Analyzing your throw…",
  errorFallback: "Could not analyze that throw.",
  errorLinkLabel: "Record or upload another throw",
  metricLabels: ["Your separation", "Echo reference"],
  scoreLabel: "Throwing score",
  scoreBlurb: (analysis) =>
    analysis.topFlaw.id === "football_sequence_on_target"
      ? "Strong sequence. Preserve the same rhythm."
      : "One sequencing cue for your next rep.",
  retryHref: "/capture?sport=football",
  retryLabel: "Try another throw",
  Showcase: FootballShowcase,
};

function ThrowingResultsClient({
  config,
}: {
  config: ThrowingResultsConfig;
}) {
  const [state, setState] = useState<State>(() => ({
    phase: "ready",
    analysis: config.sampleAnalysis,
    coaching: config.sampleCoaching,
    live: false,
    clip: null,
    compute: "browser-fallback",
  }));

  useEffect(() => {
    const live = loadCapture(config.sport);
    const clip = live ? loadCapturedClip(config.sport) : null;
    let cancelled = false;

    if (!live) {
      return () => {
        cancelled = true;
      };
    }

    config.analyzeAndCoach(live)
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
              : config.errorFallback,
        });
      });

    if (clip) {
      const form = new FormData();
      form.set("capture", JSON.stringify(live));
      form.set("clip", clipAsFile(clip, live.id));
      form.set("sport", config.sport);
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
  }, [config]);

  if (state.phase === "loading") {
    return (
      <div className="grid min-h-[31rem] place-items-center border-y border-border text-muted-foreground">
        <p className="flex items-center gap-2 text-sm">
          <LoaderCircle className="size-5 animate-spin" /> {config.loadingLabel}
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
          href={config.retryHref}
        >
          {config.errorLinkLabel}
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
          config.sampleStatus
        )}
      </p>
      <ResultsView
        analysis={analysis}
        coaching={coaching}
        echoOverlay={
          <config.Showcase
            observed={analysis.topFlaw.observed}
            reference={analysis.topFlaw.reference}
            score={analysis.score}
          />
        }
        metricLabels={config.metricLabels}
        scoreBlurb={config.scoreBlurb(analysis)}
        scoreLabel={config.scoreLabel}
        retryHref={config.retryHref}
        retryLabel={config.retryLabel}
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
    // Old stored captures have no source marker; default them to camera so a
    // legacy live recording cannot accidentally receive an upload-style score.
    const source: CaptureSource | undefined = live
      ? loadCaptureSource("basketball") ?? "camera"
      : undefined;
    let cancelled = false;

    // 1) Instant: analyze the browser keypoints we already captured — renders in
    //    ~1s instead of blocking on a cold GPU. The GPU pass then upgrades below.
    analyzeAndCoach(capture, source)
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
      form.set("source", source ?? "camera");
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
                  analysis: applyCaptureScorePolicy(
                    AnalysisResultSchema.parse(payload.analysis),
                    source ?? "camera",
                  ),
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
            autoSave={state.live && !state.upgrading}
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
