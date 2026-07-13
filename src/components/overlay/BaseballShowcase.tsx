"use client";

import baseballDelivery from "@/assets/sports/baseball-delivery.webp";

import {
  AthleteFilmRoom,
  type AthletePose,
} from "./AthleteFilmRoom";

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

export function BaseballShowcase({
  compact = false,
  score = 68,
  observed = 28,
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
      image={baseballDelivery}
      imageDescription="A rendered right-handed pitcher at lead-foot strike with observed and reference pose lines."
      observed={observed}
      observedPose={OBSERVED_POSE}
      reference={reference}
      referencePose={REFERENCE_POSE}
      score={score}
      scoreLabel="Form"
      stageLabel="Bullpen 01"
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
