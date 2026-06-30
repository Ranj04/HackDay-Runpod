"use client";

// Reads the shot the capture page just recorded (sessionStorage), runs the real
// analyze + coach server action on it, and renders the canvas + results. Falls
// back to the bundled sample shot when there's no live capture, so the page
// never blanks during a demo.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";

import { GhostOverlay } from "@/components/overlay";
import { ResultsView } from "@/components/results";
import { loadCapture } from "@/lib/capture-store";
import { mockShotCapture } from "@/lib/core";
import type { AnalysisResult, CoachingResult } from "@/lib/contracts";

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

    analyzeAndCoach(capture)
      .then(({ analysis, coaching }) =>
        setState({ phase: "ready", analysis, coaching, live: Boolean(live) }),
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
      <div className="grid min-h-[31rem] place-items-center rounded-[2rem] border border-white/10 bg-[#080c14] text-white/70">
        <p className="flex items-center gap-2 text-sm">
          <LoaderCircle className="size-5 animate-spin" /> Analyzing your shot…
        </p>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="space-y-4 rounded-[2rem] border border-white/10 bg-[#080c14] p-8 text-white/80">
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
      <ResultsView
        analysis={state.analysis}
        coaching={state.coaching}
        ghostOverlay={<GhostOverlay result={state.analysis} />}
        saveAction={
          <SaveSessionButton
            analysis={state.analysis}
            coaching={state.coaching}
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
