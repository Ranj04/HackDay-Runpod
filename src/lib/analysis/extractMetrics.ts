// Joint metric extraction from a ShotCapture. Every metric is nullable: when the
// keypoints it needs are absent, it returns null rather than guessing.
//
// All angles are 2D image-plane measurements (side-on view) — view-dependent
// signals, not lab-grade joint angles. See geometry.ts / ARCHITECTURE.md §5.
import type { JointMetrics, PoseFrame, ShotCapture } from "../contracts";
import { angleDeg, dist, kp } from "./geometry";
import { detectRelease, detectShootingSide, type Side } from "./detectRelease";

/** Interior elbow angle (shoulder–elbow–wrist) on the shooting side. */
function elbowAngle(frame: PoseFrame, side: Side): number | null {
  const s = kp(frame, `${side}_shoulder`);
  const e = kp(frame, `${side}_elbow`);
  const w = kp(frame, `${side}_wrist`);
  if (!s || !e || !w) return null;
  const a = angleDeg(s, e, w);
  return Number.isNaN(a) ? null : round(a);
}

/** Normalized release height: 1 - wristY (higher hand = larger value, 0..1). */
function releaseHeight(frame: PoseFrame, side: Side): number | null {
  const w = kp(frame, `${side}_wrist`);
  if (!w) return null;
  return round(1 - w.y);
}

/** Guide-hand presence: how close the off-hand still is to the ball at release. */
function guideHandPresence(frame: PoseFrame, side: Side): number | null {
  const shootWrist = kp(frame, `${side}_wrist`);
  const guideWrist = kp(frame, `${side === "right" ? "left" : "right"}_wrist`);
  if (!shootWrist || !guideWrist) return null;
  // Closer than ~0.15 normalized units reads as "still on the ball" (presence ~1).
  return round(Math.max(0, Math.min(1, 1 - dist(shootWrist, guideWrist) / 0.15)));
}

/** Deepest knee bend across the shot (min averaged knee angle = the dip). */
function kneeFlexionAtDip(frames: PoseFrame[]): number | null {
  let minAngle: number | null = null;
  for (const f of frames) {
    const angles: number[] = [];
    for (const side of ["left", "right"] as const) {
      const hip = kp(f, `${side}_hip`);
      const knee = kp(f, `${side}_knee`);
      const ankle = kp(f, `${side}_ankle`);
      if (hip && knee && ankle) {
        const a = angleDeg(hip, knee, ankle);
        if (!Number.isNaN(a)) angles.push(a);
      }
    }
    if (angles.length) {
      const avg = angles.reduce((s, a) => s + a, 0) / angles.length;
      if (minAngle == null || avg < minAngle) minAngle = avg;
    }
  }
  return minAngle == null ? null : round(minAngle);
}

/** Wrist-snap timing (ms): how long after release the wrist keeps rising. */
function wristSnapTiming(capture: ShotCapture, side: Side, releaseIdx: number): number | null {
  const wrist = `${side}_wrist`;
  let peakIdx = releaseIdx;
  let peakY = kp(capture.frames[releaseIdx], wrist)?.y ?? null;
  if (peakY == null) return null;
  for (let t = releaseIdx; t < capture.frames.length; t++) {
    const y = kp(capture.frames[t], wrist)?.y;
    if (y != null && y < peakY) {
      peakY = y;
      peakIdx = t;
    }
  }
  return round(capture.frames[peakIdx].t - capture.frames[releaseIdx].t);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Derive all JointMetrics for a captured shot. */
export function extractMetrics(capture: ShotCapture): JointMetrics {
  const side = detectShootingSide(capture);
  const releaseFrameIndex = detectRelease(capture, side);
  const rel = capture.frames[releaseFrameIndex];

  return {
    releaseElbowAngle: rel ? elbowAngle(rel, side) : null,
    releaseFrameIndex,
    kneeFlexionAtDip: kneeFlexionAtDip(capture.frames),
    wristSnapTiming: wristSnapTiming(capture, side, releaseFrameIndex),
    guideHandPresence: rel ? guideHandPresence(rel, side) : null,
    releaseHeight: rel ? releaseHeight(rel, side) : null,
  };
}
