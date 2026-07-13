"use client";

import { useState } from "react";
import { Check, ChevronRight, Cloud, HardDrive, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { AnalysisResult, CoachingResult } from "@/lib/contracts";
import { getPersistenceMode, isSupabaseConfigured, saveSession } from "@/lib/db";
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
      if (isSupabaseConfigured()) {
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
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
      <Button
        className="h-11 border-border bg-transparent px-5 font-medium text-foreground hover:bg-muted"
        disabled={pending}
        onClick={handleSave}
        variant="outline"
      >
        {pending ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        Save &amp; view progress
        <ChevronRight className="size-4" />
      </Button>
      <span className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-end">
        {mode === "supabase" ? (
          <Cloud className="size-3" />
        ) : (
          <HardDrive className="size-3" />
        )}
        {mode === "supabase"
          ? "Saved securely with Supabase"
          : "Local demo storage"}
      </span>
      {error && (
        <span aria-live="polite" className="max-w-sm text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
