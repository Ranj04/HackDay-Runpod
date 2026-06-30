// PERSON A (works on main) — vision module public surface. See OWNERSHIP.md.
export { useCamera, type UseCamera } from "./useCamera";
export { createPoseLandmarker, disposePoseLandmarker } from "./poseLandmarker";
export { buildCapture, estimateFps, type BuildCaptureOptions } from "./buildCapture";
export {
  POSE_LANDMARK_NAMES,
  SHOT_LANDMARKS,
  landmarksToKeypoints,
  type NormalizedLandmarkLike,
} from "./landmarks";
export { isVisible, countVisible, VISIBILITY_THRESHOLD, type ScorableLandmark } from "./visibility";
