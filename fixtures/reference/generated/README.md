# Generated reference exemplars

Pose references extracted from real shooter footage via MediaPipe Pose
(`pose_landmarker_lite` — the same model the browser capture pipeline uses), so
the output is byte-compatible with the `PoseFrame[]` contract in
`src/lib/contracts.ts`.

## `curry.json`

- **Source:** Stephen Curry (#30) jump shot, side-on, from a public slow-motion
  compilation clip. Release rep auto-located by side-on geometry, then verified
  by overlaying the extracted skeleton back on the source frames.
- **Shape:** 18 frames over ~1.33 s at ~20 fps; 33 named landmarks per frame,
  normalized `x`/`y`, `score` = landmark visibility.
- **Caveat — angle:** publicly available Curry footage is broadcast game video,
  so this is a three-quarter/side view, not a pristine studio side-on. Good
  enough as a plausible pro-form echo; not gospel.

## `curry-alt.json`

- **Source:** a second real Curry (#30) jump shot, from in-game footage where he
  is larger/closer in frame. Correct-person tracking verified by montage.
- **Angle:** more frontal/three-quarter than `curry.json`. Kept as an alternate
  choice — not currently imported.
- **Shape:** 21 frames over ~1.37 s, same 33-landmark contract shape.

## Adopted

`src/lib/analysis/reference.ts` now imports `./generated/curry.json` as the active
reference (with `good-form.json` retained as `GOOD_FORM_FRAMES` fallback). The
view/framing-sensitive flaw bands in `src/lib/analysis/flaws.ts` were widened to
suit the real three-quarter footage (releaseHeight, guideHandPresence,
kneeFlexionAtDip). The analysis gate (`checkAnalysis.ts`) still passes.

To switch to the alternate: point `reference.ts` at `./generated/curry-alt.json`
and re-run `npx tsx src/lib/__verify__/compareReference.ts` +
`checkAnalysis.ts`, adjusting bands if a metric over/under-flags.

Both files were produced by `scripts/reference-extract/extract_reference.py`.
