import type { AnalysisResult, CoachingResult } from "@/lib/contracts";
import { mockShotCapture } from "@/lib/sample-shot";

export const baseballSampleAnalysis: AnalysisResult = {
  capture: { ...mockShotCapture, id: "baseball-pitch-sample" },
  metrics: {
    releaseElbowAngle: 82,
    releaseFrameIndex: 18,
    kneeFlexionAtDip: null,
    wristSnapTiming: null,
    guideHandPresence: null,
    releaseHeight: null,
  },
  topFlaw: {
    id: "early_front_side",
    label: "Front side opening early",
    severity: "high",
    metric: "hipShoulderSeparation",
    observed: 5,
    reference: 42,
    direction: "too_low",
  },
  allFlaws: [],
  score: 18,
  echoRef: [],
};

export const baseballSampleCoaching: CoachingResult = {
  flawId: "early_front_side",
  summary:
    "Your shoulders begin rotating before the lead foot is fully planted, trimming the separation between your hips and upper body. Keep the glove side closed a beat longer so the lower half can lead the delivery.",
  drill: {
    title: "Stride-and-hold separation drill",
    steps: [
      "Start in your normal set position without a ball.",
      "Stride to a balanced landing while keeping your chest and glove shoulder closed.",
      "Pause at foot strike and check that your belt buckle has started forward before your chest opens.",
      "Complete 3 sets of 6 controlled reps, then blend the same sequence into easy catch play.",
    ],
    sourceUrl: "https://www.mlb.com/pitch-smart",
    sourceTitle: "MLB Pitch Smart — Safe Pitching Guidance",
  },
  references: [
    {
      title: "MLB Pitch Smart — Safe Pitching Guidance",
      url: "https://www.mlb.com/pitch-smart",
    },
  ],
};
