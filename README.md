# Echo

You can usually *feel* when your jumpshot is off. What you can't do is see why — nobody gets to watch their own form from the outside, mid-shot, frame by frame. Coaches do that for you, if you're lucky enough to have one. Echo is our attempt to put a little of that in everyone's pocket.

Film a shot. Echo draws a skeleton on you, drops a second skeleton next to it — the "echo" of a clean reference shot — and shows you the gap. Then it tells you the one thing most worth fixing, and pulls a real, cited drill to fix that exact thing.

**"At Echo"** is the engineering story: pose estimation moves off the browser and onto fanned-out GPU workers on **RunPod Flash**, so one clip — or a whole batch of them — gets analyzed in parallel by server-side endpoints instead of a single phone.

## What it does

Record a few seconds of yourself shooting. Echo turns your motion into a set of measurements — elbow angle at release, how deep you load your knees, when your wrist snaps, whether your guide hand is along for the ride when it shouldn't be. It lines your shot up against a reference, finds your biggest flaw, and shows it: your skeleton, the echo's skeleton, and the joint that's off lit up between them.

From there it doesn't just say "fix your elbow." It finds a drill that targets *that* flaw, hands you the steps with a source you can go read, and writes a short, specific note grounded in your actual numbers. Every session gets saved, so over a week you can see whether that elbow flare is actually going away or whether you've just been nodding along.

Batch mode fans out multiple clips to parallel GPU workers and returns a ranked report — worst reps first, per-rep dimension scores, cited drills, and a cost/observability panel (GPU seconds, Bright Data requests, corpus size).

## How it works

1. **Capture** — the browser grabs your camera and records a short clip (with a live preview skeleton so you can frame yourself).
2. **Pose (RunPod Flash)** — the clip is sent to a GPU `@Endpoint` running RTMPose server-side. Fan-out across clips is what lets Echo scale past one device. Browser pose remains a fallback when Flash is unreachable.
3. **Find the release** — we detect the release frame from the peak of the shooting wrist's upward velocity, so every "at release" measurement is taken at the right moment.
4. **Measure** — joint angles and timings come out of the keypoints. These are 2D, image-plane measurements, so we keep the camera to one view and treat them as honest signals, not lab-grade numbers (more on that below).
5. **Compare** — your keypoints get size-normalized and time-aligned against the reference, so the gap we show reflects *form*, not the fact that you're taller than the reference or shot a beat slower.
6. **Coach** — a Flash-served RAG endpoint retrieves a drill from **Supabase pgvector** (with a **Bright Data** live fallback), then **Nebius** writes a short coaching note grounded in those sources and your real metrics.
7. **Remember** — the session, flaw, score, coaching, and optional clip/keypoints are stored in **Supabase** (`echo_sessions` + `echo-runs` storage) so progress is a thing you can actually watch.

## The stack

| Layer | Platform | Role |
|-------|----------|------|
| **Compute** | **RunPod Flash** | GPU pose (`echo-pose`), CPU RAG (`echo-coaching-rag`), ingestion (`echo-coaching-ingest`), fan-out orchestrator |
| **Web data** | **Bright Data** | Discover API fetches drill/technique content; feeds the coaching corpus |
| **Backend** | **Supabase** | Auth, Postgres (`echo_sessions`), **pgvector** (`coaching_documents`), Storage (`echo-runs`) |
| **Coaching LLM** | **Nebius (Token Factory)** | OpenAI-compatible note generation from retrieved sources + metrics |
| **App** | **Next.js + Tailwind + shadcn/ui** | Capture UI, echo-overlay canvas, results, ranked report, history |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the component-to-layer map and data flow.

## Build status

| Area | Status |
|------|--------|
| Analysis, scoring, echo-overlay | ✅ Pure TypeScript |
| Supabase auth + `echo_sessions` history + `echo-runs` storage | ✅ Wired (local-demo fallback when keys absent) |
| Nebius coaching note | ✅ Wired (curated fallback) |
| RunPod Flash GPU pose | ✅ `flash/pose_endpoint.py` + `/api/analyze` |
| Fan-out orchestrator + ranked report | ✅ `flash/orchestrate.py` + `/report` |
| Bright Data → embeddings → Supabase pgvector | ✅ `flash/ingest_coaching.py` |
| Cited RAG (pgvector + Bright Data fallback) | ✅ `flash/coaching_rag.py` |
| NetworkVolume RTMPose weight cache | ✅ On `echo-rtmpose-cache` volume |
| UI theme (blue + orange, light + dark, WCAG AA) | ✅ Semantic tokens across surfaces |

## Run it locally

You'll need Node 18+, Python 3.10–3.13 for Flash, and a webcam.

```bash
npm install
cp .env.local.example .env.local   # fill in keys below
npm run dev
```

For GPU pose and RAG locally, in a second terminal:

```bash
set -a; source .env.local; set +a
flash dev --auto-provision
```

Open `http://localhost:3000` and allow camera access.

### Environment variables

```bash
# Supabase (auth + Postgres + storage)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server-side inserts/uploads only

# Nebius (coaching note)
NEBIUS_API_KEY=
NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1/

# RunPod Flash
RUNPOD_API_KEY=
RUNPOD_FLASH_BASE_URL=            # deployed Flash base, or http://127.0.0.1:8888 for flash dev

# Bright Data + embeddings (Flash workers)
BRIGHTDATA_API_TOKEN=
OPENROUTER_API_KEY=
```

The app runs without keys — it falls back to local-demo storage and curated coaching content.

### Database migrations

SQL migrations live in `migrations/`. Apply them to your Supabase project (SQL editor or `supabase db push`):

1. `20260630200845_create-coaching-documents.sql` — pgvector corpus table + `match_coaching_documents` RPC
2. `20260630205449_add-run-artifacts.sql` — artifact columns on `echo_sessions` + storage policies
3. `20260630221400_rename-ghost-to-echo.sql` — legacy rename (skip if starting fresh with `001_echo_sessions.sql`)
4. `src/lib/db/migrations/001_echo_sessions.sql` — base `echo_sessions` table + RLS

Create a private Storage bucket named `echo-runs` for clip/keypoint uploads.

## Deploy

- **Frontend:** Vercel (`echo-form-coach.vercel.app`). Set all env vars above; `RUNPOD_FLASH_BASE_URL` must point at deployed Flash endpoints in production.
- **Compute:** `flash deploy` from the repo root ships GPU/CPU workers to RunPod.

## What's honest about this

We'd rather tell you the limits than have you find them.

Echo gives you **directional** feedback — "your elbow's flaring out, your release is early" — not biomechanical precision. A single phone camera sees in 2D, so exact joint angles depend on where you stand relative to the lens; we lean on the comparison and the visible gap rather than claiming your elbow is off by some specific number of degrees. We constrain capture to one view to keep the measurements honest.

The reference "echo" is a curated exemplar of clean form, not the One True Shot — good form varies with height and build, and we treat it as a reference, not gospel.

None of that is the product apologizing for itself. It's the part we were careful about, and the part we'd defend.
