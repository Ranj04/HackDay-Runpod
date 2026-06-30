# Ghost — Wizard Hackathon Submission

## Project

- **Track:** Sports Arena
- **Live demo:** <https://ghost-lemon-phi.vercel.app>
- **Repository:** <https://github.com/Ranj04/Ghost>
- **FinChip asset:** `src/lib/finchip/ghost-shot-coach/`
- **FinChip slug:** `ghost-shot-coach_finchip`

### One-line pitch

Ghost films a basketball shot, finds the single form flaw that matters most,
shows the gap against an aligned reference pose, and returns one source-cited
drill to correct it.

## Demo path

1. Open **Analyze** and record a side-view shot, or use the sample capture.
2. Review the form score, highest-priority flaw, reference overlay, and cited
   corrective drill.
3. Save the session and open **History** to see score-over-time and recurring
   flaws.
4. Optionally open **Battle** to compare two shots scored by the same analyzer.
   The Kite receipt is visibly simulated and uses test tokens only.

## Eight-tool sponsor and partner map

| Tool | Where Ghost uses it | Submission status |
| --- | --- | --- |
| **You.com** | Flaw-specific drill retrieval in the coaching pipeline (`src/lib/coach/youcom.ts`). | **Live and verified.** Returns a real flaw-targeted drill with a resolving source URL (e.g. Breakthrough Basketball's elbow-shooting drill), cached by flaw id. |
| **Tavily** | Supporting technique/biomechanics sources for the coaching references list (`src/lib/coach/tavily.ts`). | **Live and verified.** Returns 1–2 supporting references (e.g. r/BasketballTips, technique video) that resolve at request time. |
| **Nebius** | Token Factory writes the grounded coaching note from the retrieved drill + sources + the flaw's measured numbers (`src/lib/coach/nebius.ts`). | **Live and verified.** `meta-llama/Llama-3.3-70B-Instruct` on Token Factory generates a note that cites the actual measured vs reference angles and invents nothing; degrades to a curated note if the call fails. |
| **InsForge** | Email/password auth (with email-code verification), per-user session persistence, score history, and flaw recurrence (`src/lib/db/`, `src/app/auth/`, `src/app/history/`). | **Live and configured.** Backend reachable, `ghost_sessions` table created with row-level security (insert/select scoped to `auth.uid()`); server actions authenticate via the access-token cookie. Falls back to local-demo storage only when env keys are absent. |
| **Kite** | Agent identities, user-set spending limits, and x402 settlement boundary for Form Battle (`src/lib/payments/`, `src/app/battle/`). | **Labeled simulation.** No funded/passkey-approved Passport session exists, so no on-chain transaction or tx hash is claimed. |
| **FinChip** | Packages `coachFlaw` as a reusable ERC-1155 skill asset with manifest, metadata, schemas, guardrails, and content hash (`src/lib/finchip/ghost-shot-coach/`). | Package-ready and locally validated against FinChip CLI v0.3.1’s `chip.json` format. Not minted: no `fc_key`, registered wallet, chain funds, or Pinata credential was available. |
| **Trae / Replit** | Build-workflow attribution and hackathon development environments. Vercel hosts the production frontend. | Built-with tooling, not presented as a runtime product integration. |
| **Growing Pines** | Overall winning-project prize eligibility. | No API or SDK exists to integrate; eligibility comes from submitting the complete project. |

## FinChip asset details

The asset packages the capability:

> Given a measured basketball form flaw, return one plain-language correction
> and one actionable, source-cited drill.

- Token standard: ERC-1155
- License: MIT
- Price: free
- Supply: unlimited
- Royalty: 2.5%
- Typed input: Ghost `Flaw`
- Typed output: Ghost `CoachingResult`
- Content hash: SHA-256 of `SKILL.md`
- CLI launch command after wallet/IPFS setup:
  `finchip launch src/lib/finchip/ghost-shot-coach`

Local package verification:

```bash
node src/lib/finchip/ghost-shot-coach/validate-package.mjs
```

## Architecture and safety

- Pose capture and analysis run in the browser for demo reliability.
- Feedback is directional, not a claim of clinical 3D biomechanical precision.
- Coaching output must cite its drill source and cannot invent references.
- The ghost is a curated exemplar, not a universal definition of perfect form.
- Form Battle is a skill challenge with test tokens, not real-money gambling.
- Kite settlement is simulated and displays no transaction hash.

## Live vs. honestly-simulated

- **Live and verified end-to-end:** You.com drill retrieval, Tavily reference
  retrieval, Nebius grounded note generation, and InsForge auth + per-user
  history persistence all run against real credentials.
- **Honestly simulated:** Kite Form Battle settlement is a clearly-labeled
  testnet simulation (no funded Passport session; no on-chain tx or tx hash is
  claimed). FinChip is package-ready and locally validated but **not minted**
  (no `fc_key`/wallet/IPFS credential), so it ships as a publishable asset.

The demo never claims a successful external operation it did not perform.

## Growing Pines note

Ghost is submitted for Growing Pines overall-prize eligibility. Growing Pines
has no technical integration requirement; this document, the live demo, and the
repository constitute the complete project submission.
