// MediaPipe BlazePose landmark names (33-point full-body model), in index order,
// plus the conversion from MediaPipe's normalized landmarks to our Keypoint contract.
import type { Keypoint } from "../contracts";

/** Canonical names for the 33 MediaPipe Pose landmarks, indexed 0..32. */
export const POSE_LANDMARK_NAMES = [
  "nose",
  "left_eye_inner",
  "left_eye",
  "left_eye_outer",
  "right_eye_inner",
  "right_eye",
  "right_eye_outer",
  "left_ear",
  "right_ear",
  "mouth_left",
  "mouth_right",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_pinky",
  "right_pinky",
  "left_index",
  "right_index",
  "left_thumb",
  "right_thumb",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
  "left_heel",
  "right_heel",
  "left_foot_index",
  "right_foot_index",
] as const;

/** The subset of landmarks the shot-form analysis layer actually cares about. */
export const SHOT_LANDMARKS = [
  "nose",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
] as const;

/** Minimal shape of a MediaPipe normalized landmark (x/y/z in 0..1, visibility 0..1). */
export interface NormalizedLandmarkLike {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/**
 * Convert one frame of MediaPipe landmarks into our `Keypoint[]` contract shape.
 * `score` carries the landmark visibility; names come from `POSE_LANDMARK_NAMES`.
 */
export function landmarksToKeypoints(landmarks: NormalizedLandmarkLike[]): Keypoint[] {
  return landmarks.map((lm, i) => ({
    name: POSE_LANDMARK_NAMES[i] ?? `landmark_${i}`,
    x: lm.x,
    y: lm.y,
    z: lm.z,
    score: lm.visibility ?? 1,
  }));
}
