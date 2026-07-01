"use server";

// Enriches a fan-out report with cited coaching drills. Runs server-side because
// coachFlaw reads API keys and calls the Flash RAG endpoint (server-only), with a
// curated fallback so drills + sources render even before the endpoint is live.
import { coachFlaw } from "@/lib/core";
import type { Flaw } from "@/lib/contracts";
import { CoachingResultSchema } from "@/lib/contracts";
import { curatedFor } from "@/lib/coach/curated";
import { templateSummary } from "@/lib/coach/nebius";
import { hasFlashRank, rankClipsOnFlash } from "@/lib/flash/client";
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

function curatedCoaching(flawLabel: string): CoachedRep["coaching"] {
  const flaw = flawFromLabel(flawLabel);
  const curated = curatedFor(flaw);
  return CoachingResultSchema.parse({
    flawId: flaw.id,
    summary: templateSummary(flaw, curated.drill),
    drill: curated.drill,
    references: curated.references,
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("COACHING_TIMEOUT")), ms),
    ),
  ]);
}

/** Per rep with a real flaw, fetch its cited drill (worst reps drive the report). */
export async function buildReport(
  report: RankReport,
  options?: { liveCoaching?: boolean },
): Promise<CoachedReport> {
  const liveCoaching = options?.liveCoaching ?? false;

  const reps: CoachedRep[] = await Promise.all(
    report.reps.map(async (rep): Promise<CoachedRep> => {
      if (rep.flaw_label === "none" || rep.flaw_label === "error") {
        return { ...rep };
      }

      if (!liveCoaching) {
        try {
          return { ...rep, coaching: curatedCoaching(rep.flaw_label) };
        } catch {
          return { ...rep };
        }
      }

      try {
        const coaching = await withTimeout(
          coachFlaw(flawFromLabel(rep.flaw_label)),
          12_000,
        );
        return { ...rep, coaching };
      } catch {
        return { ...rep, coaching: curatedCoaching(rep.flaw_label) };
      }
    }),
  );
  // Pass `timeline` through unchanged so B's fan-out replay (Phase 4) has the
  // real per-clip timing; coaching enrichment only touches `reps`.
  return { reps, worst: report.worst, cost: report.cost, timeline: report.timeline };
}

/**
 * Live fan-out from A's Flash orchestrator. Honest by construction: one rep per
 * DISTINCT clip. `BATCH_CLIP_URLS` is a comma-separated list of different shots;
 * `BATCH_CLIP_URL`/`CLIP_URL` is a single clip (a batch of one). We no longer
 * fabricate N reps by scoring the same clip N times — a real ranking needs real,
 * different clips.
 */
export async function fetchFanoutReportAction(): Promise<RankReport | null> {
  if (!hasFlashRank()) return null;

  const urls = (
    process.env.BATCH_CLIP_URLS ??
    process.env.BATCH_CLIP_URL ??
    process.env.CLIP_URL ??
    ""
  )
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, 10);
  if (urls.length === 0) return null;

  const clips = urls.map((clip_url, i) => ({
    clip_url,
    rep_id: `r${i + 1}`,
    stride: 4,
    nonce: `batch-${i}-${Date.now()}`,
  }));

  try {
    return await rankClipsOnFlash(clips);
  } catch {
    return null;
  }
}
