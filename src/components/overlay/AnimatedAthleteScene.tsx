"use client";

import { useId } from "react";

import type { AthletePose } from "./athlete-motion";

export type AnimatedSport = "basketball" | "baseball" | "football";

type Point = readonly [number, number];

interface AnimatedAthleteSceneProps {
  checkpoint: number;
  pose: AthletePose;
  progress: number;
  releasePose: AthletePose;
  sport: AnimatedSport;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function mix(start: Point, end: Point, amount: number): Point {
  return [
    start[0] + (end[0] - start[0]) * amount,
    start[1] + (end[1] - start[1]) * amount,
  ];
}

function midpoint(start: Point, end: Point): Point {
  return mix(start, end, 0.5);
}

function quadratic(start: Point, control: Point, end: Point, amount: number): Point {
  const inverse = 1 - amount;
  return [
    inverse * inverse * start[0] +
      2 * inverse * amount * control[0] +
      amount * amount * end[0],
    inverse * inverse * start[1] +
      2 * inverse * amount * control[1] +
      amount * amount * end[1],
  ];
}

function Limb({
  end,
  gradient,
  start,
  width,
}: {
  end: Point;
  gradient: string;
  start: Point;
  width: number;
}) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.max(1, Math.hypot(dx, dy));
  const normalX = (-dy / length) * Math.max(2, width * 0.08);
  const normalY = (dx / length) * Math.max(2, width * 0.08);

  return (
    <g>
      <line
        opacity="0.76"
        stroke="#020712"
        strokeLinecap="round"
        strokeWidth={width + 12}
        x1={start[0] + 4}
        x2={end[0] + 4}
        y1={start[1] + 8}
        y2={end[1] + 8}
      />
      <line
        stroke={`url(#${gradient})`}
        strokeLinecap="round"
        strokeWidth={width}
        x1={start[0]}
        x2={end[0]}
        y1={start[1]}
        y2={end[1]}
      />
      <line
        opacity="0.34"
        stroke="#fff2df"
        strokeLinecap="round"
        strokeWidth={Math.max(4, width * 0.13)}
        x1={start[0] + normalX}
        x2={end[0] + normalX}
        y1={start[1] + normalY}
        y2={end[1] + normalY}
      />
    </g>
  );
}

function Shoe({ point, side }: { point: Point; side: "left" | "right" }) {
  const direction = side === "left" ? -1 : 1;
  return (
    <g
      transform={`translate(${point[0] + direction * 5} ${point[1] + 9}) rotate(${direction * 7})`}
    >
      <path
        d={
          side === "left"
            ? "M 18 -10 C 5 -13 -26 -8 -38 4 C -41 10 -33 15 -21 15 L 25 15 C 34 13 34 5 27 0 Z"
            : "M -18 -10 C -5 -13 26 -8 38 4 C 41 10 33 15 21 15 L -25 15 C -34 13 -34 5 -27 0 Z"
        }
        fill="#d9dee8"
        stroke="#080c14"
        strokeWidth="5"
      />
      <path
        d={side === "left" ? "M -27 5 L 22 5" : "M 27 5 L -22 5"}
        opacity="0.7"
        stroke="#8792a4"
        strokeWidth="3"
      />
    </g>
  );
}

function SportBackdrop({
  gradientPrefix,
  sport,
}: {
  gradientPrefix: string;
  sport: AnimatedSport;
}) {
  if (sport === "baseball") {
    return (
      <g>
        <rect fill={`url(#${gradientPrefix}-sceneBase)`} height="941" width="1672" />
        <path d="M0 660 L1672 610 L1672 941 L0 941 Z" fill="#10251d" />
        <path d="M0 760 L1672 690" opacity="0.22" stroke="#dbe6d7" strokeWidth="4" />
        <ellipse cx="864" cy="794" fill="#5b3c27" opacity="0.82" rx="250" ry="66" />
        <ellipse cx="864" cy="774" fill="#9b7653" opacity="0.42" rx="95" ry="25" />
        <g opacity="0.14" stroke="#7db6ff" strokeWidth="2">
          <path d="M0 174 H1672" />
          <path d="M0 242 H1672" />
          <path d="M0 310 H1672" />
          <path d="M0 378 H1672" />
        </g>
        <path d="M235 598 V335 H290 V598" fill="none" opacity="0.34" stroke="#97a8ba" strokeWidth="8" />
        <path d="M200 335 H327" opacity="0.34" stroke="#97a8ba" strokeWidth="8" />
      </g>
    );
  }

  if (sport === "football") {
    return (
      <g>
        <rect fill={`url(#${gradientPrefix}-sceneBase)`} height="941" width="1672" />
        <path d="M0 650 L1672 620 L1672 941 L0 941 Z" fill="#10271f" />
        <g opacity="0.26" stroke="#c9ddcf">
          <path d="M0 760 L1672 716" strokeWidth="4" />
          <path d="M0 850 L1672 808" strokeWidth="4" />
          <path d="M355 660 L280 941" strokeWidth="3" />
          <path d="M694 650 L666 941" strokeWidth="3" />
          <path d="M1030 640 L1055 941" strokeWidth="3" />
          <path d="M1360 630 L1444 941" strokeWidth="3" />
        </g>
        <g fill="none" opacity="0.34" stroke="#93a8bc" strokeWidth="9">
          <path d="M283 545 V270" />
          <path d="M204 270 H362" />
          <path d="M204 270 V210" />
          <path d="M362 270 V210" />
        </g>
      </g>
    );
  }

  return (
    <g>
      <rect fill={`url(#${gradientPrefix}-sceneBase)`} height="941" width="1672" />
      <g opacity="0.13" stroke="#6e89a8" strokeWidth="2">
        {Array.from({ length: 9 }, (_, index) => (
          <path d={`M0 ${125 + index * 58} H1672`} key={index} />
        ))}
      </g>
      <path d="M0 735 L1672 700 L1672 941 L0 941 Z" fill={`url(#${gradientPrefix}-courtFloor)`} />
      <path d="M0 842 L1672 800" opacity="0.28" stroke="#ecb879" strokeWidth="4" />
      <path d="M316 742 Q583 657 809 741" fill="none" opacity="0.26" stroke="#ecb879" strokeWidth="4" />
      <g>
        <path d="M130 171 H344 V342 H130 Z" fill="#07101e" opacity="0.82" stroke="#8093a9" strokeWidth="10" />
        <path d="M184 218 H305 V316 H184 Z" fill="none" opacity="0.72" stroke="#d7e0eb" strokeWidth="6" />
        <path d="M246 318 V366" stroke="#687d93" strokeWidth="10" />
        <ellipse cx="330" cy="354" fill="none" rx="54" ry="13" stroke="#ff6b00" strokeWidth="9" />
        <path d="M279 358 Q330 438 381 358" fill="none" opacity="0.58" stroke="#dbe4ed" strokeWidth="4" />
        <path d="M292 379 H369 M306 402 H354 M317 423 H344" opacity="0.48" stroke="#dbe4ed" strokeWidth="3" />
      </g>
      <g fill="#edf6ff" opacity="0.42">
        <ellipse cx="598" cy="96" rx="70" ry="9" />
        <ellipse cx="1122" cy="85" rx="82" ry="10" />
        <ellipse cx="1480" cy="124" rx="55" ry="8" />
      </g>
    </g>
  );
}

function sportBallAnchor(sport: AnimatedSport, pose: AthletePose): Point {
  if (sport === "basketball") {
    const hands = midpoint(pose.leftWrist, pose.rightWrist);
    return [hands[0] - 2, hands[1] - 29];
  }
  if (sport === "football") {
    return [pose.rightWrist[0] + 17, pose.rightWrist[1] - 4];
  }
  return [pose.rightWrist[0] - 5, pose.rightWrist[1] - 8];
}

function sportBallPosition({
  checkpoint,
  pose,
  progress,
  releasePose,
  sport,
}: AnimatedAthleteSceneProps): Point {
  const clamped = clamp01(progress);
  if (clamped <= checkpoint) return sportBallAnchor(sport, pose);

  const amount = clamp01((clamped - checkpoint) / Math.max(0.001, 1 - checkpoint));
  const start = sportBallAnchor(sport, releasePose);

  if (sport === "basketball") {
    return quadratic(start, [620, 44], [340, 337], amount);
  }
  if (sport === "football") {
    return quadratic(start, [610, 126], [292, 226], amount);
  }
  return quadratic(start, [596, 122], [286, 296], amount);
}

function SportBall({
  gradientPrefix,
  point,
  progress,
  sport,
}: {
  gradientPrefix: string;
  point: Point;
  progress: number;
  sport: AnimatedSport;
}) {
  if (sport === "baseball") {
    return (
      <g filter={`url(#${gradientPrefix}-ballShadow)`} transform={`translate(${point[0]} ${point[1]}) rotate(${progress * 620})`}>
        <circle fill="#f4f0e8" r="12" stroke="#b7bec6" strokeWidth="2" />
        <path d="M-6 -10 Q0 0 -6 10 M6 -10 Q0 0 6 10" fill="none" stroke="#c9473d" strokeDasharray="2.5 2.5" strokeWidth="2" />
      </g>
    );
  }

  if (sport === "football") {
    return (
      <g filter={`url(#${gradientPrefix}-ballShadow)`} transform={`translate(${point[0]} ${point[1]}) rotate(${-18 - progress * 220})`}>
        <ellipse fill={`url(#${gradientPrefix}-footballLeather)`} rx="31" ry="18" stroke="#4a2012" strokeWidth="3" />
        <path d="M-9 0 H10 M-5 -5 V5 M0 -5 V5 M5 -5 V5" stroke="#e8ded0" strokeLinecap="round" strokeWidth="2.5" />
      </g>
    );
  }

  return (
    <g filter={`url(#${gradientPrefix}-ballShadow)`} transform={`translate(${point[0]} ${point[1]}) rotate(${progress * 260})`}>
      <circle fill={`url(#${gradientPrefix}-basketballLeather)`} r="35" stroke="#32170a" strokeWidth="4" />
      <path d="M-35 0 H35 M0 -35 V35 M-29 -20 Q0 0 -29 20 M29 -20 Q0 0 29 20" fill="none" stroke="#51240f" strokeWidth="3.5" />
      <ellipse cx="-10" cy="-12" fill="#ffd29d" opacity="0.28" rx="13" ry="8" />
    </g>
  );
}

function AthleteBody({
  accent,
  gradientPrefix,
  pose,
  sport,
}: {
  accent: string;
  gradientPrefix: string;
  pose: AthletePose;
  sport: AnimatedSport;
}) {
  const shoulderCenter = midpoint(pose.leftShoulder, pose.rightShoulder);
  const hipCenter = midpoint(pose.leftHip, pose.rightHip);
  const leftShort = mix(pose.leftHip, pose.leftKnee, 0.28);
  const rightShort = mix(pose.rightHip, pose.rightKnee, 0.28);
  const jerseyPath = [
    `M ${pose.leftShoulder[0] - 13} ${pose.leftShoulder[1] - 3}`,
    `Q ${shoulderCenter[0]} ${shoulderCenter[1] - 20} ${pose.rightShoulder[0] + 13} ${pose.rightShoulder[1] - 3}`,
    `L ${pose.rightHip[0] + 19} ${pose.rightHip[1] + 8}`,
    `Q ${hipCenter[0]} ${hipCenter[1] + 19} ${pose.leftHip[0] - 19} ${pose.leftHip[1] + 8}`,
    "Z",
  ].join(" ");
  const shortsPath = [
    `M ${pose.leftHip[0] - 20} ${pose.leftHip[1] - 1}`,
    `L ${pose.rightHip[0] + 20} ${pose.rightHip[1] - 1}`,
    `L ${rightShort[0] + 20} ${rightShort[1] + 8}`,
    `L ${hipCenter[0] + 7} ${hipCenter[1] + 30}`,
    `L ${leftShort[0] - 20} ${leftShort[1] + 8}`,
    "Z",
  ].join(" ");
  const skinGradient = `${gradientPrefix}-skin`;
  const jerseyGradient = `${gradientPrefix}-jersey`;
  const shortsGradient = `${gradientPrefix}-shorts`;

  return (
    <g filter={`url(#${gradientPrefix}-athleteShadow)`}>
      <ellipse
        cx={hipCenter[0] + 5}
        cy={Math.max(pose.leftAnkle[1], pose.rightAnkle[1]) + 28}
        fill="#000"
        opacity="0.46"
        rx="126"
        ry="22"
      />

      <Limb end={pose.leftKnee} gradient={skinGradient} start={pose.leftHip} width={46} />
      <Limb end={pose.leftAnkle} gradient={skinGradient} start={pose.leftKnee} width={39} />
      <Limb end={pose.leftElbow} gradient={skinGradient} start={pose.leftShoulder} width={34} />
      <Limb end={pose.leftWrist} gradient={skinGradient} start={pose.leftElbow} width={29} />

      <path d={jerseyPath} fill={`url(#${jerseyGradient})`} stroke="#050913" strokeLinejoin="round" strokeWidth="9" />
      <path d={shortsPath} fill={`url(#${shortsGradient})`} stroke="#050913" strokeLinejoin="round" strokeWidth="9" />
      <path
        d={`M ${pose.leftShoulder[0]} ${pose.leftShoulder[1] + 7} Q ${shoulderCenter[0]} ${shoulderCenter[1] + 26} ${pose.rightShoulder[0]} ${pose.rightShoulder[1] + 7}`}
        fill="none"
        opacity="0.58"
        stroke={accent}
        strokeWidth="7"
      />
      <path
        d={`M ${pose.rightHip[0] + 4} ${pose.rightHip[1]} L ${rightShort[0] + 7} ${rightShort[1]}`}
        opacity="0.76"
        stroke={accent}
        strokeWidth="7"
      />

      <Limb end={pose.rightKnee} gradient={skinGradient} start={pose.rightHip} width={48} />
      <Limb end={pose.rightAnkle} gradient={skinGradient} start={pose.rightKnee} width={40} />
      <Limb end={pose.rightElbow} gradient={skinGradient} start={pose.rightShoulder} width={36} />
      <Limb end={pose.rightWrist} gradient={skinGradient} start={pose.rightElbow} width={30} />

      <line
        stroke={`url(#${skinGradient})`}
        strokeLinecap="round"
        strokeWidth="31"
        x1={pose.head[0]}
        x2={shoulderCenter[0]}
        y1={pose.head[1] + 30}
        y2={shoulderCenter[1] - 8}
      />
      <circle cx={pose.head[0]} cy={pose.head[1]} fill={`url(#${skinGradient})`} r="43" stroke="#090b12" strokeWidth="7" />
      <path
        d={`M ${pose.head[0] - 39} ${pose.head[1] - 6} Q ${pose.head[0] - 21} ${pose.head[1] - 54} ${pose.head[0] + 35} ${pose.head[1] - 25} Q ${pose.head[0] + 43} ${pose.head[1] - 5} ${pose.head[0] + 33} ${pose.head[1] + 2} Q ${pose.head[0] + 8} ${pose.head[1] - 15} ${pose.head[0] - 39} ${pose.head[1] - 6} Z`}
        fill="#11131a"
      />
      <path
        d={`M ${pose.head[0] - 21} ${pose.head[1] + 1} Q ${pose.head[0] - 37} ${pose.head[1] + 12} ${pose.head[0] - 23} ${pose.head[1] + 22}`}
        fill="none"
        opacity="0.42"
        stroke="#2f160d"
        strokeWidth="4"
      />

      <Shoe point={pose.leftAnkle} side="left" />
      <Shoe point={pose.rightAnkle} side="right" />

      {sport === "baseball" ? (
        <g transform={`translate(${pose.leftWrist[0]} ${pose.leftWrist[1]}) rotate(-24)`}>
          <path d="M-23 7 Q-31 -16 -13 -29 Q2 -42 22 -24 Q35 -11 20 11 Q2 31 -23 7 Z" fill="#8e542f" stroke="#3a2014" strokeWidth="6" />
          <path d="M-13 -18 Q1 -2 18 -15 M-17 -6 Q0 9 20 -3" fill="none" opacity="0.55" stroke="#d8a46b" strokeWidth="3" />
        </g>
      ) : null}
      {sport === "basketball" ? (
        <path
          d={`M ${shoulderCenter[0] - 10} ${shoulderCenter[1] + 58} H ${shoulderCenter[0] + 10}`}
          opacity="0.72"
          stroke={accent}
          strokeWidth="18"
        />
      ) : null}
    </g>
  );
}

export function AnimatedAthleteScene(props: AnimatedAthleteSceneProps) {
  const { checkpoint, pose, progress, releasePose, sport } = props;
  const rawId = useId();
  const prefix = `echo-athlete-${rawId.replaceAll(":", "")}`;
  const accent =
    sport === "basketball" ? "#ff6b00" : sport === "baseball" ? "#2f88ff" : "#f1f5f9";
  const ball = sportBallPosition(props);

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 z-0 h-full w-full"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1672 941"
    >
      <defs>
        <linearGradient id={`${prefix}-sceneBase`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#030710" />
          <stop offset="0.56" stopColor="#081426" />
          <stop offset="1" stopColor="#10284a" />
        </linearGradient>
        <linearGradient id={`${prefix}-courtFloor`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3b2a20" />
          <stop offset="1" stopColor="#130f0e" />
        </linearGradient>
        <linearGradient id={`${prefix}-skin`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f0b180" />
          <stop offset="0.42" stopColor="#9a5736" />
          <stop offset="1" stopColor="#432419" />
        </linearGradient>
        <linearGradient id={`${prefix}-jersey`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#283241" />
          <stop offset="0.48" stopColor="#111722" />
          <stop offset="1" stopColor="#050912" />
        </linearGradient>
        <linearGradient id={`${prefix}-shorts`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#202a39" />
          <stop offset="1" stopColor="#070b12" />
        </linearGradient>
        <radialGradient id={`${prefix}-basketballLeather`} cx="35%" cy="25%" r="75%">
          <stop offset="0" stopColor="#f6a255" />
          <stop offset="0.58" stopColor="#c56024" />
          <stop offset="1" stopColor="#6d2d12" />
        </radialGradient>
        <linearGradient id={`${prefix}-footballLeather`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#b86635" />
          <stop offset="1" stopColor="#5b2816" />
        </linearGradient>
        <filter id={`${prefix}-athleteShadow`} height="150%" width="150%" x="-25%" y="-25%">
          <feDropShadow dx="6" dy="12" floodColor="#000" floodOpacity="0.62" stdDeviation="8" />
        </filter>
        <filter id={`${prefix}-ballShadow`} height="180%" width="180%" x="-40%" y="-40%">
          <feDropShadow dx="3" dy="6" floodColor="#000" floodOpacity="0.7" stdDeviation="5" />
        </filter>
        <radialGradient id={`${prefix}-spotlight`} cx="50%" cy="0" r="75%">
          <stop offset="0" stopColor="#3f8cff" stopOpacity="0.2" />
          <stop offset="1" stopColor="#3f8cff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <SportBackdrop gradientPrefix={prefix} sport={sport} />
      <ellipse cx="900" cy="300" fill={`url(#${prefix}-spotlight)`} rx="650" ry="560" />
      <AthleteBody accent={accent} gradientPrefix={prefix} pose={pose} sport={sport} />
      <SportBall gradientPrefix={prefix} point={ball} progress={progress} sport={sport} />

      <g opacity="0.7">
        <circle cx={ball[0]} cy={ball[1]} fill="none" r={sport === "basketball" ? 49 : 24} stroke={accent} strokeDasharray="5 12" strokeWidth="2" />
      </g>

      {progress > checkpoint ? (
        <path
          d={`M ${sportBallAnchor(sport, releasePose)[0]} ${sportBallAnchor(sport, releasePose)[1]} Q ${sport === "basketball" ? 620 : 600} ${sport === "basketball" ? 44 : 122} ${ball[0]} ${ball[1]}`}
          fill="none"
          opacity="0.22"
          stroke={accent}
          strokeDasharray="5 13"
          strokeLinecap="round"
          strokeWidth="3"
        />
      ) : null}
    </svg>
  );
}
