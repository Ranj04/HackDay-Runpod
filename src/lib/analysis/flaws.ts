// Flaw detection + form scoring against the reference metrics.
//
// Each tracked metric has a reference band (tolerance). A user metric outside its
// band is a flaw; severity scales with how many bands out it sits. Both the flaw
// ranking and the 0-100 score come from the same transparent distance rubric.
import type { Flaw, FlawDirection, JointMetrics, Severity } from "../contracts";

interface MetricSpec {
  /** JointMetrics key this spec reads. */
  key: keyof JointMetrics;
  flawId: string;
  label: string;
  /** Tolerance (metric units) around the reference value before it's a flaw. */
  band: number;
  /** Relative importance in the overall score. */
  weight: number;
  /** Direction label when observed is above / below the reference. */
  dirHigh: FlawDirection;
  dirLow: FlawDirection;
}

// Bands/weights are tuned against the curated reference (see reference.ts).
const METRIC_SPECS: MetricSpec[] = [
  { key: "releaseElbowAngle", flawId: "elbow_flare", label: "Elbow flaring out at release", band: 10, weight: 1.0, dirHigh: "too_high", dirLow: "too_low" },
  { key: "kneeFlexionAtDip", flawId: "shallow_dip", label: "Shallow leg dip — not enough bend", band: 12, weight: 0.7, dirHigh: "too_high", dirLow: "too_low" },
  { key: "wristSnapTiming", flawId: "wrist_snap", label: "Wrist snap timing off", band: 80, weight: 0.5, dirHigh: "late", dirLow: "early" },
  { key: "guideHandPresence", flawId: "guide_hand", label: "Guide hand interfering at release", band: 0.25, weight: 0.6, dirHigh: "too_high", dirLow: "too_low" },
  { key: "releaseHeight", flawId: "low_release", label: "Release point too low", band: 0.1, weight: 0.5, dirHigh: "too_high", dirLow: "too_low" },
];

// How many bands out before a metric is fully penalized in the score.
const MAX_BANDS = 5;

function severityFromRatio(ratio: number): Severity {
  if (ratio <= 2) return "low";
  if (ratio <= 4) return "med";
  return "high";
}

interface Candidate {
  flaw: Flaw;
  ratio: number;
  weightedPenalty: number;
  weight: number;
}

function evaluate(spec: MetricSpec, metrics: JointMetrics, reference: JointMetrics): Candidate | null {
  const observed = metrics[spec.key];
  const ref = reference[spec.key];
  if (observed == null || ref == null) return null;
  const dev = observed - ref;
  const ratio = Math.abs(dev) / spec.band; // 1 = right at the band edge
  const flaw: Flaw = {
    id: spec.flawId,
    label: spec.label,
    severity: severityFromRatio(ratio),
    metric: spec.key,
    observed: Math.round(observed * 100) / 100,
    reference: Math.round(ref * 100) / 100,
    direction: dev >= 0 ? spec.dirHigh : spec.dirLow,
  };
  return {
    flaw,
    ratio,
    weight: spec.weight,
    weightedPenalty: spec.weight * Math.min(1, ratio / MAX_BANDS),
  };
}

export interface FlawResult {
  topFlaw: Flaw;
  allFlaws: Flaw[];
}

/**
 * Compare user metrics to the reference. Flaws are metrics beyond their band,
 * sorted worst-first. `topFlaw` is always the single largest deviation (even on a
 * clean shot, so the contract's required topFlaw is satisfied).
 */
export function detectFlaws(metrics: JointMetrics, reference: JointMetrics): FlawResult {
  const candidates = METRIC_SPECS.map((s) => evaluate(s, metrics, reference)).filter(
    (c): c is Candidate => c !== null,
  );
  if (candidates.length === 0) {
    // No comparable metrics — return a benign placeholder flaw.
    return {
      topFlaw: { id: "none", label: "No measurable flaw", severity: "low", metric: "none", observed: 0, reference: 0, direction: "too_high" },
      allFlaws: [],
    };
  }
  candidates.sort((a, b) => b.ratio - a.ratio);
  const allFlaws = candidates.filter((c) => c.ratio > 1).map((c) => c.flaw);
  return { topFlaw: candidates[0].flaw, allFlaws };
}

/**
 * Transparent 0-100 form score. Penalty per metric = weight × min(1, ratio/MAX_BANDS),
 * where ratio = |observed − reference| / band. Score = 100 × (1 − Σpenalty / Σweight).
 */
export function scoreForm(metrics: JointMetrics, reference: JointMetrics): number {
  const candidates = METRIC_SPECS.map((s) => evaluate(s, metrics, reference)).filter(
    (c): c is Candidate => c !== null,
  );
  if (candidates.length === 0) return 0;
  const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);
  const totalPenalty = candidates.reduce((s, c) => s + c.weightedPenalty, 0);
  return Math.round(100 * (1 - totalPenalty / totalWeight));
}
