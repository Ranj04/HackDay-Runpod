"use client";

import { useState } from "react";
import { Check, ChevronRight, Cloud, HardDrive, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { AnalysisResult, CoachingResult } from "@/lib/contracts";
import { getPersistenceMode, isInsForgeConfigured, saveSession } from "@/lib/db";
import { saveCompleteSessionAction } from "@/lib/db/server";

export function SaveSessionButton({
  analysis,
  coaching,
  clip,
  compute,
}: {
  analysis: AnalysisResult;
  coaching: CoachingResult;
  clip: Blob | null;
  compute: {
    provider: "flash-gpu" | "browser-fallback";
    gpuMs?: number;
    modelLoadMs?: number;
  };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const mode = getPersistenceMode();

  async function handleSave() {
    setPending(true);
    setError(undefined);

    try {
      if (isInsForgeConfigured()) {
        const form = new FormData();
        form.set("analysis", JSON.stringify(analysis));
        form.set("coaching", JSON.stringify(coaching));
        form.set("compute", JSON.stringify(compute));
        if (clip) {
          form.set(
            "clip",
            new File([clip], `echo-${analysis.capture.id}.webm`, {
              type: clip.type || "video/webm",
            }),
          );
        }
        await saveCompleteSessionAction(form);
      } else {
        await saveSession(analysis, coaching);
      }
      router.push("/history");
    } catch (caught) {
      if (caught instanceof Error && caught.message === "AUTH_REQUIRED") {
        router.push("/auth?next=/results");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Could not save.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        className="h-11 bg-[#2e86ff] px-5 font-medium text-[#04080f] hover:bg-[#1e6fe0]"
        disabled={pending}
        onClick={handleSave}
      >
        {pending ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        Save &amp; view progress
        <ChevronRight className="size-4" />
      </Button>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {mode === "insforge" ? (
          <Cloud className="size-3" />
        ) : (
          <HardDrive className="size-3" />
        )}
        {mode === "insforge"
          ? "Saved securely with InsForge"
          : "Local demo storage"}
      </span>
      {error && (
        <span aria-live="polite" className="max-w-sm text-xs text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}
