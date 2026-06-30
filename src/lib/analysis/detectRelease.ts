// Release-frame detection: the moment the ball leaves the hand, found from the
// peak upward velocity of the shooting wrist, with a highest-point fallback.
import type { ShotCapture } from "../contracts";
import { kp } from "./geometry";

export type Side = "left" | "right";

/** Which hand is the shooting hand: the wrist with the greater vertical travel. */
export function detectShootingSide(capture: ShotCapture): Side {
  const travel = (name: string) => {
    let min = Infinity;
    let max = -Infinity;
    for (const f of capture.frames) {
      const k = kp(f, name);
      if (k) {
        min = Math.min(min, k.y);
        max = Math.max(max, k.y);
      }
    }
    return max - min === -Infinity ? 0 : max - min;
  };
  return travel("right_wrist") >= travel("left_wrist") ? "right" : "left";
}

/**
 * Find the release frame index. Release is the peak upward velocity of the
 * shooting wrist (y decreases as the hand rises, so upward velocity = yPrev - y).
 * Falls back to the highest wrist point if velocity is too small/noisy.
 */
export function detectRelease(capture: ShotCapture, side: Side = detectShootingSide(capture)): number {
  const wrist = `${side}_wrist`;
  const ys = capture.frames.map((f) => kp(f, wrist)?.y ?? null);

  let bestIdx = -1;
  let bestVel = -Infinity;
  for (let t = 1; t < ys.length; t++) {
    const prev = ys[t - 1];
    const cur = ys[t];
    if (prev == null || cur == null) continue;
    const upward = prev - cur;
    if (upward > bestVel) {
      bestVel = upward;
      bestIdx = t;
    }
  }
  if (bestIdx >= 0 && bestVel > 1e-4) return bestIdx;

  // Fallback: the frame where the wrist is highest (smallest y).
  let minY = Infinity;
  let minIdx = 0;
  ys.forEach((y, i) => {
    if (y != null && y < minY) {
      minY = y;
      minIdx = i;
    }
  });
  return minIdx;
}
