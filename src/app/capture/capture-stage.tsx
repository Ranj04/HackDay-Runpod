"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { CaptureView } from "@/components/capture/CaptureView";
import { clearCapture, saveCapture } from "@/lib/capture-store";
import type { ShotCapture } from "@/lib/contracts";

export function CaptureStage() {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  // A real recorded shot: stash it and let /results analyze + render it.
  function handleCapture(capture: ShotCapture) {
    setNavigating(true);
    saveCapture(capture);
    router.push("/results");
  }

  // Camera fallback: clear any stored shot so /results renders the sample.
  function analyzeSample() {
    setNavigating(true);
    clearCapture();
    router.push("/results");
  }

  // While routing, unmount the camera so it can't auto-start another countdown.
  if (navigating) {
    return (
      <div className="grid min-h-[31rem] place-items-center rounded-[2rem] border border-white/10 bg-[#080c14] text-white/70">
        <p className="flex items-center gap-2 text-sm">
          <LoaderCircle className="size-5 animate-spin" /> Analyzing your shot…
        </p>
      </div>
    );
  }

  return (
    <div>
      <CaptureView onCapture={handleCapture} />
      <button
        className="mt-4 text-sm text-muted-foreground underline hover:text-foreground disabled:opacity-50"
        onClick={analyzeSample}
        disabled={navigating}
        type="button"
      >
        Camera not working? Analyze a sample shot instead
      </button>
    </div>
  );
}
