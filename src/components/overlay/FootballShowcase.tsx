"use client";

import footballThrow from "@/assets/sports/football-throw.webp";

import {
  AthleteFilmRoom,
  type AthletePose,
} from "./AthleteFilmRoom";

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
      image={footballThrow}
      imageDescription="A rendered right-handed quarterback at lead-foot plant with observed and reference pose lines."
      observed={observed}
      observedPose={OBSERVED_POSE}
      reference={reference}
      referencePose={REFERENCE_POSE}
      score={score}
      scoreLabel="Throw"
      stageLabel="Pass 01"
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
