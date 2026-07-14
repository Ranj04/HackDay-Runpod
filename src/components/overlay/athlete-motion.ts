"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AthleteJoint =
  | "head"
  | "leftShoulder"
  | "rightShoulder"
  | "leftElbow"
  | "rightElbow"
  | "leftWrist"
  | "rightWrist"
  | "leftHip"
  | "rightHip"
  | "leftKnee"
  | "rightKnee"
  | "leftAnkle"
  | "rightAnkle";

export type AthletePose = Record<
  AthleteJoint,
  readonly [number, number]
>;

export type AthletePoseDelta = Partial<
  Record<AthleteJoint, readonly [number, number]>
>;

export interface AthleteMotionKeyframe {
  at: number;
  observedPose: AthletePose;
  referencePose: AthletePose;
}

export interface AthleteMotion {
  id: string;
  durationMs: number;
  holdMs: number;
  checkpoint: number;
  keyframes: readonly AthleteMotionKeyframe[];
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const easeInOutCubic = (value: number) =>
  value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;

export function offsetAthletePose(
  pose: AthletePose,
  delta: AthletePoseDelta,
): AthletePose {
  return Object.fromEntries(
    (Object.keys(pose) as AthleteJoint[]).map((joint) => {
      const [x, y] = pose[joint];
      const [dx, dy] = delta[joint] ?? [0, 0];
      return [joint, [x + dx, y + dy] as const];
    }),
  ) as AthletePose;
}

function interpolatePose(
  start: AthletePose,
  end: AthletePose,
  amount: number,
): AthletePose {
  return Object.fromEntries(
    (Object.keys(start) as AthleteJoint[]).map((joint) => {
      const [startX, startY] = start[joint];
      const [endX, endY] = end[joint];
      return [
        joint,
        [
          startX + (endX - startX) * amount,
          startY + (endY - startY) * amount,
        ] as const,
      ];
    }),
  ) as AthletePose;
}

export function interpolateAthleteMotion(
  motion: AthleteMotion,
  progress: number,
): Pick<AthleteMotionKeyframe, "observedPose" | "referencePose"> {
  const clamped = clamp01(progress);
  const frames = motion.keyframes;
  const first = frames[0];
  const last = frames[frames.length - 1];

  if (!first || !last) {
    throw new Error(`Athlete motion "${motion.id}" needs at least one keyframe.`);
  }
  if (clamped <= first.at) return first;
  if (clamped >= last.at) return last;

  const endIndex = frames.findIndex((frame) => frame.at >= clamped);
  const end = frames[Math.max(1, endIndex)] ?? last;
  const start = frames[Math.max(0, endIndex - 1)] ?? first;
  const span = Math.max(0.001, end.at - start.at);
  const amount = easeInOutCubic((clamped - start.at) / span);

  return {
    observedPose: interpolatePose(start.observedPose, end.observedPose, amount),
    referencePose: interpolatePose(
      start.referencePose,
      end.referencePose,
      amount,
    ),
  };
}

export function useAthleteMotionPlayback(motion: AthleteMotion) {
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const holdRef = useRef(0);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");

    const applyPreference = (reduced: boolean) => {
      const nextProgress = reduced ? clamp01(motion.checkpoint) : 0;
      progressRef.current = nextProgress;
      holdRef.current = 0;
      setProgress(nextProgress);
      setPlaying(!reduced);
    };

    const initialFrame = requestAnimationFrame(() => {
      applyPreference(preference.matches);
    });
    const handleChange = (event: MediaQueryListEvent) => {
      applyPreference(event.matches);
    };

    preference.addEventListener("change", handleChange);
    return () => {
      cancelAnimationFrame(initialFrame);
      preference.removeEventListener("change", handleChange);
    };
  }, [motion.checkpoint, motion.id]);

  useEffect(() => {
    if (!playing) return;

    let animationFrame = 0;
    let last = performance.now();
    let lastPaint = last;

    const tick = (now: number) => {
      animationFrame = requestAnimationFrame(tick);
      const deltaMs = Math.min(100, now - last);
      last = now;

      if (document.hidden) return;

      if (progressRef.current >= 1) {
        holdRef.current += deltaMs;
        if (holdRef.current >= motion.holdMs) {
          progressRef.current = 0;
          holdRef.current = 0;
        }
      } else {
        progressRef.current = Math.min(
          1,
          progressRef.current + deltaMs / motion.durationMs,
        );
      }

      if (now - lastPaint >= 1000 / 30) {
        lastPaint = now;
        setProgress(progressRef.current);
      }
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [motion.durationMs, motion.holdMs, motion.id, playing]);

  const scrub = useCallback((nextProgress: number) => {
    const next = clamp01(nextProgress);
    progressRef.current = next;
    holdRef.current = 0;
    setProgress(next);
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    setPlaying((current) => !current);
  }, []);

  return { playing, progress, scrub, toggle };
}
