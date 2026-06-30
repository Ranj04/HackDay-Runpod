# Echo at Scale

You can usually *feel* when your jumpshot is off. What you can't do is see why — nobody gets to watch their own form from the outside, mid-shot, frame by frame. Coaches do that for you, if you're lucky enough to have one. Echo is our attempt to put a little of that in everyone's pocket.

Film a shot. Echo draws a skeleton on you, drops a second skeleton next to it — the "echo" of a clean reference shot — and shows you the gap. Then it tells you the one thing most worth fixing, and pulls a real, cited drill to fix that exact thing.

**"At Scale"** is the engineering story: pose estimation moves off the browser and onto fanned-out GPU workers on **Runpod Flash**, so one clip — or a whole batch of them — gets analyzed in parallel by server-side endpoints instead of a single phone.

## What it does

Record a few seconds of yourself shooting. Echo turns your motion into a set of measurements — elbow angle at release, how deep you load your knees, when your wrist snaps, whether your guide hand is along for the ride when it shouldn't be. It lines your shot up against a reference, finds your biggest flaw, and shows it: your skeleton, the echo's skeleton, and the joint that's off lit up between them.

From there it doesn't just say "fix your elbow." It finds a drill that targets *that* flaw, hands you the steps with a source you can go read, and writes a short, specific note grounded in your actual numbers. Every session gets saved, so over a week you can see whether that elbow flare is actually going away or whether you've just been nodding along.

## How it works

1. **Capture** — the browser grabs your camera and records a short clip (with a live preview skeleton so you can frame yourself).
2. **Pose (Runpod Flash)** — the clip is sent to a GPU `@Endpoint` that runs pose estimation server-side and returns per-frame keypoints. Fanning these endpoints out is what lets Echo scale past one device.
3. **Find the release** — we detect the release frame from the peak of the shooting wrist's upward velocity, so every "at release" measurement is taken at the right moment.
4. **Measure** — joint angles and timings come out of the keypoints. These are 2D, image-plane measurements, so we keep the camera to one view and treat them as honest signals, not lab-grade numbers (more on that below).
5. **Compare** — your keypoints get size-normalized and time-aligned against the reference, so the gap we show reflects *form*, not the fact that you're taller than the reference or shot a beat slower.
6. **Coach** — we retrieve a drill that fixes your specific flaw plus supporting sources, then generate a short coaching note grounded in those sources and your real metrics. It's not allowed to make things up — if a claim isn't in what we retrieved, it doesn't go in the note.
7. **Remember** — the session, the flaw, the score, and the coaching are stored against your account so progress is a thing you can actually watch.

## The stack

Three platforms, split by the job each one does:

- **Runpod Flash** — compute & serving. Pose estimation and other compute-heavy work run as Python `@Endpoint` functions on GPU/CPU serverless workers. This is the layer the project is built around.
- **Bright Data** — the web-data / retrieval layer. Fetches drill and technique content (Discover API + pre-built scrapers + Web Unlocker, via `brightdata-sdk`) that gets embedded into the vector store and retrieved per flaw. This replaces the old web-search fetch.
- **InsForge** — the backend: authentication, Postgres (session history), **pgvector** for the coaching vector store, and S3-style storage.
- **Nebius (Token Factory)** — OpenAI-compatible inference that writes the grounded coaching note from the retrieved sources + your real metrics.
- **Next.js + Tailwind + shadcn/ui** — the app itself (capture UI, echo-overlay canvas, results, history).

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the component-to-layer map and the Bright Data retrieval seam.

## Build status

Honest about what's wired today vs. what the stream-A / stream-B build prompts add:

- ✅ **Analysis, scoring, echo-overlay** — working, pure TypeScript.
- ✅ **InsForge auth + session history** — wired (local-demo fallback when keys are absent).
- ✅ **Nebius coaching note** — wired, with a deterministic curated fallback.
- 🚧 **Runpod Flash pose endpoint** — Prompt A. Capture currently still runs pose client-side as a fallback.
- 🚧 **Bright Data → embeddings → InsForge pgvector** — Prompt B. The retrieval interface is stubbed at `src/lib/coach/retrieval.ts` and falls back to a curated drill DB until the seam is built.

## Run it locally

You'll need Node 18+ and a webcam.

```bash
npm install
cp .env.local.example .env.local   # then fill in the keys below
npm run dev
```

Open `http://localhost:3000` and allow camera access.

Keys in `.env.local`:

```
NEBIUS_API_KEY=         # coaching note generation
NEBIUS_BASE_URL=        # Token Factory endpoint
INSFORGE_API_KEY=       # auth + Postgres/pgvector (plus the NEXT_PUBLIC_INSFORGE_* vars)
```

The app runs without any keys — it falls back to local-demo storage and a curated coaching note. Runpod Flash and Bright Data credentials are added by the stream-A / stream-B build prompts.

## What's honest about this

We'd rather tell you the limits than have you find them.

Echo gives you **directional** feedback — "your elbow's flaring out, your release is early" — not biomechanical precision. A single phone camera sees in 2D, so exact joint angles depend on where you stand relative to the lens; we lean on the comparison and the visible gap rather than claiming your elbow is off by some specific number of degrees. We constrain capture to one view to keep the measurements honest.

The reference "echo" is a curated exemplar of clean form, not the One True Shot — good form varies with height and build, and we treat it as a reference, not gospel.

None of that is the product apologizing for itself. It's the part we were careful about, and the part we'd defend.
