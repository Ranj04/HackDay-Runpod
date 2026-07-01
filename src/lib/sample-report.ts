// Mock fan-out report in the SHARED CONTRACT shape A's orchestrator emits
// ({reps, worst} + an additive cost panel). Drives the /report view until
// integration, when A's real output replaces it.
import type { CoachingResult } from "@/lib/contracts";

/**
 * Per-axis 0–100 sub-scores (100 = matches the reference rep). Additive VIZ
 * field: A emits the sub-scores it already computes in scoring; B renders them
 * as a radar. Optional — existing consumers ignore it when absent.
 */
export interface RepDimensions {
  release_angle: number;
  arc: number;
  knee_bend: number;
  follow_through: number;
}

export interface RankRep {
  rep_id: string;
  score: number;
  flaw_label: string;
  keypoints_uri?: string | null;
  dimensions?: RepDimensions;
}

/**
 * One clip's fan-out timing, captured around A's `asyncio.gather` dispatch.
 * Timestamps are seconds relative to batch start; intervals overlap because the
 * GPU endpoint runs the clips in parallel. Additive VIZ field — optional.
 */
export interface TimelineEntry {
  rep_id: string;
  worker_id: string;
  started_at: number;
  finished_at: number;
}

export interface RankCost {
  gpu_seconds?: number;
  cpu_seconds?: number;
  workers?: number;
  reps?: number;
  // Phase 4 additions (B-side observability).
  brightdata_requests?: number;
  supabase_rows?: number;
}

export interface RankReport {
  reps: RankRep[];
  worst: string[];
  cost?: RankCost;
  timeline?: TimelineEntry[];
}

/** A rep enriched with its cited coaching drill (for the worst reps). */
export type CoachedRep = RankRep & { coaching?: CoachingResult };
export interface CoachedReport {
  reps: CoachedRep[];
  worst: string[];
  cost?: RankCost;
  timeline?: TimelineEntry[];
}

export const sampleReport: RankReport = {
  reps: [
    { rep_id: "r1", score: 41, flaw_label: "elbow_flare", keypoints_uri: "echo-runs/r1/keypoints.json",
      dimensions: { release_angle: 34, arc: 71, knee_bend: 66, follow_through: 62 } },
    { rep_id: "r2", score: 58, flaw_label: "shallow_dip", keypoints_uri: "echo-runs/r2/keypoints.json",
      dimensions: { release_angle: 78, arc: 69, knee_bend: 41, follow_through: 73 } },
    { rep_id: "r3", score: 33, flaw_label: "low_release", keypoints_uri: "echo-runs/r3/keypoints.json",
      dimensions: { release_angle: 64, arc: 27, knee_bend: 58, follow_through: 49 } },
    { rep_id: "r4", score: 88, flaw_label: "none", keypoints_uri: "echo-runs/r4/keypoints.json",
      dimensions: { release_angle: 90, arc: 86, knee_bend: 88, follow_through: 91 } },
    { rep_id: "r5", score: 47, flaw_label: "wrist_snap", keypoints_uri: "echo-runs/r5/keypoints.json",
      dimensions: { release_angle: 72, arc: 60, knee_bend: 70, follow_through: 38 } },
  ],
  // rep_ids ascending by score — worst first.
  worst: ["r3", "r1", "r5", "r2", "r4"],
  cost: {
    gpu_seconds: 18.4,
    cpu_seconds: 0.21,
    workers: 5,
    reps: 5,
    brightdata_requests: 12,
    supabase_rows: 47,
  },
  // Fan-out timing (seconds from batch start). Staggered starts = workers
  // scaling 0->5; overlapping intervals = real parallel GPU execution.
  timeline: [
    { rep_id: "r1", worker_id: "w1", started_at: 0.02, finished_at: 1.71 },
    { rep_id: "r2", worker_id: "w2", started_at: 0.05, finished_at: 1.44 },
    { rep_id: "r3", worker_id: "w3", started_at: 0.09, finished_at: 1.98 },
    { rep_id: "r4", worker_id: "w4", started_at: 0.13, finished_at: 1.22 },
    { rep_id: "r5", worker_id: "w5", started_at: 0.18, finished_at: 1.55 },
  ],
};
