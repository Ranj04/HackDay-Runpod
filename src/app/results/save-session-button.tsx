"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Cloud, HardDrive, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { AnalysisResult, CoachingResult } from "@/lib/contracts";
import {
  getPersistenceMode,
  isSupabaseConfigured,
  saveLocalSession,
  saveSession,
} from "@/lib/db";
import { saveCompleteSessionAction } from "@/lib/db/server";

export function SaveSessionButton({
  analysis,
  coaching,
  clip,
  compute,
  autoSave = false,
}: {
  analysis: AnalysisResult;
  coaching: CoachingResult;
  clip: Blob | null;
  compute: {
    provider: "flash-gpu" | "browser-fallback";
    gpuMs?: number;
    modelLoadMs?: number;
  };
  autoSave?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);
  const [error, setError] = useState<string>();
  const autoSaveStarted = useRef(false);
  const mode = getPersistenceMode();
  const savedMarker = `echo.progress.saved.${mode}.${analysis.capture.id}`;

  const persist = useCallback(async (redirectToProgress: boolean) => {
    const previousSave = window.sessionStorage.getItem(savedMarker);
    if (previousSave === "saved" || previousSave === "local") {
      setSaved(true);
      setSavedLocally(previousSave === "local");
      if (redirectToProgress) router.push("/history");
      return;
    }

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
      window.sessionStorage.setItem(savedMarker, "saved");
      setSaved(true);
      setPending(false);
      if (redirectToProgress) router.push("/history");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      const authMissing =
        message === "AUTH_REQUIRED" ||
        message.toLowerCase().includes("auth session missing");

      if (authMissing) {
        try {
          await saveLocalSession(analysis, coaching);
          window.sessionStorage.setItem(savedMarker, "local");
          setSavedLocally(true);
          setSaved(true);
          setPending(false);
          if (redirectToProgress) router.push("/history");
        } catch (localError) {
          setError(
            localError instanceof Error
              ? localError.message
              : "Could not save this upload locally.",
          );
          setPending(false);
        }
        return;
      }
      setError(caught instanceof Error ? caught.message : "Could not save.");
      setPending(false);
    }
  }, [
    analysis,
    clip,
    coaching,
    compute,
    router,
    savedMarker,
  ]);

  useEffect(() => {
    if (!autoSave || autoSaveStarted.current) return;
    autoSaveStarted.current = true;
    void persist(false);
  }, [autoSave, persist]);

  function handleSave() {
    if (saved) {
      router.push("/history");
      return;
    }
    void persist(true);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        className="h-11 px-5 font-medium"
        disabled={pending}
        onClick={handleSave}
      >
        {pending ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        {pending
          ? "Adding to progress…"
          : saved
            ? "Saved — view progress"
            : "Save & view progress"}
        <ChevronRight className="size-4" />
      </Button>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {mode === "supabase" ? (
          <Cloud className="size-3" />
        ) : (
          <HardDrive className="size-3" />
        )}
        {saved
          ? savedLocally
            ? "Added locally — sign in to sync future uploads"
            : "Automatically added to your progress"
          : mode === "supabase"
            ? "Uploads save securely to your account"
            : "Uploads save to local demo storage"}
      </span>
      {error && (
        <span aria-live="polite" className="max-w-sm text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
