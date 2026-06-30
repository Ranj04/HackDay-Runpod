# Ghost

You can usually *feel* when your jumpshot is off. What you can't do is see why — nobody gets to watch their own form from the outside, mid-shot, frame by frame. Coaches do that for you, if you're lucky enough to have one. Ghost is our attempt to put a little of that in everyone's pocket.

Film a shot. Ghost draws a skeleton on you, drops a second skeleton next to it — the "ghost" of a clean reference shot — and shows you the gap. Then it tells you the one thing most worth fixing, and pulls a real, cited drill to fix that exact thing.

## What it does

Record a few seconds of yourself shooting. Ghost runs pose tracking right in the browser and turns your motion into a set of measurements — elbow angle at release, how deep you load your knees, when your wrist snaps, whether your guide hand is along for the ride when it shouldn't be. It lines your shot up against a reference, finds your biggest flaw, and shows it: your skeleton, the ghost's skeleton, and the joint that's off lit up between them.

From there it doesn't just say "fix your elbow." It searches for a drill that targets *that* flaw, hands you the steps with a source you can go read, and writes a short, specific note grounded in your actual numbers. Every session gets saved, so over a week you can see whether that elbow flare is actually going away or whether you've just been nodding along.

There's also a head-to-head mode: two people each take a shot, same scoring, higher score wins, with a small stake that settles between them. Friendly trash talk, now with a leaderboard.

## How it works

The pipeline is deliberately simple to follow:

1. **Capture** — the browser grabs your camera and runs MediaPipe Pose on each frame, building a sequence of body keypoints. This all happens client-side, which is the boring decision that saves the demo: no server round-trip, works even when the conference wifi falls over.
2. **Find the release** — we detect the release frame from the peak of your shooting wrist's upward velocity, so every "at release" measurement is taken at the right moment.
3. **Measure** — joint angles and timings come out of the keypoints. These are 2D, image-plane measurements, so we keep the camera to one view and treat them as honest signals, not lab-grade numbers (more on that below).
4. **Compare** — your keypoints get size-normalized and time-aligned against the reference, so the gap we show you reflects *form*, not the fact that you're taller than the reference or shot a beat slower.
5. **Coach** — we search for a drill that fixes your specific flaw, pull a supporting reference or two, and generate a short coaching note that's grounded in those sources and your real metrics. It's not allowed to make things up — if a claim isn't in what we retrieved, it doesn't go in the note.
6. **Remember** — the session, the flaw, the score, and the coaching all get stored against your account so progress is a thing you can actually watch.

## The stack

We split the sponsor tools by the job each one is actually good at, rather than bolting them all onto the same spot:

- **MediaPipe Pose** — client-side pose tracking, the eyes of the whole thing.
- **You.com** — finds the corrective drill for the detected flaw (not a generic "shooting tips" page — the flaw drives the query).
- **Tavily** — pulls the supporting biomechanics/technique sources behind the drill.
- **Nebius (Token Factory)** — generates the personalized coaching note from the retrieved sources via an OpenAI-compatible endpoint. Retrieval finds the facts; Nebius writes them up.
- **InsForge** — auth, session storage, and the progress history.
- **Kite** — identity and the on-chain stake settlement for the PvP form battles (testnet).
- **FinChip** — packages the coaching capability as a shareable skill asset.
- **Next.js + Tailwind + shadcn/ui** — the app itself, deployed on Vercel.

## Run it locally

You'll need Node 18+ and a webcam.

```bash
git clone <your-repo-url> ghost
cd ghost
npm install
cp .env.local.example .env.local   # then fill in the keys below
npm run dev
```

Open `http://localhost:3000` and allow camera access.

The keys you'll need in `.env.local`:

```
YOUDOTCOM_API_KEY=      # drill retrieval
TAVILY_API_KEY=         # supporting sources
NEBIUS_API_KEY=         # coaching generation
INSFORGE_API_KEY=       # auth + storage (plus any project/url vars InsForge gives you)
KITE_RPC_URL=           # testnet RPC
KITE_FACILITATOR_URL=   # x402 facilitator
KITE_WALLET_KEY=        # testnet wallet (burner only — never a real key)
FINCHIP_API_KEY=        # submission packaging
```

You can run most of the app with just the You.com, Tavily, Nebius, and InsForge keys. The PvP/Kite flow is optional and self-contained.

## What's honest about this

We'd rather tell you the limits than have you find them.

Ghost gives you **directional** feedback — "your elbow's flaring out, your release is early" — not biomechanical precision. A single phone camera sees in 2D, so exact joint angles depend on where you stand relative to the lens; we lean on the comparison and the visible gap rather than claiming your elbow is off by some specific number of degrees. We constrain capture to one view to keep the measurements honest.

The reference "ghost" is a curated exemplar of clean form, not the One True Shot — good form varies with height and build, and we treat it as a reference, not gospel.

And the PvP stakes settle on a **testnet** with faucet tokens. It's a skill-based form battle for the demo, not real-money anything.

None of that is the product apologizing for itself. It's the part we were careful about, and the part we'd defend.

---

Built at Wizard Hackathon. If you want to talk shop about pose estimation, retrieval-grounded coaching, or why your free throw keeps drifting left, we're around.