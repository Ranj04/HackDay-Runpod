"use client";

// Renders the fan-out SHARED CONTRACT as a worst-first ranked report. Prefers a
// report persisted in Supabase (proving persist + reload); otherwise enriches the
// mock contract with cited drills. Signed-in users can save a run to Supabase.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Cloud, HardDrive, LoaderCircle } from "lucide-react";

import { RankedReport } from "@/components/results/ranked-report";
import { Button, buttonVariants } from "@/components/ui/button";
import { getPersistenceMode, isSupabaseConfigured } from "@/lib/db";
import { loadLatestReportAction, saveReportAction } from "@/lib/db/server";
import { sampleReport, type CoachedReport } from "@/lib/sample-report";
import { cn } from "@/lib/utils";

import { buildReport, fetchFanoutReportAction } from "./actions";

type State =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; report: CoachedReport; persisted: boolean; live: boolean };

async function loadReport(): Promise<State> {
  // Each source is best-effort: a failure in one never blocks the report — we
  // always fall through to a guaranteed sample render, so /report can't crash.

  // 1. A persisted report (Supabase), if the user is signed in.
  try {
    const saved = isSupabaseConfigured() ? await loadLatestReportAction() : null;
    if (saved?.reps?.length) {
      return { phase: "ready", report: saved, persisted: true, live: false };
    }
  } catch {
    // ignore — fall through
  }

  // 2. A live fan-out from A's Flash pipeline, if configured.
  try {
    const fanout = await fetchFanoutReportAction();
    if (fanout?.reps?.length) {
      const report = await buildReport(fanout, { liveCoaching: true });
      return { phase: "ready", report, persisted: false, live: true };
    }
  } catch {
    // ignore — fall through
  }

  // 3. Sample fallback — must always render.
  try {
    const report = await buildReport(sampleReport);
    return { phase: "ready", report, persisted: false, live: false };
  } catch {
    // Last resort: render the raw contract (ranked reps without cited drills).
    return {
      phase: "ready",
      report: sampleReport as CoachedReport,
      persisted: false,
      live: false,
    };
  }
}

export function ReportClient() {
  const [state, setState] = useState<State>({ phase: "loading" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const mode = getPersistenceMode();

  useEffect(() => {
    let active = true;
    void loadReport().then((nextState) => {
      if (active) setState(nextState);
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    if (state.phase !== "ready") return;
    setSaving(true);
    setSaveError(undefined);
    try {
      await saveReportAction(state.report);
      setState({ phase: "loading" });
      setState(await loadReport()); // reload from account-backed persistence
    } catch (caught) {
      if (caught instanceof Error && caught.message === "AUTH_REQUIRED") {
        window.location.href = "/auth?next=/report";
        return;
      }
      setSaveError(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (state.phase === "loading") {
    return (
      <div className="grid min-h-96 place-items-center text-muted-foreground">
        <LoaderCircle className="size-7 animate-spin" aria-label="Loading report" />
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <Link href="/capture" className={cn(buttonVariants(), "mt-4")}>
          Record a shot
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {state.persisted
            ? "Loaded from your saved history."
            : state.live
              ? "Live fan-out report from RunPod Flash (GPU pose + ranked scoring)."
              : "Demo fan-out — example data for the fan-out visual."}
        </p>
        {!state.persisted ? (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-10 px-5 font-medium"
          >
            {saving ? <LoaderCircle className="animate-spin" /> : <Check className="size-4" />}
            Save run
          </Button>
        ) : null}
      </div>

      <RankedReport report={state.report} />

      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {mode === "supabase" ? <Cloud className="size-3" /> : <HardDrive className="size-3" />}
        {mode === "supabase" ? "Syncs securely to your account" : "Local demo storage"}
      </span>
      {saveError ? (
        <p aria-live="polite" className="text-xs text-destructive">
          {saveError}
        </p>
      ) : null}
    </div>
  );
}
