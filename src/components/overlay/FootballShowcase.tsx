"use client";

import {
  AthleteFilmRoom,
  type AthletePose,
} from "./AthleteFilmRoom";
import {
  offsetAthletePose,
  type AthleteMotion,
} from "./athlete-motion";

const OBSERVED_POSE: AthletePose = {
  head: [830, 242],
  leftShoulder: [793, 323],
  rightShoulder: [904, 319],
  leftElbow: [774, 407],
  rightElbow: [953, 301],
  leftWrist: [706, 366],
  rightWrist: [978, 250],
  leftHip: [823, 505],
  rightHip: [901, 510],
  leftKnee: [723, 619],
  rightKnee: [985, 641],
  leftAnkle: [681, 795],
  rightAnkle: [1081, 798],
};

const REFERENCE_POSE: AthletePose = {
  head: [835, 237],
  leftShoulder: [782, 316],
  rightShoulder: [910, 309],
  leftElbow: [763, 397],
  rightElbow: [960, 291],
  leftWrist: [696, 356],
  rightWrist: [984, 240],
  leftHip: [815, 497],
  rightHip: [910, 501],
  leftKnee: [714, 612],
  rightKnee: [994, 632],
  leftAnkle: [674, 788],
  rightAnkle: [1090, 789],
};

const FOOTBALL_SET_DELTA = {
  head: [10, 10],
  leftShoulder: [10, 13],
  rightShoulder: [10, 13],
  leftElbow: [20, -5],
  rightElbow: [-10, 45],
  leftWrist: [70, 10],
  rightWrist: [-25, 75],
  leftHip: [15, 18],
  rightHip: [10, 18],
  leftKnee: [75, -35],
  rightKnee: [-20, -15],
  leftAnkle: [110, -40],
  rightAnkle: [-21, -8],
} as const;

const FOOTBALL_RELEASE_DELTA = {
  head: [-20, 4],
  leftShoulder: [-15, 4],
  rightShoulder: [-10, 5],
  leftElbow: [25, -25],
  rightElbow: [-85, -18],
  leftWrist: [75, 25],
  rightWrist: [-180, -15],
  leftHip: [-30, 8],
  rightHip: [-30, 8],
  leftKnee: [-15, 6],
  rightKnee: [-35, 9],
  rightAnkle: [-36, 8],
} as const;

const FOOTBALL_REFERENCE_RELEASE_DELTA = {
  leftShoulder: [-8, -5],
  rightElbow: [-10, -5],
  rightWrist: [-18, -8],
} as const;

const FOOTBALL_MOTION: AthleteMotion = {
  id: "football-throw",
  durationMs: 2000,
  holdMs: 650,
  checkpoint: 0.58,
  keyframes: [
    {
      at: 0,
      observedPose: offsetAthletePose(OBSERVED_POSE, FOOTBALL_SET_DELTA),
      referencePose: offsetAthletePose(REFERENCE_POSE, FOOTBALL_SET_DELTA),
    },
    {
      at: 0.58,
      observedPose: OBSERVED_POSE,
      referencePose: REFERENCE_POSE,
    },
    {
      at: 1,
      observedPose: offsetAthletePose(
        OBSERVED_POSE,
        FOOTBALL_RELEASE_DELTA,
      ),
      referencePose: offsetAthletePose(
        offsetAthletePose(REFERENCE_POSE, FOOTBALL_RELEASE_DELTA),
        FOOTBALL_REFERENCE_RELEASE_DELTA,
      ),
    },
  ],
};

export function FootballShowcase({
  compact = false,
  score = 70,
  observed = 18,
  reference = 32,
}: {
  compact?: boolean;
  score?: number;
  observed?: number;
  reference?: number;
}) {
  const sequenceCue =
    Math.abs(reference - observed) <= 7
      ? "Sequence on target"
      : observed < reference
        ? "Front shoulder early"
        : "Chest rotation late";

  return (
    <AthleteFilmRoom
      ariaLabel="Football quarterback throwing comparison"
      compact={compact}
      cue={sequenceCue}
      focusJoint="leftShoulder"
      imageDescription="A rendered right-handed quarterback at lead-foot plant with observed and reference pose lines."
      motion={FOOTBALL_MOTION}
      observed={observed}
      reference={reference}
      score={score}
      scoreLabel="Throw"
      stageLabel="Pass 01"
      sport="football"
      timeline={{
        start: "Set",
        checkpoint: "Foot plant",
        end: "Release",
        checkpointPercent: 58,
      }}
      viewLabel="Throwing-side view"
    />
  );
}
