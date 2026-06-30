// The reference "ghost" exemplar and its derived metrics.
//
// good-form.json is a single curated clean shot (a reference exemplar, NOT ground
// truth — see fixtures/reference/README.md). Flaw thresholds are tuned against
// these reference metrics. If Person B's Nebius reference-builder produces a new
// exemplar under fixtures/reference/generated/, adopting it is a joint call.
import goodForm from "../../../fixtures/reference/good-form.json";
import type { PoseFrame, ShotCapture } from "../contracts";
import { extractMetrics } from "./extractMetrics";

export const REFERENCE_FRAMES = goodForm as PoseFrame[];

export const REFERENCE_CAPTURE: ShotCapture = {
  id: "reference-good-form",
  frames: REFERENCE_FRAMES,
  fps: 30,
  view: "side",
};

/** Metrics of the reference shot — the bands user metrics are compared against. */
export const REFERENCE_METRICS = extractMetrics(REFERENCE_CAPTURE);
