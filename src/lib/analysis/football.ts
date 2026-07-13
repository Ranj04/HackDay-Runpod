import {
  AnalysisResultSchema,
  CoachingResultSchema,
  ShotCaptureSchema,
  type AnalysisResult,
  type CoachingResult,
  type Flaw,
  type Keypoint,
  type PoseFrame,
  type ShotCapture,
} from "@/lib/contracts";

/**
 * Echo's selected quarterback reference checkpoint, measured at lead-foot
 * plant. This is a comparison target for the product demo, not a universal
 * biomechanical ideal or an injury-risk threshold.
 */
export const FOOTBALL_REFERENCE_SEPARATION = 32;

const TARGET_TOLERANCE = 7;
const HIGH_SEVERITY_GAP = 18;
const SCORE_PENALTY_PER_DEGREE = 2.15;
const MIN_KEYPOINT_SCORE = 0.45;

const SOURCE_URL = "https://doi.org/10.1123/jab.12.2.207";
const SOURCE_TITLE =
  "Fleisig et al. (1996) — Kinematic and Kinetic Comparison between Baseball Pitching and Football Passing";

function point(frame: PoseFrame, name: string): Keypoint | undefined {
  const found = frame.keypoints.find((keypoint) => keypoint.name === name);
  return found && found.score >= MIN_KEYPOINT_SCORE ? found : undefined;
}

/**
 * Orientation of a left/right body segment. MediaPipe supplies relative depth,
 * so prefer the x/z plane when it is present; RTMPose supplies 2D keypoints, so
 * fall back to the image plane. Either way this remains a directional camera-
 * dependent signal rather than a lab-grade joint measurement.
 */
function segmentAngle(a: Keypoint, b: Keypoint): number {
  const orthogonal =
    typeof a.z === "number" && typeof b.z === "number" ? b.z - a.z : b.y - a.y;
  return (Math.atan2(orthogonal, b.x - a.x) * 180) / Math.PI;
}

function angleDifference(a: number, b: number): number {
  const wrapped = Math.abs(a - b) % 180;
  return Math.min(wrapped, 180 - wrapped);
}

/**
 * Lead-foot plant is approximated as the largest visible ankle separation in
 * the central delivery window. The selected frame must also contain confident
 * shoulder and hip pairs so the sequencing checkpoint can actually be read.
 */
function leadFootPlantFrame(capture: ShotCapture): PoseFrame {
  const start = Math.floor(capture.frames.length * 0.2);
  const end = Math.max(start + 1, Math.ceil(capture.frames.length * 0.9));
  let best: { frame: PoseFrame; stride: number } | null = null;

  for (let index = start; index < end; index += 1) {
    const frame = capture.frames[index];
    const leftShoulder = point(frame, "left_shoulder");
    const rightShoulder = point(frame, "right_shoulder");
    const leftHip = point(frame, "left_hip");
    const rightHip = point(frame, "right_hip");
    const leftAnkle = point(frame, "left_ankle");
    const rightAnkle = point(frame, "right_ankle");

    if (
      !leftShoulder ||
      !rightShoulder ||
      !leftHip ||
      !rightHip ||
      !leftAnkle ||
      !rightAnkle
    ) {
      continue;
    }

    const stride = Math.abs(leftAnkle.x - rightAnkle.x);
    if (!best || stride > best.stride) {
      best = { frame, stride };
    }
  }

  if (!best) {
    throw new Error(
      "Echo could not find a complete quarterback throwing pose. Keep both shoulders, hips, and feet visible in a steady side view.",
    );
  }

  return best.frame;
}

/**
 * Compare one quarterback throw with Echo's selected lead-foot-plant reference.
 * The score expresses closeness to that single sequencing checkpoint only; it
 * does not grade velocity, accuracy, spiral, or injury risk.
 */
export function analyzeFootballThrow(capture: ShotCapture): AnalysisResult {
  const parsed = ShotCaptureSchema.parse(capture);
  const frame = leadFootPlantFrame(parsed);
  const leftShoulder = point(frame, "left_shoulder")!;
  const rightShoulder = point(frame, "right_shoulder")!;
  const leftHip = point(frame, "left_hip")!;
  const rightHip = point(frame, "right_hip")!;

  const observed = Math.round(
    angleDifference(
      segmentAngle(leftShoulder, rightShoulder),
      segmentAngle(leftHip, rightHip),
    ),
  );
  const gap = Math.abs(FOOTBALL_REFERENCE_SEPARATION - observed);
  const inTarget = gap <= TARGET_TOLERANCE;

  const flaw: Flaw = {
    id: inTarget
      ? "football_sequence_on_target"
      : observed < FOOTBALL_REFERENCE_SEPARATION
        ? "football_upper_body_early"
        : "football_upper_body_late",
    label: inTarget
      ? "Throwing sequence matches the selected reference"
      : observed < FOOTBALL_REFERENCE_SEPARATION
        ? "Upper body opening early at lead-foot plant"
        : "Upper body staying closed past lead-foot plant",
    severity: inTarget ? "low" : gap >= HIGH_SEVERITY_GAP ? "high" : "med",
    metric: "hipShoulderSeparation",
    observed,
    reference: FOOTBALL_REFERENCE_SEPARATION,
    direction:
      observed <= FOOTBALL_REFERENCE_SEPARATION ? "too_low" : "too_high",
  };

  return AnalysisResultSchema.parse({
    capture: parsed,
    metrics: {
      releaseElbowAngle: null,
      // This analysis identifies lead-foot plant, not ball release. Keep the
      // basketball-named release index empty rather than mislabel the checkpoint.
      releaseFrameIndex: null,
      kneeFlexionAtDip: null,
      wristSnapTiming: null,
      guideHandPresence: null,
      releaseHeight: null,
    },
    topFlaw: flaw,
    allFlaws: [flaw],
    score: Math.max(
      0,
      Math.min(100, Math.round(100 - gap * SCORE_PENALTY_PER_DEGREE)),
    ),
    // A football-specific visual reference is intentionally separate from the
    // basketball echo. The metric still compares with the documented 32° target.
    echoRef: [],
  });
}

/** Deterministic football coaching with a stable, explicit source citation. */
export function coachFootballThrow(flaw: Flaw): CoachingResult {
  const source = {
    sourceUrl: SOURCE_URL,
    sourceTitle: SOURCE_TITLE,
  };

  if (flaw.id === "football_upper_body_late") {
    return CoachingResultSchema.parse({
      flawId: flaw.id,
      summary:
        "At lead-foot plant, your shoulders remain farther behind your hips than Echo's selected 32° reference. Let the chest begin following the lower half as the front foot accepts your weight so the arm does not have to catch up late.",
      drill: {
        title: "Plant-to-rotation rhythm drill",
        steps: [
          "Start in a compact throwing stance with the ball at your chest.",
          "Take a controlled lead step and pause as the front foot plants.",
          "From the pause, let the chest follow the hips and finish an easy throw.",
          "Repeat 3 sets of 6 at comfortable effort, then remove the pause while keeping the same order.",
        ],
        ...source,
      },
      references: [{ title: SOURCE_TITLE, url: SOURCE_URL }],
    });
  }

  if (flaw.id === "football_sequence_on_target") {
    return CoachingResultSchema.parse({
      flawId: flaw.id,
      summary:
        "Your hip-to-shoulder sequence at lead-foot plant is inside Echo's selected reference window. Preserve that order as effort increases instead of forcing additional separation.",
      drill: {
        title: "Tempo-preservation throws",
        steps: [
          "Make three slow shadow throws and feel the front foot stabilize before the chest follows.",
          "Throw 6 easy passes while preserving the same lower-half-first rhythm.",
          "Add a small amount of pace for another 6 throws without lengthening the stride.",
          "Stop the set if the sequence becomes rushed and reset at the slower tempo.",
        ],
        ...source,
      },
      references: [{ title: SOURCE_TITLE, url: SOURCE_URL }],
    });
  }

  return CoachingResultSchema.parse({
    flawId: flaw.id,
    summary:
      "At lead-foot plant, your shoulders have already followed your hips more closely than Echo's selected 32° reference. Keep the chest quiet for one beat as the front foot lands, then rotate through the throw instead of opening everything together.",
    drill: {
      title: "Stride-and-hold sequencing drill",
      steps: [
        "Begin in your normal throwing stance with a relaxed grip.",
        "Take a controlled lead step while keeping the chest quiet.",
        "Pause at lead-foot plant and check that the hips have begun leading the shoulders.",
        "Complete 3 sets of 6 smooth throws, gradually shortening the pause without changing the order.",
      ],
      ...source,
    },
    references: [{ title: SOURCE_TITLE, url: SOURCE_URL }],
  });
}
