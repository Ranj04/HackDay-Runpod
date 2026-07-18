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
  head: [892, 179],
  leftShoulder: [807, 277],
  rightShoulder: [988, 270],
  leftElbow: [677, 292],
  rightElbow: [1074, 225],
  leftWrist: [570, 346],
  rightWrist: [1084, 139],
  leftHip: [797, 469],
  rightHip: [919, 469],
  leftKnee: [676, 584],
  rightKnee: [1043, 610],
  leftAnkle: [606, 769],
  rightAnkle: [1167, 758],
};

const REFERENCE_POSE: AthletePose = {
  head: [897, 174],
  leftShoulder: [796, 269],
  rightShoulder: [995, 261],
  leftElbow: [666, 281],
  rightElbow: [1082, 217],
  leftWrist: [559, 337],
  rightWrist: [1085, 127],
  leftHip: [789, 460],
  rightHip: [928, 459],
  leftKnee: [668, 579],
  rightKnee: [1052, 602],
  leftAnkle: [599, 764],
  rightAnkle: [1176, 750],
};

const BASEBALL_LOAD_DELTA = {
  head: [10, 10],
  leftShoulder: [20, 15],
  rightShoulder: [-10, 15],
  leftElbow: [90, 35],
  rightElbow: [-40, 35],
  leftWrist: [150, 20],
  rightWrist: [-20, 80],
  leftHip: [20, 22],
  rightHip: [-10, 18],
  leftKnee: [70, -80],
  rightKnee: [-25, -15],
  leftAnkle: [155, -105],
  rightAnkle: [-17, -8],
} as const;

const BASEBALL_RELEASE_DELTA = {
  head: [-25, 8],
  leftShoulder: [-30, 15],
  rightShoulder: [-55, 20],
  leftElbow: [85, 50],
  rightElbow: [-145, -20],
  leftWrist: [150, 40],
  rightWrist: [-270, 40],
  leftHip: [-30, 10],
  rightHip: [-45, 10],
  leftKnee: [-10, 8],
  rightKnee: [-55, 25],
  rightAnkle: [-80, 20],
} as const;

const BASEBALL_REFERENCE_RELEASE_DELTA = {
  rightElbow: [-10, -5],
  rightWrist: [-18, -8],
  leftHip: [-6, -2],
} as const;

const BASEBALL_MOTION: AthleteMotion = {
  id: "baseball-delivery",
  durationMs: 2200,
  holdMs: 650,
  checkpoint: 0.62,
  keyframes: [
    {
      at: 0,
      observedPose: offsetAthletePose(OBSERVED_POSE, BASEBALL_LOAD_DELTA),
      referencePose: offsetAthletePose(REFERENCE_POSE, BASEBALL_LOAD_DELTA),
    },
    {
      at: 0.62,
      observedPose: OBSERVED_POSE,
      referencePose: REFERENCE_POSE,
    },
    {
      at: 1,
      observedPose: offsetAthletePose(
        OBSERVED_POSE,
        BASEBALL_RELEASE_DELTA,
      ),
      referencePose: offsetAthletePose(
        offsetAthletePose(REFERENCE_POSE, BASEBALL_RELEASE_DELTA),
        BASEBALL_REFERENCE_RELEASE_DELTA,
      ),
    },
  ],
};

export function BaseballShowcase({
  compact = false,
  score = 18,
  observed = 5,
  reference = 42,
}: {
  compact?: boolean;
  score?: number;
  observed?: number;
  reference?: number;
}) {
  const sequenceCue =
    Math.abs(reference - observed) <= 9
      ? "Sequence on target"
      : observed < reference
        ? "Front side opening early"
        : "Upper half rotating late";

  return (
    <AthleteFilmRoom
      ariaLabel="Baseball delivery comparison"
      compact={compact}
      cue={sequenceCue}
      focusJoint="leftHip"
      imageDescription="A rendered right-handed pitcher at lead-foot strike with observed and reference pose lines."
      motion={BASEBALL_MOTION}
      observed={observed}
      reference={reference}
      score={score}
      scoreLabel="Form"
      stageLabel="Bullpen 01"
      sport="baseball"
      timeline={{
        start: "Load",
        checkpoint: "Foot strike",
        end: "Release",
        checkpointPercent: 62,
      }}
      viewLabel="Side view"
    />
  );
}
