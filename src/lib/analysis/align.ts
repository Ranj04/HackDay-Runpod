// Temporal + spatial alignment of the reference ghost onto the user's shot.
//
// Temporal: shift the reference so its release frame lands on the user's release
// frame, so the two shots' phases line up.
// Spatial: express the reference pose in the user's hip-center and torso-scale at
// each frame, so the ghost overlays the user regardless of body size or position.
import type { PoseFrame, ShotCapture } from "../contracts";
import { detectRelease } from "./detectRelease";
import { hipCenter, torsoLength } from "./normalize";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Re-project a reference frame into the user frame's hip-center + torso scale. */
function projectOntoUser(refFrame: PoseFrame, userFrame: PoseFrame): PoseFrame {
  const refHip = hipCenter(refFrame);
  const refScale = torsoLength(refFrame);
  const userHip = hipCenter(userFrame);
  const userScale = torsoLength(userFrame);
  if (!refHip || !refScale || !userHip || !userScale) {
    return { t: userFrame.t, keypoints: refFrame.keypoints };
  }
  const k = userScale / refScale;
  return {
    t: userFrame.t,
    keypoints: refFrame.keypoints.map((p) => ({
      ...p,
      x: userHip.x + (p.x - refHip.x) * k,
      y: userHip.y + (p.y - refHip.y) * k,
    })),
  };
}

/**
 * Build the ghost reference track: one frame per user frame, with the reference
 * release-aligned and re-projected onto the user. Same length as `user.frames`.
 */
export function alignToReference(user: ShotCapture, reference: ShotCapture, userRelease: number): PoseFrame[] {
  const refRelease = detectRelease(reference);
  const shift = userRelease - refRelease;
  const last = reference.frames.length - 1;
  return user.frames.map((uf, i) => {
    const refIdx = clamp(i - shift, 0, last);
    return projectOntoUser(reference.frames[refIdx], uf);
  });
}
