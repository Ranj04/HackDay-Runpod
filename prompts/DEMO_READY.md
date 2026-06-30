# PROMPT — MAKE GHOST DEMO-READY

> Paste this whole file into Claude Code from the project root (`~/Ghost`).
> It takes the project from "feature-complete" to "deployed, tested, rehearsed."

## Context (read first — don't redo finished work)

**Ghost** is a basketball shot-form coach. Film a shot in the browser → client-side
MediaPipe pose → analysis finds the single biggest form flaw → an animated
"form vs ghost" canvas shows it → a cited drill + coaching note is retrieved →
sessions persist → optional PvP "form battle".

**Already built and working (do NOT rebuild — verify, then move on):**
- `src/lib/vision/**` — camera capture, pose, confidence-gating, full-body framing guard
- `src/lib/analysis/**` — `analyzeShot` (release detection, metrics, alignment, flaw detection, scoring); the gate `src/lib/__verify__/checkAnalysis.ts` passes
- `src/lib/coach/**` — `coachFlaw`: You.com drill + Tavily sources + Nebius note, cached, with a curated offline fallback
- `src/components/overlay/**` — the animated canvas: white "you" skeleton, faint blue "ghost" echo, basketball arcing into a holographic hoop with a swish + shot-arc tracer, one orange flaw marker. This is the signature — keep it.
- Sitewide theme: dark blue/orange/black-white, fonts Saira (display) / Hanken Grotesk (body) / JetBrains Mono (numbers) via `next/font`. Tokens in `src/app/globals.css`, mirrored in `src/components/overlay/palette.ts`.
- `/results` renders the real canvas via the `ghostOverlay` slot; `src/lib/core.ts` is the single integration point (`analyzeShot`/`coachFlaw` + a `mockShotCapture` sample input).

**Ground rules:**
- NEVER edit `src/lib/contracts.ts` shapes. Build against them.
- Keep the theme + the canvas. Don't regress them.
- Real keys live in `.env.local` (gitignored): You.com, Tavily, Nebius, InsForge are set. Kite/FinChip may be empty.
- Work on `main`; `git pull --rebase origin main` before each push. Commit small.
- The project must stay OUT of `~/Documents` (iCloud). It's at `~/Ghost` now — keep it there.

**Gating per phase:** VERIFY (run the check, fix failures, print result) → COMMIT + PUSH → print `=== PHASE DN COMPLETE — type GO ===` and wait.

---

## PHASE D0 — Health check
- `npm install` (deps moved with the folder; confirm clean).
- `npx tsc --noEmit` passes, `npm run lint` clean, `npm run build` succeeds.
- `npm run dev`, then confirm every route returns 200: `/`, `/capture`, `/results`, `/history`, `/battle`, `/auth`.

**VERIFY:** build green; all six routes 200; the landing hero auto-plays the shooting animation (ball arcs into the hoop).
**COMMIT + PUSH** any fixes. **HARD STOP.**

---

## PHASE D1 — Live capture → results (the most important gap)
Today `/results` analyzes `mockShotCapture` (a fixture), not the user's actual recorded shot. Wire the real flow:
- On the capture page, when `<CaptureView>` returns a `ShotCapture`, persist it (e.g. `sessionStorage` or a small client store) and route to `/results`.
- `/results` should read that captured shot and run `analyzeShot`/`coachFlaw` on it, falling back to `mockShotCapture` only when none exists (so the demo never blanks).
- Respect the Server Action body-size limit (capture frames are already downsampled in `buildCapture`).

**VERIFY:** stand back side-on, record a real shot, and the results page shows YOUR shot in the canvas with your real score, flaw, metrics, and a cited drill — not the fixture.
**COMMIT + PUSH** `feat: live capture flows into results`. **HARD STOP.**

---

## PHASE D2 — Verify live coaching
- With `.env.local` keys loaded, confirm `coachFlaw` returns a LIVE result (not curated): a flaw-specific drill with a real You.com `sourceUrl`, 1–2 Tavily references that resolve, and a Nebius-generated note that cites the user's actual metric numbers and invents nothing.
- Confirm it's cached by `flaw.id` so the demo never waits on a live call twice.

**VERIFY:** print the coaching source path = "live", the drill title + source URL, and the generated summary. If a provider fails, confirm it degrades to curated without crashing.
**COMMIT + PUSH** any fixes. **HARD STOP.**

---

## PHASE D3 — InsForge auth + history
- Sign up / sign in works; a completed session saves (score, topFlaw, timestamp, coaching) under the user.
- `/history` lists past sessions with score-over-time and per-flaw recurrence; reload persists.
- Empty state is an invitation ("Record your first shot"), not an error.

**VERIFY:** sign in → run a session → see it in history → reload → still there.
**COMMIT + PUSH** any fixes. **HARD STOP.**

---

## PHASE D4 — Kite PvP battle
- Two signed-in users each record/analyze a shot; higher score wins.
- Settle a small TESTNET stake via Kite if configured; otherwise keep the clearly-labeled "settlement simulated on testnet" mode. UI must say it's testnet/skill-based, not real-money. NEVER fake a successful on-chain tx.

**VERIFY:** run a battle end-to-end; winner + settlement (real or labeled-simulated) shows; copy is honest.
**COMMIT + PUSH** any fixes. **HARD STOP.**

---

## PHASE D5 — Submission packaging
- Package the `coachFlaw` capability as a FinChip skill asset if a key exists; otherwise produce the manifest/metadata and note it's ready to publish.
- Write/refresh `docs/SUBMISSION.md`: every sponsor (You.com, Tavily, Nebius, InsForge, Kite, FinChip, Trae/Replit, Growing Pines) with where it's used and why it matters; link the live URL and the FinChip asset.

**VERIFY:** `docs/SUBMISSION.md` covers all sponsors with non-empty entries.
**COMMIT + PUSH** `chore(submission): finchip asset + submission doc`. **HARD STOP.**

---

## PHASE D6 — Deploy to Vercel
- Deploy the Next.js app to Vercel; set all `.env.local` vars in the Vercel project (server-only keys NOT prefixed `NEXT_PUBLIC_`).
- Get a live demo URL.

**VERIFY:** the live URL loads; landing animates; `/results` works; camera permission prompts over HTTPS.
**COMMIT + PUSH.** **HARD STOP.**

---

## PHASE D7 — Final demo QA + rehearsal
- Walk the full flow on the DEPLOYED URL: landing → capture (record real shot) → results → history → battle.
- The "one-thing" rule: the form-vs-ghost canvas is clearly the hero; everything else is quiet and consistent. Remove any decoration not earning its place.
- Passes: mobile width, visible keyboard focus, `prefers-reduced-motion` (animation still legible, no motion).
- Record a **pre-recorded fallback clip** of a clean run so a live-camera miss never breaks the demo.
- Rehearse the 60-second demo twice.

**VERIFY:** full flow works from a fresh load on the live URL; fallback clip ready.
**COMMIT + PUSH.** **DONE — Ghost is demo-ready.**

---

## Demo-ready checklist (all must be true)
- [ ] `tsc`, `lint`, `build` all green
- [ ] Live recorded shot flows camera → analysis → results (not the fixture)
- [ ] Live coaching returns a real cited drill + grounded note (degrades gracefully)
- [ ] Auth + history persist; honest empty state
- [ ] PvP battle runs; settlement honest (testnet/simulated, never faked)
- [ ] Deployed to a live HTTPS URL with env vars set
- [ ] `docs/SUBMISSION.md` covers every sponsor
- [ ] Fallback clip recorded; 60s demo rehearsed
