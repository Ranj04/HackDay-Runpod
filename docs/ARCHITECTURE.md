# Ghost — Architecture & Design

## 1. Problem

Most players literally can't see their own jump shot. You feel the shot from the
inside, but the flaw — a flying elbow, a guide hand that pushes, a dip that's too
shallow — lives in a view you never get to watch. Coaches fix this by standing
beside you and pointing at the gap between what you do and what good form looks
like. Without that reference, "perfect your shot" is unactionable advice. Ghost
recreates the coach's eye: it films one shot, finds your single biggest form
flaw, shows you the gap against a reference, and hands you one cited drill plus a
generated coaching note to close it.

## 2. System diagram

```mermaid
flowchart TD
    cam[Camera in browser] --> pose[MediaPipe Pose Landmarker - client side]
    pose --> rel[Release detection - find the release frame]
    rel --> met[Joint metrics - elbow, knee, wrist, guide hand, release height]
    met --> align[Reference alignment - scale-normalize + temporal align on release]
    align --> flaw[Flaw detection - rank gaps vs reference]

    flaw --> coach[Coaching layer]
    coach --> you[You.com - retrieve the flaw-specific drill]
    coach --> tav[Tavily - fetch supporting sources]
    you --> gen[Nebius Token Factory - generate grounded coaching note]
    tav --> gen
    gen --> persist[InsForge - persist session + progress]
    flaw --> persist
    persist --> results[Results view + ghost skeleton overlay]

    %% Side branch: player-vs-player on-chain stake
    flaw -. score .-> pvp[Kite PvP - settle testnet stake to winner]
    pvp -. result .-> persist

    %% Infra
    host[Vercel - frontend host] -.-> results
    refbuild[Nebius GPU - offline reference-builder, stretch] -.-> align
```

The spine is fully client-side through flaw detection. Only the coaching step
(You.com retrieval, Tavily sources, Nebius generation) and persistence (InsForge)
cross the network, and the drill/coaching calls are cached. The Kite PvP stake is
a side branch off the score — the core coaching product never depends on it.

## 3. Data flow

A capture's life, end to end:

1. **Birth — `ShotCapture`.** The capture component films the shot and runs
   MediaPipe per frame, producing `PoseFrame[]`. Wrapped with `fps`, a `view`
   (`side` primary), and an `id`, this is a `ShotCapture` — validated against
   `ShotCaptureSchema` in `src/lib/contracts.ts`.
2. **Analysis — `ShotCapture → AnalysisResult`.** `analyzeShot(capture)` detects
   the release frame, derives `JointMetrics`, scale-normalizes (by torso length)
   and temporally aligns the keypoints against the reference exemplar, ranks the
   deviations into `Flaw[]`, picks the `topFlaw`, computes a `score`, and attaches
   the aligned `ghostRef` pose to overlay. Output is an `AnalysisResult`.
3. **Coaching — `Flaw → CoachingResult`.** `coachFlaw(topFlaw)` retrieves a
   flaw-specific drill (You.com) and supporting citations (Tavily), then has
   Nebius Token Factory write a short coaching note grounded *only* in what was
   retrieved plus the user's real metrics. Returns a `CoachingResult`.
4. **Persistence.** The `AnalysisResult` (score, topFlaw, metrics) plus the
   `CoachingResult` are written to InsForge under the authenticated user, so the
   results/ghost-overlay view can render them and progress can be tracked across
   sessions.
5. **Optional PvP.** In a form battle, two users each record a shot, both scored
   by the same `analyzeShot`; the higher score wins and a small testnet stake
   settles on-chain to the winner via Kite. The outcome is persisted to InsForge.

The contract types are the only shapes that cross the A/B boundary, so either
half can be rebuilt independently as long as it honors `contracts.ts`.

## 4. Key design decisions & tradeoffs

- **Off-the-shelf pose model, not a trained one.** We use MediaPipe's Pose
  Landmarker as-is. There's no labeled jump-shot dataset we could collect and
  train against in a day, and a half-trained model would be worse than a proven
  one. The real engineering is the analysis layer on top — release detection,
  alignment, flaw ranking — not the keypoint detector underneath it.
- **Directional, reference-based feedback — not absolute biomechanical
  precision.** This is the most important honesty in the project. A 2D pose
  estimate measures angles *in the image plane*, not true 3D joint angles. A
  camera that isn't perfectly side-on will read an elbow angle that's off by real
  degrees. So we deliberately do **not** report "your elbow is at 84.3°." We
  constrain capture to one view (side-on primary), compare against a reference,
  and report flaws *directionally* — "elbow flaring out," "release is late,"
  "dip too shallow." Directional feedback is robust to the exact thing 2D pose is
  bad at, and it's also how a human coach actually talks.
- **Reference alignment removes body-size and timing confounds.** Before
  comparing a user's pose to the ghost, keypoints are scale-normalized by torso
  length and the sequences are temporally aligned on the detected release frame.
  So the visible "gap" reflects *form*, not the fact that the user is taller than
  the reference or shot a beat earlier.
- **Retrieval-grounded coaching.** You.com and Tavily retrieve; Nebius generates.
  The generated note may not introduce facts absent from the retrieved sources —
  that's the guardrail against confident hallucinated advice.
- **Client-side inference for demo reliability.** Pose runs in the browser, so
  the core experience works without conference wifi. Only the drill/coaching
  calls are networked, and they're cached. A demo that doesn't depend on the
  venue's network is a demo that doesn't die on stage.

## 5. What we deliberately cut

- **Real-time multiplayer beyond the single PvP stake.** One async form battle,
  settled once. No lobbies, no live head-to-head.
- **Multi-sport.** Basketball jump shot only. The analysis layer is shot-specific
  on purpose.
- **Mobile-native apps.** Browser-only. No iOS/Android builds.
- **Absolute biomechanical scoring.** Covered above — directional feedback over
  false-precision degrees, no "your form is 87/100 vs the NBA average" claim we
  can't stand behind.
