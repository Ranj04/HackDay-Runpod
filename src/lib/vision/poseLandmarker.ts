"use client";
// Client-side MediaPipe Pose Landmarker setup. Lazily creates a single VIDEO-mode
// landmarker, trying the GPU delegate first and falling back to CPU if GPU init
// fails. (A TensorFlow.js runtime fallback is available as a future option if
// MediaPipe can't initialize at all — see @tensorflow/tfjs in deps.)
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let instance: PoseLandmarker | null = null;
let pending: Promise<PoseLandmarker> | null = null;

async function build(delegate: "GPU" | "CPU"): Promise<PoseLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO",
    numPoses: 1,
  });
}

/** Lazily create (and cache) the Pose Landmarker. Safe to call repeatedly. */
export async function createPoseLandmarker(): Promise<PoseLandmarker> {
  if (instance) return instance;
  if (pending) return pending;
  pending = (async () => {
    try {
      instance = await build("GPU");
    } catch {
      instance = await build("CPU");
    }
    return instance;
  })();
  return pending;
}

/** Release the cached landmarker (e.g. on hard teardown). */
export function disposePoseLandmarker(): void {
  instance?.close();
  instance = null;
  pending = null;
}
