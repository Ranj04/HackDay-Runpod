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

    const run = async () => {
      if (!clip) {
        const result = await analyzeAndCoach(capture);
        return {
          ...result,
          compute: "browser-fallback" as const,
          warning: live
            ? "Video was unavailable; analyzed browser keypoints instead."
            : undefined,
        };
      }

      const form = new FormData();
      form.set("capture", JSON.stringify(capture));
      form.set(
        "clip",
        new File([clip], `echo-${capture.id}.webm`, {
          type: clip.type || "video/webm",
        }),
      );
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not analyze that shot.");
      }
      return {
        analysis: AnalysisResultSchema.parse(payload.analysis),
        coaching: CoachingResultSchema.parse(payload.coaching),
        compute: payload.compute as "flash-gpu" | "browser-fallback",
        gpuMs:
          typeof payload.gpuMs === "number" ? payload.gpuMs : undefined,
        modelLoadMs:
          typeof payload.modelLoadMs === "number"
            ? payload.modelLoadMs
            : undefined,
        warning:
          typeof payload.warning === "string" ? payload.warning : undefined,
      };
    };

    run()
      .then((result) =>
        setState({
          phase: "ready",
          ...result,
          live: Boolean(live),
          clip,
        }),
      )
      .catch((caught) =>
        setState({
          phase: "error",
          message:
            caught instanceof Error
              ? caught.message
              : "Could not analyze that shot.",
        }),
      );
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
          {state.compute === "flash-gpu"
            ? `RunPod Flash GPU${state.gpuMs ? ` · ${(state.gpuMs / 1000).toFixed(1)}s` : ""}`
            : "Browser analysis fallback"}
          {state.warning ? ` · ${state.warning}` : ""}
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
