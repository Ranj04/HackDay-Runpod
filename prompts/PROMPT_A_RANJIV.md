# PROMPT A — RANJIV: VISION + COACHING CORE

> Run in Claude Code AFTER Prompt 0 and Prompt 0.7 are complete and pushed.
> You and your partner BOTH work directly on `main` — there are NO feature branches.
> First command: `git checkout main && git pull origin main`.
>
> **PARALLEL-ON-MAIN RULES (read first):**
> - You own ONLY the PERSON A folders in `OWNERSHIP.md`. Touch nothing else — folder discipline is the only thing preventing collisions.
> - Before EVERY push: `git pull --rebase origin main`. Commit and push small and often.
> - Never edit `src/lib/contracts.ts`. If a contract must change, that's a NOTIFY PARTNER gate — stop and coordinate first.

You're building the intelligence half of **Ghost**: the part that turns a video of a basketball shot into a detected flaw, a visible reference "ghost," and a cited fix. This is the demo-electric, technical-depth half — and it's the answer to "where's the real engineering here," so build it to be defensible, not flashy-but-hollow.

**Follow the GATING PROTOCOL from Prompt 0** (VERIFY -> COMMIT+PUSH -> NOTIFY if `[INTERFACE]` -> HARD STOP, wait for `GO`). Every push goes to `main` after a `git pull --rebase`. Keep each phase minimal.

---

## PHASE A1 — Camera capture + live skeleton overlay
**Build** in `src/lib/vision/` and `src/components/capture/`:
- A `useCamera` hook (getUserMedia) and a `<CaptureView>` rendering the webcam.
- Initialize MediaPipe Pose Landmarker (client-side, `@mediapipe/tasks-vision`), run it per frame, draw the skeleton on a `<canvas>` over the video.
- Produce a `ShotCapture` (per contract) from a short recording: buffer `PoseFrame`s while recording, stop, return the capture. Default `view: 'side'`.

**VERIFY:** live camera skeleton tracks in real time; a few seconds of recording yields a `ShotCapture` that validates against the Zod schema.
**COMMIT + PUSH:** stage owned files, commit `feat(vision): camera capture + live pose skeleton`, `git pull --rebase origin main`, `git push origin main`.
**HARD STOP.**

---

## PHASE A2 — Release detection + metric extraction
**Build** in `src/lib/analysis/`:
- `detectRelease(capture)` — find the release frame via peak upward wrist velocity (shooting hand), with a fallback heuristic. Return `releaseFrameIndex`.
- `extractMetrics(capture)` -> `JointMetrics`: release elbow angle, knee flexion at the dip, wrist-snap timing, guide-hand presence, release height. Angles from 2D image-plane keypoints; comment that these are view-dependent (side-on).

**VERIFY:** `src/lib/__verify__/checkAnalysis.ts` against `fixtures/sample-shot.json` — `releaseFrameIndex` within tolerance of `ground-truth.json`. Print metrics.
**COMMIT + PUSH:** stage owned files, commit `feat(analysis): release detection + joint metrics`, `git pull --rebase origin main`, `git push origin main`.
**HARD STOP.**

---

## PHASE A3 — Reference alignment + flaw detection  `[INTERFACE]`
This is the layer that answers "where's the real engineering." Make it substantive — not three `if` statements.

**Build** in `src/lib/analysis/`:
- `normalize(frames)` — scale-normalize keypoints by torso length, center on the hip (body-size-invariant).
- `alignToReference(userFrames, refFrames)` — temporally align on the detected release frame so phases line up.
- `detectFlaws(metrics, reference)` — compare each metric to the reference band; produce `Flaw[]` sorted by severity; pick `topFlaw`. Severity = how far outside the band.
- `scoreForm(metrics, reference)` — transparent 0-100 score (document the rubric: weighted distance across metrics).
- Assemble + export `analyzeShot: AnalyzeShot` returning a full `AnalysisResult` including `ghostRef` (aligned reference frames).

**VERIFY:** `checkAnalysis.ts` passes fully — detected `topFlaw.id` matches ground truth on the injected-flaw fixture.
**COMMIT + PUSH:** stage owned files, commit `feat(analysis): reference alignment + flaw detection + scoring`, `git pull --rebase origin main`, `git push origin main`.
**NOTIFY PARTNER:** boxed — "`analyzeShot()` is live on main, full AnalysisResult per contract. Drop the mock after you pull. Interface unchanged."
**HARD STOP.**

---

## PHASE A4 — Ghost overlay
**Build** in `src/components/overlay/`:
- `<GhostOverlay>` — renders the user's skeleton AND the aligned `ghostRef` skeleton on one canvas, visually distinct, `topFlaw` joint highlighted so the gap is obvious.
- A scrub/playback control to step through the shot.

**VERIFY:** on `sample-shot.json` or a live recording, both skeletons render aligned, flawed joint highlighted, gap visible to the eye.
**COMMIT + PUSH:** stage owned files, commit `feat(overlay): ghost reference overlay + flaw highlight`, `git pull --rebase origin main`, `git push origin main`.
**HARD STOP.**

---

## PHASE A5 — Coaching chain: retrieve (You.com + Tavily) -> generate (Nebius)
A RAG chain; each tool does ONE honest job so none is redundant.

**Build** in `src/lib/coach/`:
- **Retrieve — You.com:** build a FLAW-SPECIFIC query (not generic) from the `Flaw`, call You.com, get one concrete corrective drill with title, steps, real `sourceUrl`/`sourceTitle`.
- **Retrieve — Tavily:** 1-2 supporting biomechanics/technique references for the same flaw -> `references[]`. (You.com = the drill; Tavily = the why/sources.)
- **Generate — Nebius:** synthesize the drill + sources + the user's actual `metrics` into a personalized `summary` using a Nebius Token Factory hosted open model (Qwen/Llama) via the OpenAI SDK pointed at `https://api.tokenfactory.nebius.com/v1/` with `NEBIUS_API_KEY`. It must ground on the retrieved sources and NOT invent facts.
- `coachFlaw: CoachFlaw` returns the assembled `CoachingResult`.
- Cache by `flaw.id` so the demo never depends on a live call on stage.

**VERIFY:** per known flaw id: (1) drill is specific to THAT flaw (elbow flare -> elbow/alignment drill, not generic tips) with a real citation; (2) Tavily refs resolve; (3) the Nebius summary cites the user's actual metric numbers + the retrieved drill and adds nothing absent from the sources. Print the model/endpoint used.
**COMMIT + PUSH:** stage owned files, commit `feat(coach): you.com + tavily retrieval, nebius coaching generation`, `git pull --rebase origin main`, `git push origin main`.
**HARD STOP.**

---

## PHASE A6 — Expose the core for integration  `[INTERFACE]`
**Build:**
- Export `analyzeShot` and `coachFlaw` from clean barrels (`src/lib/analysis/index.ts`, `src/lib/coach/index.ts`) exactly matching the contract — nothing extra leaking.
- A minimal local harness/demo page in YOUR component space (NOT `src/app`, your partner owns it) running capture -> analyze -> coach -> ghost end to end, to prove the core standalone.

**VERIFY:** end-to-end on a live recording: capture -> flaw -> ghost -> cited drill.
**COMMIT + PUSH:** stage owned files, commit `feat: vision+coaching core integration-ready`, `git pull --rebase origin main`, `git push origin main`.
**NOTIFY PARTNER:** boxed — "Core integration-ready on main. analyzeShot(capture) and coachFlaw(flaw) return full contract objects, cached. Flip src/lib/core.ts from the mock to my modules when you're ready — let's do it together."
**HARD STOP** — wait for the JOINT FINAL.

---

## JOINT FINAL — INTEGRATION & DEMO  (together, screen-shared, after BOTH A6 and B6 are pushed)
You've both pushed to `main` throughout, so it's already integrated — nothing to merge.
1. `git pull origin main` on a clean tree.
2. Flip `src/lib/core.ts` from the mock to the real `analyzeShot`/`coachFlaw` (one-line change your partner set up).
3. Run the full app: sign in -> record -> flaw + ghost + cited drill -> saved to history -> optional PvP stake.
4. **VERIFY:** full end-to-end from a fresh clone + `npm install`, on the Vercel URL.
5. **COMMIT + PUSH** `main`. Rehearse the 60-second demo twice; keep a pre-recorded clip loaded as the fallback so a live-camera miss never breaks the run.
