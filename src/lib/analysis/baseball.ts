import type {
  AnalysisResult,
  CoachingResult,
  Flaw,
  Keypoint,
  PoseFrame,
  ShotCapture,
} from "@/lib/contracts";

const REFERENCE_SEPARATION = 42;
const BEGINNER_SCORE_CAP = 18;
const SOURCE_URL = "https://www.mlb.com/pitch-smart";
const SOURCE_TITLE = "MLB Pitch Smart — Safe Pitching Guidance";

function point(frame: PoseFrame, name: string): Keypoint | undefined {
  const found = frame.keypoints.find((keypoint) => keypoint.name === name);
  return found && found.score >= 0.45 ? found : undefined;
}

function segmentAngle(a: Keypoint, b: Keypoint): number {
  // MediaPipe z gives axial depth. Use x/z when both points have depth, with an
  // x/y fallback for older fixtures that only carry 2D landmarks.
  const vertical =
    typeof a.z === "number" && typeof b.z === "number" ? b.z - a.z : b.y - a.y;
  return (Math.atan2(vertical, b.x - a.x) * 180) / Math.PI;
}

function angleDifference(a: number, b: number): number {
  const wrapped = Math.abs(a - b) % 180;
  return Math.min(wrapped, 180 - wrapped);
}

function footStrikeFrame(capture: ShotCapture): {
  frame: PoseFrame;
  index: number;
} {
  const start = Math.floor(capture.frames.length * 0.25);
  const end = Math.max(start + 1, Math.ceil(capture.frames.length * 0.9));
  let best: { frame: PoseFrame; index: number; stride: number } | null = null;

  for (let index = start; index < end; index += 1) {
    const frame = capture.frames[index];
    const leftShoulder = point(frame, "left_shoulder");
    const rightShoulder = point(frame, "right_shoulder");
    const leftHip = point(frame, "left_hip");
    const rightHip = point(frame, "right_hip");
    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) continue;

    const leftAnkle = point(frame, "left_ankle");
    const rightAnkle = point(frame, "right_ankle");
    const stride =
      leftAnkle && rightAnkle ? Math.abs(leftAnkle.x - rightAnkle.x) : 0;
    if (!best || stride > best.stride) best = { frame, index, stride };
  }

  if (!best) {
    throw new Error(
      "Echo could not find a complete pitching pose. Keep your shoulders, hips, and legs visible from the side.",
    );
  }
  return best;
}

export function analyzeBaseballPitch(capture: ShotCapture): AnalysisResult {
  const { frame, index } = footStrikeFrame(capture);
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
  const gap = Math.abs(REFERENCE_SEPARATION - observed);
  const inTarget = observed >= 34 && observed <= 52;
  const flaw: Flaw = {
    id: inTarget
      ? "pitch_sequence_on_target"
      : observed < REFERENCE_SEPARATION
        ? "early_front_side"
        : "late_upper_half",
    label: inTarget
      ? "Delivery sequencing is on target"
      : observed < REFERENCE_SEPARATION
        ? "Front side opening early"
        : "Upper half staying closed too long",
    severity: inTarget ? "low" : gap >= 20 ? "high" : "med",
    metric: "hipShoulderSeparation",
    observed,
    reference: REFERENCE_SEPARATION,
    direction: observed <= REFERENCE_SEPARATION ? "too_low" : "too_high",
  };

  return {
    capture,
    metrics: {
      releaseElbowAngle: null,
      releaseFrameIndex: index,
      kneeFlexionAtDip: null,
      wristSnapTiming: null,
      guideHandPresence: null,
      releaseHeight: null,
    },
    topFlaw: flaw,
    allFlaws: [flaw],
    // Baseball is currently a beginner demonstration. Keep its presentation
    // score below 20 without changing basketball's independently calibrated score.
    score: Math.min(
      BEGINNER_SCORE_CAP,
      Math.max(0, Math.min(100, Math.round(100 - gap * 2.2))),
    ),
    echoRef: [],
  };
}

export function coachBaseballPitch(flaw: Flaw): CoachingResult {
  const common = {
    sourceUrl: SOURCE_URL,
    sourceTitle: SOURCE_TITLE,
  };

  if (flaw.id === "late_upper_half") {
    return {
      flawId: flaw.id,
      summary:
        "Your lower half gets well ahead, but the upper body stays closed past the strongest rotation window. Let the chest follow the hips sooner after foot strike so the arm does not have to catch up late.",
      drill: {
        title: "Step-behind sequencing drill",
        steps: [
          "Begin sideways with your feet close together and the ball at your chest.",
          "Use a small step-behind to start the hips moving toward the target.",
          "Land softly, then let the chest rotate as the throwing arm comes through.",
          "Make 3 sets of 6 throws at comfortable effort, prioritizing smooth timing.",
        ],
        ...common,
      },
      references: [{ title: SOURCE_TITLE, url: SOURCE_URL }],
    };
  }

  if (flaw.id === "pitch_sequence_on_target") {
    return {
      flawId: flaw.id,
      summary:
        "Your hips lead and your shoulders follow inside the target window at foot strike. Keep that same tempo as intensity rises instead of chasing more separation.",
      drill: {
        title: "Tempo hold-and-throw",
        steps: [
          "Move through your delivery at half speed without a ball.",
          "Pause briefly at foot strike and feel the hips leading the chest.",
          "Repeat the motion without the pause, preserving the same order.",
          "Finish with 8 easy throws before building intensity.",
        ],
        ...common,
      },
      references: [{ title: SOURCE_TITLE, url: SOURCE_URL }],
    };
  }

  return {
    flawId: flaw.id,
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
      ...common,
    },
    references: [{ title: SOURCE_TITLE, url: SOURCE_URL }],
  };
}
