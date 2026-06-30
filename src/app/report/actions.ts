"use server";

// Enriches a fan-out report with cited coaching drills. Runs server-side because
// coachFlaw reads API keys and calls the Flash RAG endpoint (server-only), with a
// curated fallback so drills + sources render even before the endpoint is live.
import { coachFlaw } from "@/lib/core";
import type { Flaw } from "@/lib/contracts";
import type { CoachedRep, CoachedReport, RankReport } from "@/lib/sample-report";

const FLAW_LABELS: Record<string, string> = {
  elbow_flare: "Elbow flaring out at release",
  shallow_dip: "Shallow leg dip — not enough bend",
  wrist_snap: "Wrist snap timing off",
  guide_hand: "Guide hand interfering at release",
  low_release: "Release point too low",
};

function flawFromLabel(flawLabel: string): Flaw {
  return {
    id: flawLabel,
    label: FLAW_LABELS[flawLabel] ?? flawLabel.replace(/_/g, " "),
    severity: "high",
    metric: flawLabel,
    observed: 0,
    reference: 0,
    direction: "too_high",
  };
}

/** Per rep with a real flaw, fetch its cited drill (worst reps drive the report). */
export async function buildReport(report: RankReport): Promise<CoachedReport> {
  const reps: CoachedRep[] = await Promise.all(
    report.reps.map(async (rep): Promise<CoachedRep> => {
      if (rep.flaw_label === "none" || rep.flaw_label === "error") {
        return { ...rep };
      }
      try {
        const coaching = await coachFlaw(flawFromLabel(rep.flaw_label));
        return { ...rep, coaching };
      } catch {
        return { ...rep }; // never let one RAG miss sink the whole report
      }
    }),
  );
  return { reps, worst: report.worst, cost: report.cost };
}
