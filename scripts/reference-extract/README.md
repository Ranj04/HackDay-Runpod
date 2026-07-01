# Reference-extract pipeline

Turn a real shooting clip into a contract-valid `PoseFrame[]` reference "echo" for
`fixtures/reference/generated/`. Runs MediaPipe Pose (`pose_landmarker_lite` — the
same model `src/lib/vision/poseLandmarker.ts` loads in the browser), so the output
is byte-compatible with the `PoseFrame` contract in `src/lib/contracts.ts`.

This is the offline sibling of the in-app `/dev/reference` harness
(`src/lib/vision/extractFromVideo.ts`): same model and output shape, but it can
chew through a long clip and auto-locate the shot instead of needing a hand-trimmed
upload.

## Setup

```bash
cd scripts/reference-extract
python3 -m venv .venv && source .venv/bin/activate   # optional
pip install -r requirements.txt
```

The pose model downloads automatically next to the script on first run.

## Get a clip

Any local video works. To pull one from YouTube (prefer a side-on slow-motion
shooting-form clip, not broadcast game footage):

```bash
pip install yt-dlp
# progressive mp4, no ffmpeg merge needed:
yt-dlp -f 18 --extractor-args "youtube:player_client=android,web_safari" \
  -o curry.mp4 "https://www.youtube.com/watch?v=<id>"
```

## Extract

```bash
# auto-locate the cleanest side-on shooting rep:
python extract_reference.py --video curry.mp4 \
  --out ../../fixtures/reference/generated/curry.json \
  --montage check.png

# or force a known-good release timestamp (seconds) after eyeballing check.png:
python extract_reference.py --video curry.mp4 --release 188.0 \
  --out ../../fixtures/reference/generated/curry.json --montage check.png
```

**Always open the `--montage` PNG.** It overlays the extracted skeleton back on the
source frames. Broadcast footage has multiple people, and `num_poses=1` can lock
onto the wrong player — the montage is how you catch that before committing a bad
reference. Re-run with `--release` on a good segment if the auto-pick is off.

## Adopt

`src/lib/analysis/reference.ts` imports the active reference. Swapping it shifts
every flaw band in `src/lib/analysis/flaws.ts` (they're tuned around the reference
metrics), so after replacing the JSON:

```bash
npx tsx src/lib/__verify__/compareReference.ts   # inspect new vs old metrics
npx tsx src/lib/__verify__/checkAnalysis.ts       # confirm the analysis gate holds
```

Then adjust bands/weights in `flaws.ts` if the new reference makes a metric
over- or under-flag. See `fixtures/reference/generated/README.md` for the current
Curry reference's known view/framing caveats.
