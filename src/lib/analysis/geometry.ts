// Small 2D geometry helpers over pose frames.
//
// NOTE: every angle here is computed in the IMAGE PLANE from 2D keypoints, so it
// is view-dependent. We constrain capture to a side-on view and treat these as
// directional signals, not true 3D joint angles. (See ARCHITECTURE.md §5.)
import type { Keypoint, PoseFrame } from "../contracts";

export interface Pt {
  x: number;
  y: number;
}

/** Find a named keypoint in a frame, or undefined if absent. */
export function kp(frame: PoseFrame, name: string): Keypoint | undefined {
  return frame.keypoints.find((k) => k.name === name);
}

/** Euclidean distance between two points (image-normalized units). */
export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Interior angle (degrees) at vertex `b` formed by points `a` and `c`.
 * ~180° is a straight/extended joint; smaller is more flexed.
 */
export function angleDeg(a: Pt, b: Pt, c: Pt): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const m1 = Math.hypot(v1.x, v1.y);
  const m2 = Math.hypot(v2.x, v2.y);
  if (m1 === 0 || m2 === 0) return NaN;
  const cos = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (m1 * m2)));
  return (Math.acos(cos) * 180) / Math.PI;
}
