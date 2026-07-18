"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, LoaderCircle, Upload } from "lucide-react";

import { CaptureView } from "@/components/capture/CaptureView";
import { VideoUpload } from "@/components/capture/VideoUpload";
import type { CaptureSource } from "@/lib/analysis/scorePolicy";
import { clearCapture, saveCapture } from "@/lib/capture-store";
import type { ShotCapture } from "@/lib/contracts";
import type { SportId } from "@/lib/sports";
import { cn } from "@/lib/utils";

type CaptureMode = "record" | "upload";

export function CaptureStage({ sport }: { sport: SportId }) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const [mode, setMode] = useState<CaptureMode>("record");
  const movement = sport === "baseball" ? "pitch" : "shot";
  const resultsHref = sport === "baseball" ? "/results?sport=baseball" : "/results";

  // A real recorded shot: stash it and let /results analyze + render it.
  function handleCapture(
    capture: ShotCapture,
    clip: Blob | undefined,
    source: CaptureSource,
  ) {
    setNavigating(true);
    saveCapture(capture, clip, sport, source);
    router.push(resultsHref);
  }

  // Camera fallback: clear any stored shot so /results renders the sample.
  function analyzeSample() {
    setNavigating(true);
    clearCapture();
    router.push(resultsHref);
  }

  // While routing, unmount the camera so it can't auto-start another countdown.
  if (navigating) {
    return (
      <div className="grid min-h-[31rem] place-items-center rounded-[2rem] border border-border bg-card text-muted-foreground">
        <p className="flex items-center gap-2 text-sm">
          <LoaderCircle className="size-5 animate-spin" /> Analyzing your {movement}…
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        aria-label="Video source"
        className="mb-5 inline-flex rounded-full border border-border bg-muted p-1"
        role="tablist"
      >
        {(["record", "upload"] as const).map((value) => {
          const selected = mode === value;
          const Icon = value === "record" ? Camera : Upload;
          return (
            <button
              aria-selected={selected}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                selected
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              key={value}
              onClick={() => setMode(value)}
              role="tab"
              type="button"
            >
              <Icon className="size-4" />
              {value === "record" ? "Record" : "Upload video"}
            </button>
          );
        })}
      </div>

      {mode === "record" ? (
        <CaptureView
          onCapture={(capture, clip) => handleCapture(capture, clip, "camera")}
          sport={sport}
        />
      ) : (
        <VideoUpload
          onCapture={(capture, clip) => handleCapture(capture, clip, "upload")}
          sport={sport}
        />
      )}
      <button
        className="mt-4 text-sm text-muted-foreground underline hover:text-foreground disabled:opacity-50"
        onClick={analyzeSample}
        disabled={navigating}
        type="button"
      >
        Use the sample {movement} instead
      </button>
    </div>
  );
}
