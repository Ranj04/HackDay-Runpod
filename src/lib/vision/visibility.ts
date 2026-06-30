// Confidence gating. MediaPipe emits low-confidence / off-frame landmarks when a
// joint isn't actually seen (e.g. legs out of frame). We must never draw or trust
// those — gate on visibility/presence AND in-frame position.
//
// Pure module (no client/runtime deps) so it's safe to import anywhere — capture
// preview, overlay, and node verify scripts.

export const VISIBILITY_THRESHOLD = 0.5;

/** Looser gate for "ready to record" — laptop webcams clip ankles/feet first. */
export const FRAMING_VISIBILITY_THRESHOLD = 0.35;

/** Allow landmarks slightly outside the normalized frame (common at edges). */
export const FRAME_MARGIN = { x: 0.06, y: 0.12 };

/** Anything with normalized coords plus a confidence signal. Raw MediaPipe
 *  landmarks carry `visibility`/`presence`; our Keypoint contract carries `score`
 *  (which we set from visibility at capture time). */
export interface ScorableLandmark {
  x: number;
  y: number;
  visibility?: number;
  presence?: number;
  score?: number;
}

/** True only if the landmark is confidently seen AND inside the frame. */
export function isVisible(lm: ScorableLandmark): boolean {
  const visibility = lm.visibility ?? lm.score ?? 1;
  const presence = lm.presence ?? 1;
  return (
    visibility >= VISIBILITY_THRESHOLD &&
    presence >= VISIBILITY_THRESHOLD &&
    lm.x >= 0 &&
    lm.x <= 1 &&
    lm.y >= 0 &&
    lm.y <= 1
  );
}

/** Ready-to-record check: lower confidence + small edge margin so you don't
 *  need to stand across the room for ankles to register. Draw/analysis still
 *  use {@link isVisible} so off-frame junk never renders. */
export function isVisibleForFraming(lm: ScorableLandmark): boolean {
  const visibility = lm.visibility ?? lm.score ?? 1;
  const presence = lm.presence ?? 1;
  if (visibility < FRAMING_VISIBILITY_THRESHOLD || presence < FRAMING_VISIBILITY_THRESHOLD) {
    return false;
  }
  const { x: mx, y: my } = FRAME_MARGIN;
  return lm.x >= -mx && lm.x <= 1 + mx && lm.y >= -my && lm.y <= 1 + my;
}

/** How many of a set of landmarks are visible (for the "N/33" debug readout). */
export function countVisible(landmarks: ScorableLandmark[]): number {
  let n = 0;
  for (const lm of landmarks) if (isVisible(lm)) n++;
  return n;
}
