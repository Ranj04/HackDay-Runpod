# PROMPT B — PARTNER: PLATFORM + INTEGRATIONS

> Run in Claude Code AFTER Prompt 0 and Prompt 0.7 are complete and pushed.
> You and Ranjiv BOTH work directly on `main` — there are NO feature branches.
> First command: `git checkout main && git pull origin main`.
>
> **PARALLEL-ON-MAIN RULES (read first):**
> - You own ONLY the PERSON B folders in `OWNERSHIP.md`. Do NOT touch `vision`, `analysis`, `coach`, `capture`, or `overlay` (Ranjiv's). Folder discipline is the only thing preventing collisions.
> - Before EVERY push: `git pull --rebase origin main`. Commit and push small and often.
> - Never edit `src/lib/contracts.ts`. You consume Ranjiv's core through the contract types; until it lands, build against a MOCK returning a valid `AnalysisResult`.

You're building the platform half of **Ghost**: the app shell, accounts, persistence, deployment, the PvP stake, and submission packaging. Your job is to make the core usable, persistent, deployed, and sponsor-complete.

**Follow the GATING PROTOCOL from Prompt 0** (VERIFY -> COMMIT+PUSH -> NOTIFY if `[INTERFACE]` -> HARD STOP, wait for `GO`). Every push goes to `main` after a `git pull --rebase`. Keep each phase minimal.

---

## PHASE B1 — App shell + mocked core
**Build:**
- `src/lib/__mocks__/analyzeShot.ts` — a mock implementing `AnalyzeShot` + `CoachFlaw` from the fixtures, returning a realistic `AnalysisResult` + `CoachingResult`. This unblocks you before Ranjiv's core lands.
- `src/app/` — routes/layout for landing -> capture -> results -> history; wire shadcn. The capture page renders a placeholder where Ranjiv's `<CaptureView>` slots in (typed prop boundary, not a direct import yet).
- `<ResultsView>` in `src/components/results/` — renders an `AnalysisResult` + `CoachingResult`: score, top flaw, the drill with citation, a slot for the ghost overlay.

**VERIFY:** app runs; capture -> results flows end to end on MOCK data; results show score, flaw, cited drill.
**COMMIT + PUSH:** stage owned files, commit `feat(app): shell + results view on mocked core`, `git pull --rebase origin main`, `git push origin main`.
**HARD STOP.**

---

## PHASE B2 — InsForge auth + persistence
**Build** in `src/lib/db/`:
- Initialize the InsForge client (auth + database); implement sign-in/sign-up.
- Persist each session: the `AnalysisResult` summary (score, topFlaw, timestamp) and the `CoachingResult` per user.
- A history/progress page (`src/app/history`): list past sessions, score-over-time, per-flaw recurrence ("elbow flared in 4 of last 6 sessions").

**VERIFY:** sign in, complete a (mock) session, see it saved; reload and history persists; progress chart renders from stored data.
**COMMIT + PUSH:** stage owned files, commit `feat(db): insforge auth + session persistence + progress`, `git pull --rebase origin main`, `git push origin main`.
**HARD STOP.**

---

## PHASE B3 — Deploy (Vercel) + Nebius reference-builder (stretch)  `[INTERFACE]`
Two parts. Part 1 is required and quick. Part 2 is a HARD-CAPPED stretch — only if everything else is on track, never at the demo's expense.

**Part 1 — Deploy the frontend (required):**
- Deploy the Next.js app to **Vercel** (Nebius is AI compute, not a frontend host — don't force it to serve the web app). Get a live demo URL.

**Part 2 — Nebius reference-builder (STRETCH, 90-min hard cap):**
The ghost reference is a hardcoded exemplar — the soft spot a judge pokes with "whose form is that?". Use Nebius serverless GPU (a Job/DevPod per Nebius docs — container, pick a GPU, run) to process a few real shooter clips with a heavier/3D pose model OFFLINE and generate improved reference keypoint data.
- Output to `fixtures/reference/generated/` — do NOT overwrite the existing `fixtures/reference/` in place (Ranjiv's thresholds are tuned to it). Adoption is a joint call at integration.
- If the GPU job won't work within the cap, STOP, keep the hardcoded reference, note in the architecture doc that the builder is designed but the demo uses the curated reference. Don't fake generated data.

**VERIFY:** Part 1 — live Vercel URL serves the app. Part 2 (if attempted) — `fixtures/reference/generated/` has valid `PoseFrame[]` JSON parsing against the contract.
**COMMIT + PUSH:** stage owned files, commit `feat(deploy): vercel frontend` (+ `feat(nebius): reference-builder job` if done), `git pull --rebase origin main`, `git push origin main`.
**NOTIFY PARTNER:** boxed — (a) the live Vercel URL, (b) whether a Nebius-generated reference exists for Ranjiv to review, or the curated one stands (it touches his thresholds).
**HARD STOP.**

---

## PHASE B4 — Kite PvP form-battle stake  `[INTERFACE]`
Keep it HONEST: a skill-based form battle settled with TESTNET tokens for the demo — not real-money gambling. Say so in the UI copy.

**Build** in `src/lib/payments/`:
- A "form battle" flow: two signed-in users each record a shot; both scored by the same `analyzeShot`; higher score wins.
- Use Kite (Agent Passport + x402 testnet path per Kite docs): each player's agent has an identity and a spending limit the user sets; the stake settles on-chain to the winner on kite-testnet via the facilitator. Use faucet tokens.
- If the Kite testnet path can't be made reliable within a hard 90-min cap, fall back to a clearly-labeled "settlement simulated on testnet" mode that still calls the Kite identity/limit APIs for what works, and note the limit in the architecture doc. Do NOT fake a successful on-chain tx.

**VERIFY:** two test users run a battle; higher score wins; a testnet settlement (real or clearly-labeled simulated) completes and shows in UI.
**COMMIT + PUSH:** stage owned files, commit `feat(payments): kite pvp form-battle stake (testnet)`, `git pull --rebase origin main`, `git push origin main`.
**NOTIFY PARTNER:** boxed — state whether Kite settlement is REAL on-chain or labeled-simulated, so Ranjiv knows what's safe to claim in the demo.
**HARD STOP.**

---

## PHASE B5 — FinChip submission packaging
**Build** in `src/lib/finchip/`:
- Package the coaching capability (the `coachFlaw` skill — "given a basketball form flaw, return a cited corrective drill") as a FinChip ownable/tradeable skill asset for submission. Produce the manifest/metadata FinChip requires + a short description.
- `docs/SUBMISSION.md` — every sponsor tool and where it's used, the FinChip asset reference, and the Growing Pines overall-prize note (Growing Pines has nothing to integrate — it's prize eligibility; just make the submission complete and strong).

**VERIFY:** FinChip asset packages without error; `SUBMISSION.md` covers all eight sponsors.
**COMMIT + PUSH:** stage owned files, commit `chore(submission): finchip skill asset + submission doc`, `git pull --rebase origin main`, `git push origin main`.
**HARD STOP.**

---

## PHASE B6 — Integration prep  `[INTERFACE]`
**Build:**
- Make swapping the mock for Ranjiv's real core a ONE-LINE change: every consumer imports `analyzeShot`/`coachFlaw` from a single `src/lib/core.ts` indirection that currently points at the mock. At integration you flip that one import.

**VERIFY:** only `src/lib/core.ts` references the mock; everything else imports from it.
**COMMIT + PUSH:** stage owned files, commit `refactor: single-point core indirection for integration`, `git pull --rebase origin main`, `git push origin main`.
**NOTIFY PARTNER:** boxed — "Platform integration-ready on main. Mock isolated behind src/lib/core.ts — one-line swap to your real core. Auth, history, Vercel deploy, Kite battle, FinChip all in. Ready when you are."
**HARD STOP** — wait for the JOINT FINAL.

---

## JOINT FINAL — INTEGRATION & DEMO  (together, screen-shared, after BOTH B6 and A6 are pushed)
You've both pushed to `main` throughout, so it's already integrated — nothing to merge.
1. `git pull origin main` on a clean tree.
2. Flip `src/lib/core.ts` from the mock to Ranjiv's real `analyzeShot`/`coachFlaw`.
3. Run the full app: sign in -> record -> flaw + ghost + cited drill -> saved to history -> optional PvP stake.
4. **VERIFY:** full end-to-end from a fresh clone + `npm install`, on the Vercel URL.
5. **COMMIT + PUSH** `main`. Rehearse the 60-second demo twice; keep a pre-recorded clip loaded as the fallback so a live-camera miss never breaks the run.