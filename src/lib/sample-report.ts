// Mock fan-out report in the SHARED CONTRACT shape A's orchestrator emits
// ({reps, worst} + an additive cost panel). Drives the /report view until
// integration, when A's real output replaces it.
import type { CoachingResult } from "@/lib/contracts";

export interface RankRep {
  rep_id: string;
  score: number;
  flaw_label: string;
  keypoints_uri?: string | null;
}

export interface RankCost {
  gpu_seconds?: number;
  cpu_seconds?: number;
  workers?: number;
  reps?: number;
  // Phase 4 additions (B-side observability).
  brightdata_requests?: number;
  insforge_rows?: number;
}

export interface RankReport {
  reps: RankRep[];
  worst: string[];
  cost?: RankCost;
}

/** A rep enriched with its cited coaching drill (for the worst reps). */
export type CoachedRep = RankRep & { coaching?: CoachingResult };
export interface CoachedReport {
  reps: CoachedRep[];
  worst: string[];
  cost?: RankCost;
}

export const sampleReport: RankReport = {
  reps: [
    { rep_id: "r1", score: 41, flaw_label: "elbow_flare", keypoints_uri: "echo-runs/r1/keypoints.json" },
    { rep_id: "r2", score: 58, flaw_label: "shallow_dip", keypoints_uri: "echo-runs/r2/keypoints.json" },
    { rep_id: "r3", score: 33, flaw_label: "low_release", keypoints_uri: "echo-runs/r3/keypoints.json" },
    { rep_id: "r4", score: 88, flaw_label: "none", keypoints_uri: "echo-runs/r4/keypoints.json" },
    { rep_id: "r5", score: 47, flaw_label: "wrist_snap", keypoints_uri: "echo-runs/r5/keypoints.json" },
  ],
  // rep_ids ascending by score — worst first.
  worst: ["r3", "r1", "r5", "r2", "r4"],
  cost: {
    gpu_seconds: 18.4,
    cpu_seconds: 0.21,
    workers: 5,
    reps: 5,
    brightdata_requests: 12,
    insforge_rows: 47,
  },
};
