## Prompt A — Inference & Fan-out (Ghost at Scale · Runpod Flash)

**Run after Prompt 0 (cleanup) is done and pushed to `main`.** First: `git checkout main && git pull origin main`.

**You own the Runpod/Flash GPU showcase:** GPU pose estimation → form scoring → parallel fan-out. Your teammate (Prompt B) owns Bright Data, RAG, UI, and **all of Insforge** (the backend). **Do not call Bright Data or Insforge — those are entirely B's domain.** Stay pure compute: take clips in, emit the contract JSON. B persists everything and supplies uploaded clips at integration; use local clips during dev.

**Shared-branch rule:** work on `main` alongside B. **Edit only your files:** `flash/pose_endpoint.py`, `flash/scoring.py`, `flash/orchestrate.py`, and `flash/reference/`. Do not edit RAG, frontend, Insforge, or docs — that's B's territory.

---

## Phase exit protocol (every phase)
Run the verify checks.
- **All pass →** `git add -A && git commit -m "[A] phase N: <summary>" && git pull --rebase origin main && git push origin main`, then **STOP** and report "pushed, awaiting go." If push is rejected, `git pull --rebase origin main` and retry push.
- **Any fail / unsure →** **STOP**, report exactly what's broken, do **not** commit or push. Never push a broken phase.

## Rules
- One phase at a time. Wait for my go between phases.
- Simplicity first — minimum code, no speculative abstraction.
- **HUMAN ACTION** lines are mine (auth/credentials).
- Flash anchors (don't invent): `from runpod_flash import Endpoint, GpuType`; `@Endpoint(name=..., gpu=GpuType.NVIDIA_GEFORCE_RTX_4090, dependencies=[...])` on async funcs; CPU worker `@Endpoint(name=..., cpu=...)` (EU-RO-1 only); serve with `flash run`; 500MB limit → `flash build --exclude torch,torchvision,torchaudio`.

## SHARED CONTRACT (identical in Prompt B — do not change unilaterally)
Your pipeline must emit exactly this:
```json
{
  "reps": [
    { "rep_id": "r1", "score": 42.0, "flaw_label": "low_release_elbow", "keypoints_uri": "optional" }
  ],
  "worst": ["r1", "r3"]
}
```
`score` 0–100 (lower = worse). `flaw_label` is a short string or `"none"`. `worst` is rep_ids ranked ascending by score. B's RAG endpoint consumes `flaw_label` and returns a cited drill (may include a `sources` array — B-internal, ignore it). Until integration, **mock** B's drill lookup.

---

## Phase 0 — Setup
**HUMAN ACTION:** `flash login`; confirm push access to `main`. Install the Flash skill (`github.com/runpod/skills` SKILL.md). Place one clean reference rep's keypoints in `flash/reference/`.

**Agent:** run the `hello-gpu` example to confirm a trivial `@Endpoint` round-trips to a real GPU.

**verify:** `hello-gpu` returns a GPU name from a remote worker.

## Phase 1 — GPU pose endpoint
Port Ghost's pose step to a `@Endpoint(gpu=...)` running **RTMPose via `rtmlib`** (deps: `rtmlib`, `onnxruntime-gpu`, `opencv-python`, `numpy`). Input one clip → output per-frame keypoints.

**verify:** one clip → keypoints with correct joint count + plausible coords; render one overlay frame locally and eyeball it.

## Phase 2 — Form scoring
**Reuse Ghost's existing shot-form scoring** — port it and adapt only the keypoint-schema seam to the RTMPose output; write from scratch only if none exists. Output `{score, flaw_label}` (release elbow angle, arc height, knee bend, follow-through).

**verify:** reference rep scores high; a deliberately bad clip scores low with a sensible `flaw_label`.

## Phase 3 — Fan-out (centerpiece)
A `@Endpoint(cpu=...)` (or local) dispatcher takes N clips and calls the Phase-1 GPU endpoint via `asyncio.gather` — workers scale 0→N in parallel. Score each, sort ascending, build the report.

**verify:** submit 5 clips → ~5 workers visible in the Runpod console → ranked report returned.

## Phase 4 — Emit the contract + mock RAG
Output the SHARED CONTRACT JSON exactly. Stub B's drill lookup (fake cited drill per `flaw_label`) so your pipeline runs end-to-end alone.

**verify:** full run produces valid contract JSON; mocked drills attach to worst reps.

## Phase 5 — Stretch (skip if short on time)
- **NetworkVolume** caching the RTMPose ONNX weights → faster second cold start.
- **Cost panel data:** sum CPU-seconds vs GPU-seconds per run, expose as JSON for B's UI.

**verify:** each independently; cost numbers update per run.

## Integration (DO WITH TEAMMATE)
Both streams are already on `main`. Replace your RAG mock with B's real Flash endpoint, run end-to-end on real clips (B supplies uploaded clips from Insforge storage), **pre-warm all endpoints before demoing**.
