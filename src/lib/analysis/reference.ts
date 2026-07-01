// The reference "echo" exemplar and its derived metrics.
//
// The active reference is generated/curry.json — a real Stephen Curry (#30)
// side-on jump shot extracted from footage via MediaPipe Pose (see
// fixtures/reference/generated/README.md). It is a reference exemplar, NOT ground
// truth: publicly available Curry footage is broadcast game video, so this is a
// three-quarter/side view, which makes the framing/view-sensitive metrics
// (releaseHeight, guideHandPresence) noisier — the flaw bands in flaws.ts are
// widened accordingly.
//
// good-form.json (the original hand-authored exemplar) is kept as a fallback and
// is still what the __verify__ gate validates against.
import curry from "../../../fixtures/reference/generated/curry.json";
import goodForm from "../../../fixtures/reference/good-form.json";
import type { PoseFrame, ShotCapture } from "../contracts";
import { extractMetrics } from "./extractMetrics";

/** Hand-authored clean side-on exemplar (previous default; retained as fallback). */
export const GOOD_FORM_FRAMES = goodForm as PoseFrame[];

export const REFERENCE_FRAMES = curry as PoseFrame[];

export const REFERENCE_CAPTURE: ShotCapture = {
  id: "reference-curry",
  frames: REFERENCE_FRAMES,
  fps: 20,
  view: "side",
};

/** Metrics of the reference shot — the bands user metrics are compared against. */
export const REFERENCE_METRICS = extractMetrics(REFERENCE_CAPTURE);
