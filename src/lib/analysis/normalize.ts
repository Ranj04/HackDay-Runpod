// Body-size normalization. To compare two shooters of different heights/builds,
// we hip-center each frame and scale by torso length, so a "gap" reflects form,
// not body size. The same transform lets us re-project the reference ghost onto
// the user for overlay.
import type { PoseFrame } from "../contracts";
import { dist, kp, type Pt } from "./geometry";

/** Midpoint of the two hips, or null if either is missing. */
export function hipCenter(frame: PoseFrame): Pt | null {
  const l = kp(frame, "left_hip");
  const r = kp(frame, "right_hip");
  if (!l || !r) return null;
  return { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 };
}

/** Midpoint of the two shoulders, or null if either is missing. */
export function shoulderCenter(frame: PoseFrame): Pt | null {
  const l = kp(frame, "left_shoulder");
  const r = kp(frame, "right_shoulder");
  if (!l || !r) return null;
  return { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 };
}

/** Torso length = hip-center to shoulder-center distance (the scale unit). */
export function torsoLength(frame: PoseFrame): number | null {
  const hip = hipCenter(frame);
  const sho = shoulderCenter(frame);
  if (!hip || !sho) return null;
  const d = dist(hip, sho);
  return d > 1e-6 ? d : null;
}

/**
 * Hip-center and torso-scale a frame's keypoints (body-size invariant).
 * Returns null when the hip/torso reference can't be computed.
 */
export function normalizeFrame(frame: PoseFrame): PoseFrame | null {
  const hip = hipCenter(frame);
  const scale = torsoLength(frame);
  if (!hip || !scale) return null;
  return {
    t: frame.t,
    keypoints: frame.keypoints.map((k) => ({
      ...k,
      x: (k.x - hip.x) / scale,
      y: (k.y - hip.y) / scale,
    })),
  };
}

/** Normalize a whole sequence; frames that can't be normalized become null. */
export function normalize(frames: PoseFrame[]): (PoseFrame | null)[] {
  return frames.map(normalizeFrame);
}
