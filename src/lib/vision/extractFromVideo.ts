"use client";
// Offline adapter: turn a video FILE (or URL) into a contract-valid ShotCapture,
// mirroring the live webcam loop in CaptureView but driven by seeking instead of
// requestAnimationFrame. This is the piece that lets any clip — a side-on pro
// shooter, a coaching-channel breakdown, your own footage — become the reference
// "echo" under fixtures/reference/generated/.
//
// Same pipeline as live capture: detectForVideo -> landmarksToKeypoints ->
// buildCapture. The only difference is the frame source.
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { PoseFrame, ShotCapture } from "../contracts";
import { buildCapture, type BuildCaptureOptions } from "./buildCapture";
import { landmarksToKeypoints } from "./landmarks";
import { createPoseLandmarker } from "./poseLandmarker";

export interface ExtractFromVideoOptions extends BuildCaptureOptions {
  /** How many frames per second to sample by seeking through the clip. Default 30. */
  sampleFps?: number;
  /** Trim: first second of the shot to sample (default 0 = clip start). */
  startSec?: number;
  /** Trim: last second to sample (default = clip end). Isolate just the shot here. */
  endSec?: number;
  /** Progress 0..1 as seeking proceeds — wire to a UI bar for long clips. */
  onProgress?: (fraction: number) => void;
  /** Set for cross-origin URL sources so the video isn't tainted. Default true for strings. */
  crossOrigin?: boolean;
}

const DEFAULT_SAMPLE_FPS = 30;

/** Resolve once the video has dimensions + duration. */
function whenMetadataReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 1 && Number.isFinite(video.duration)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    video.addEventListener("loadedmetadata", () => resolve(), { once: true });
    video.addEventListener("error", () => reject(new Error("Could not load the video")), {
      once: true,
    });
  });
}

/** Seek to `time` (s) and resolve once the frame at that position is decoded. */
function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  if (Math.abs(video.currentTime - time) < 1e-4 && video.readyState >= 2) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Could not decode a frame from the video"));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("loadeddata", onLoaded);
    video.addEventListener("error", onError);
    video.currentTime = time;
  });
}

/**
 * Decode a clip into a `ShotCapture` by sampling pose frames at `sampleFps`.
 *
 * Timestamps are anchored to `performance.now()` so they stay monotonically
 * increasing relative to any prior use of the shared (cached) landmarker — the
 * live capture loop uses `performance.now()` too, and MediaPipe's VIDEO mode
 * rejects non-increasing timestamps.
 */
export async function extractCaptureFromVideo(
  source: File | Blob | string,
  options: ExtractFromVideoOptions = {},
): Promise<ShotCapture> {
  const sampleFps = options.sampleFps ?? DEFAULT_SAMPLE_FPS;
  if (sampleFps <= 0) throw new Error("sampleFps must be > 0");

  const isUrl = typeof source === "string";
  const objectUrl = isUrl ? null : URL.createObjectURL(source);
  const src = isUrl ? source : objectUrl!;

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  if (isUrl && (options.crossOrigin ?? true)) video.crossOrigin = "anonymous";
  video.src = src;

  try {
    await whenMetadataReady(video);

    const duration = video.duration;
    const start = Math.max(0, options.startSec ?? 0);
    const end = Math.min(duration, options.endSec ?? duration);
    if (!(end > start)) throw new Error("Empty sampling window (check startSec/endSec)");

    const landmarker = await createPoseLandmarker();
    const stepSec = 1 / sampleFps;
    const span = end - start;
    // Monotonic timestamp base, shared-singleton-safe (see doc comment).
    const tsBase = performance.now();

    const frames: PoseFrame[] = [];
    for (let t = start; t <= end + 1e-6; t += stepSec) {
      const clamped = Math.min(t, end);
      await seekTo(video, clamped);

      const elapsedMs = (clamped - start) * 1000;
      const result = landmarker.detectForVideo(video, tsBase + elapsedMs);
      const landmarks = result.landmarks?.[0] as NormalizedLandmark[] | undefined;
      if (landmarks?.length) {
        frames.push({ t: elapsedMs, keypoints: landmarksToKeypoints(landmarks) });
      }
      options.onProgress?.(span > 0 ? (clamped - start) / span : 1);
    }

    if (frames.length === 0) {
      throw new Error("No pose detected in the clip — is the shooter fully in frame and side-on?");
    }

    return buildCapture(frames, { view: "side", ...options });
  } finally {
    video.removeAttribute("src");
    video.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
