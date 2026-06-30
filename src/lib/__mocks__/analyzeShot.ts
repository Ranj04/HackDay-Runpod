import {
  AnalysisResultSchema,
  CoachingResultSchema,
  type AnalyzeShot,
  type CoachFlaw,
  type PoseFrame,
  type ShotCapture,
} from "@/lib/contracts";

const athleteFrames: PoseFrame[] = [
  {
    t: 0,
    keypoints: [
      { name: "shoulder", x: 0.46, y: 0.33, score: 0.98 },
      { name: "elbow", x: 0.55, y: 0.47, score: 0.97 },
      { name: "wrist", x: 0.61, y: 0.38, score: 0.96 },
      { name: "hip", x: 0.48, y: 0.61, score: 0.98 },
      { name: "knee", x: 0.56, y: 0.76, score: 0.96 },
      { name: "ankle", x: 0.51, y: 0.93, score: 0.95 },
    ],
  },
  {
    t: 33,
    keypoints: [
      { name: "shoulder", x: 0.47, y: 0.31, score: 0.98 },
      { name: "elbow", x: 0.61, y: 0.34, score: 0.98 },
      { name: "wrist", x: 0.6, y: 0.2, score: 0.97 },
      { name: "hip", x: 0.49, y: 0.59, score: 0.98 },
      { name: "knee", x: 0.55, y: 0.75, score: 0.97 },
      { name: "ankle", x: 0.51, y: 0.93, score: 0.96 },
    ],
  },
  {
    t: 66,
    keypoints: [
      { name: "shoulder", x: 0.48, y: 0.29, score: 0.98 },
      { name: "elbow", x: 0.64, y: 0.22, score: 0.98 },
      { name: "wrist", x: 0.6, y: 0.08, score: 0.97 },
      { name: "hip", x: 0.5, y: 0.57, score: 0.98 },
      { name: "knee", x: 0.53, y: 0.72, score: 0.96 },
      { name: "ankle", x: 0.52, y: 0.92, score: 0.96 },
    ],
  },
];

const ghostFrames: PoseFrame[] = athleteFrames.map((frame) => ({
  ...frame,
  keypoints: frame.keypoints.map((point) =>
    point.name === "elbow"
      ? { ...point, x: Math.max(0, point.x - 0.07) }
      : point,
  ),
}));

export const mockShotCapture: ShotCapture = {
  id: "mock-shot-001",
  frames: athleteFrames,
  fps: 30,
  view: "side",
};

export const analyzeShot: AnalyzeShot = async (capture) =>
  AnalysisResultSchema.parse({
    capture,
    metrics: {
      releaseElbowAngle: 142,
      releaseFrameIndex: 2,
      kneeFlexionAtDip: 108,
      wristSnapTiming: 66,
      guideHandPresence: 0.84,
      releaseHeight: 0.79,
    },
    topFlaw: {
      id: "elbow-flare",
      label: "Shooting elbow flares outward",
      severity: "med",
      metric: "releaseElbowAngle",
      observed: 142,
      reference: 158,
      direction: "too_low",
    },
    allFlaws: [
      {
        id: "elbow-flare",
        label: "Shooting elbow flares outward",
        severity: "med",
        metric: "releaseElbowAngle",
        observed: 142,
        reference: 158,
        direction: "too_low",
      },
    ],
    score: 78,
    ghostRef: ghostFrames,
  });
export const coachFlaw: CoachFlaw = async (flaw) =>
  CoachingResultSchema.parse({
    flawId: flaw.id,
    summary:
      "Keep your shooting elbow stacked beneath the ball through the lift. A straighter power line reduces sideways force at release.",
    drill: {
      title: "Wall-alignment form shooting",
      steps: [
        "Stand one arm’s length from a wall with your shooting side facing it.",
        "Lift into your set point without letting your elbow touch or drift into the wall.",
        "Finish with a relaxed wrist, then repeat for 3 sets of 10 before moving to the basket.",
      ],
      sourceUrl: "https://www.usab.com/play/player-development",
      sourceTitle: "USA Basketball Player Development",
    },
    references: [
      {
        title: "USA Basketball Player Development",
        url: "https://www.usab.com/play/player-development",
      },
    ],
  });
