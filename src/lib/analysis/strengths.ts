import type { AnalysisResult, JointMetrics } from "../contracts";

export interface StrengthReason {
  id: string;
  title: string;
  detail: string;
}

type ScoredMetric = Exclude<keyof JointMetrics, "releaseFrameIndex">;

const BASKETBALL_STRENGTHS: ReadonlyArray<
  StrengthReason & { metric: ScoredMetric }
> = [
  {
    id: "release-alignment",
    metric: "releaseElbowAngle",
    title: "Clean release alignment",
    detail:
      "Your elbow angle stayed inside the reference tolerance at release, supporting a straighter ball path.",
  },
  {
    id: "lower-body-load",
    metric: "kneeFlexionAtDip",
    title: "Balanced lower-body load",
    detail:
      "Your knee bend stayed near the target range, giving the shot a stable power base.",
  },
  {
    id: "wrist-timing",
    metric: "wristSnapTiming",
    title: "Well-timed wrist snap",
    detail:
      "Your wrist action landed inside the target timing window for a smooth follow-through.",
  },
  {
    id: "guide-hand-control",
    metric: "guideHandPresence",
    title: "Quiet guide hand",
    detail:
      "Your guide hand stayed within the reference range, limiting side-to-side interference.",
  },
  {
    id: "release-point",
    metric: "releaseHeight",
    title: "Strong release point",
    detail:
      "Your release height stayed close to the reference, creating good lift and clearance.",
  },
];

const GENERAL_STRENGTHS: readonly StrengthReason[] = [
  {
    id: "coordinated-motion",
    title: "Coordinated motion",
    detail:
      "The tracked checkpoints combined into a strong movement pattern from the load through release.",
  },
  {
    id: "repeatable-sequence",
    title: "Repeatable sequence",
    detail:
      "Your shot maintained a consistent order of movement, which makes the form easier to repeat.",
  },
  {
    id: "efficient-rep",
    title: "Efficient overall rep",
    detail:
      "The captured motion stayed organized enough to produce a score above 80 with only focused refinements left.",
  },
];

function baseballStrengths(analysis: AnalysisResult): StrengthReason[] {
  const gap = Math.round(
    Math.abs(analysis.topFlaw.reference - analysis.topFlaw.observed),
  );

  return [
    {
      id: "pitch-separation",
      title: "Strong hip–shoulder separation",
      detail: `Your delivery finished ${gap}° from the reference at foot strike, keeping the sequence in a strong window.`,
    },
    {
      id: "lower-half-lead",
      title: "Lower half leads",
      detail:
        "Your hips initiate the delivery before the shoulders follow, helping transfer force efficiently.",
    },
    {
      id: "delivery-tempo",
      title: "Repeatable delivery tempo",
      detail:
        "The throwing sequence stays connected through foot strike instead of relying on a late upper-body correction.",
    },
  ];
}

/** Explain a score above 80 using measured, on-target checkpoints when possible. */
export function explainStrongScore(
  analysis: AnalysisResult,
): StrengthReason[] {
  if (analysis.score <= 80) return [];

  if (analysis.topFlaw.metric === "hipShoulderSeparation") {
    return baseballStrengths(analysis);
  }

  const flawMetrics = new Set(analysis.allFlaws.map((flaw) => flaw.metric));
  const strengths = BASKETBALL_STRENGTHS.flatMap(
    ({ metric, ...reason }) =>
      analysis.metrics[metric] != null && !flawMetrics.has(metric)
        ? [reason]
        : [],
  );

  for (const fallback of GENERAL_STRENGTHS) {
    if (strengths.length >= 3) break;
    strengths.push(fallback);
  }

  return strengths.slice(0, 3);
}
