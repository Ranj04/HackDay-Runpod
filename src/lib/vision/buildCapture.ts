// Pure assembly of buffered pose frames into a contract-valid ShotCapture.
// Kept side-effect-free so it can be unit-verified against the Zod schema
// without a camera.
import type { Keypoint, PoseFrame, ShotCapture, View } from "../contracts";

export interface BuildCaptureOptions {
  id?: string;
  view?: View;
  fps?: number;
  /**
   * Cap the stored frame rate by temporally downsampling. The detection loop
   * buffers at the display refresh (~60fps); 20fps is plenty for pose analysis
   * and keeps the Server Action payload well under its body-size limit. Pass
   * `0` to disable downsampling.
   */
  targetFps?: number;
  /**
   * Decimal places to round normalized coordinates to. Landmarks are 0..1, so
   * 4 places is sub-pixel on a 1080p frame while roughly halving the JSON size.
   * Pass `null` to keep full precision.
   */
  precision?: number | null;
}

const DEFAULT_TARGET_FPS = 20;
const DEFAULT_PRECISION = 4;

/** Estimate fps from frame timestamps (ms), defaulting to 30 when undeterminable. */
export function estimateFps(frames: PoseFrame[]): number {
  if (frames.length < 2) return 30;
  const spanMs = frames[frames.length - 1].t - frames[0].t;
  if (spanMs <= 0) return 30;
  return Math.round(((frames.length - 1) / spanMs) * 1000);
}

function newId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  return c?.randomUUID ? c.randomUUID() : `shot-${Date.now()}`;
}

const roundTo = (value: number, places: number): number => {
  const f = 10 ** places;
  return Math.round(value * f) / f;
};

/**
 * Keep frames spaced at least `1000/targetFps` ms apart (first and last always
 * kept). Timestamp-based rather than index-based so it tracks real cadence even
 * when the capture rate fluctuates.
 */
function downsampleByFps(frames: PoseFrame[], targetFps: number): PoseFrame[] {
  if (targetFps <= 0 || frames.length < 3) return frames;
  const minGapMs = 1000 / targetFps;
  const kept: PoseFrame[] = [frames[0]];
  let lastT = frames[0].t;
  for (let i = 1; i < frames.length - 1; i++) {
    if (frames[i].t - lastT >= minGapMs) {
      kept.push(frames[i]);
      lastT = frames[i].t;
    }
  }
  kept.push(frames[frames.length - 1]);
  return kept;
}

function roundFrame(frame: PoseFrame, places: number): PoseFrame {
  return {
    t: Math.round(frame.t),
    keypoints: frame.keypoints.map(
      (kp): Keypoint => ({
        name: kp.name,
        x: roundTo(kp.x, places),
        y: roundTo(kp.y, places),
        ...(kp.z !== undefined ? { z: roundTo(kp.z, places) } : {}),
        score: roundTo(kp.score, places),
      }),
    ),
  };
}

/** Wrap recorded `PoseFrame[]` into a `ShotCapture` (side-on view by default). */
export function buildCapture(frames: PoseFrame[], options: BuildCaptureOptions = {}): ShotCapture {
  const targetFps = options.targetFps ?? DEFAULT_TARGET_FPS;
  const precision = options.precision === undefined ? DEFAULT_PRECISION : options.precision;

  let processed = downsampleByFps(frames, targetFps);
  if (precision !== null) {
    processed = processed.map((f) => roundFrame(f, precision));
  }

  return {
    id: options.id ?? newId(),
    frames: processed,
    // Reflect the downsampled cadence, not the raw capture rate.
    fps: options.fps ?? estimateFps(processed),
    view: options.view ?? "side",
  };
}
