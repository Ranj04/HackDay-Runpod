"use client";

// Renders the fan-out SHARED CONTRACT as a worst-first ranked report. Prefers a
// report persisted in InsForge (proving persist + reload); otherwise enriches the
// mock contract with cited drills. Signed-in users can save a run to InsForge.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Cloud, HardDrive, LoaderCircle } from "lucide-react";

import { RankedReport } from "@/components/results/ranked-report";
import { Button, buttonVariants } from "@/components/ui/button";
import { getPersistenceMode, isInsForgeConfigured } from "@/lib/db";
import { loadLatestReportAction, saveReportAction } from "@/lib/db/server";
import { sampleReport, type CoachedReport } from "@/lib/sample-report";
import { cn } from "@/lib/utils";

import { buildReport } from "./actions";

type State =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; report: CoachedReport; persisted: boolean };

export function ReportClient() {
  const [state, setState] = useState<State>({ phase: "loading" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const mode = getPersistenceMode();

  async function load() {
    setState({ phase: "loading" });
    try {
      const saved = isInsForgeConfigured() ? await loadLatestReportAction() : null;
      if (saved && saved.reps?.length) {
        setState({ phase: "ready", report: saved, persisted: true });
      } else {
        const report = await buildReport(sampleReport);
        setState({ phase: "ready", report, persisted: false });
      }
    } catch (caught) {
      setState({
        phase: "error",
        message: caught instanceof Error ? caught.message : "Could not load report.",
      });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    if (state.phase !== "ready") return;
    setSaving(true);
    setSaveError(undefined);
    try {
      await saveReportAction(state.report);
      await load(); // reload from InsForge — now served from persistence
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
      <div className="rounded-2xl border border-white/10 bg-[#0c1422] p-8 text-center">
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
            ? "Loaded from InsForge — your last saved run."
            : "Live fan-out report (mock contract until integration)."}
        </p>
        {!state.persisted ? (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-10 bg-[#2e86ff] px-5 font-medium text-[#04080f] hover:bg-[#1e6fe0]"
          >
            {saving ? <LoaderCircle className="animate-spin" /> : <Check className="size-4" />}
            Save run
          </Button>
        ) : null}
      </div>

      <RankedReport report={state.report} />

      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {mode === "insforge" ? <Cloud className="size-3" /> : <HardDrive className="size-3" />}
        {mode === "insforge" ? "Persists to InsForge (RLS-scoped per user)" : "Local demo storage"}
      </span>
      {saveError ? (
        <p aria-live="polite" className="text-xs text-red-500">
          {saveError}
        </p>
      ) : null}
    </div>
  );
}
