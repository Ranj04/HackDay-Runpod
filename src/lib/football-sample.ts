import {
  AnalysisResultSchema,
  CoachingResultSchema,
  ShotCaptureSchema,
  type Keypoint,
  type PoseFrame,
  type ShotCapture,
} from "@/lib/contracts";
import {
  analyzeFootballThrow,
  coachFootballThrow,
} from "@/lib/analysis/football";

const SCORE = 0.96;
const FRAME_MS = 1000 / 30;

function keypoint(
  name: string,
  x: number,
  y: number,
  z = 0,
): Keypoint {
  return { name, x, y, z, score: SCORE };
}

/**
 * Give a left/right joint pair a known axial orientation. The lead-foot-plant
 * frame uses an 18° shoulder line and a 0° hip line, producing the sample's
 * measured 18° hip–shoulder separation without borrowing basketball footage.
 */
function orientedPair(
  leftName: string,
  rightName: string,
  leftX: number,
  rightX: number,
  y: number,
  angleDegrees: number,
): [Keypoint, Keypoint] {
  const depth = Math.tan((angleDegrees * Math.PI) / 180) * (rightX - leftX);
  return [
    keypoint(leftName, leftX, y, -depth / 2),
    keypoint(rightName, rightX, y, depth / 2),
  ];
}

const shoulderAngles = [3, 5, 8, 12, 18, 24, 28, 30, 27];
const hipAngles = [0, 0, 0, 0, 0, 3, 7, 11, 13];
const ankleStrides = [0.14, 0.18, 0.23, 0.28, 0.34, 0.31, 0.27, 0.22, 0.18];

// Right-handed throwing-arm path: set -> load -> release -> follow-through.
const rightArm = [
  { elbow: [0.58, 0.39], wrist: [0.56, 0.44] },
  { elbow: [0.6, 0.36], wrist: [0.6, 0.37] },
  { elbow: [0.62, 0.31], wrist: [0.61, 0.27] },
  { elbow: [0.64, 0.29], wrist: [0.65, 0.23] },
  { elbow: [0.66, 0.3], wrist: [0.7, 0.25] },
  { elbow: [0.69, 0.32], wrist: [0.77, 0.29] },
  { elbow: [0.67, 0.37], wrist: [0.76, 0.39] },
  { elbow: [0.61, 0.43], wrist: [0.66, 0.5] },
  { elbow: [0.57, 0.45], wrist: [0.55, 0.52] },
] as const;

function sampleFrame(index: number): PoseFrame {
  const shoulder = orientedPair(
    "left_shoulder",
    "right_shoulder",
    0.43,
    0.55,
    0.34,
    shoulderAngles[index],
  );
  const hips = orientedPair(
    "left_hip",
    "right_hip",
    0.45,
    0.55,
    0.59,
    hipAngles[index],
  );
  const stride = ankleStrides[index];
  const arm = rightArm[index];
  const leadAnkleX = 0.5 + stride * 0.58;
  const trailAnkleX = 0.5 - stride * 0.42;

  return {
    t: Math.round(index * FRAME_MS),
    keypoints: [
      keypoint("nose", 0.5, 0.2),
      ...shoulder,
      keypoint("left_elbow", 0.39 - index * 0.004, 0.4),
      keypoint("left_wrist", 0.36 - index * 0.004, 0.46),
      keypoint("right_elbow", arm.elbow[0], arm.elbow[1]),
      keypoint("right_wrist", arm.wrist[0], arm.wrist[1]),
      ...hips,
      keypoint("left_knee", 0.5 + stride * 0.34, 0.74),
      keypoint("left_ankle", leadAnkleX, 0.9),
      keypoint("right_knee", 0.5 - stride * 0.22, 0.75),
      keypoint("right_ankle", trailAnkleX, 0.9),
    ],
  };
}

/** Dedicated synthetic quarterback throw used only as a transparent UI sample. */
export const footballSampleCapture: ShotCapture = ShotCaptureSchema.parse({
  id: "football-quarterback-synthetic-sample",
  frames: shoulderAngles.map((_, index) => sampleFrame(index)),
  fps: 30,
  view: "side",
});

/** Sample values are derived by the production analyzer, never hard-coded. */
export const footballSampleAnalysis = AnalysisResultSchema.parse(
  analyzeFootballThrow(footballSampleCapture),
);

export const footballSampleCoaching = CoachingResultSchema.parse(
  coachFootballThrow(footballSampleAnalysis.topFlaw),
);
