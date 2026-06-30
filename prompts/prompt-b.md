# Prompt B — Bright Data, RAG & UI (Echo at Scale · Runpod Flash + Insforge)

**Run after Prompt 0 (cleanup) is pushed to `main`.** First: `git checkout main && git pull origin main`. Cleanup has stripped Tavily, kept Insforge intact, rewritten docs, and left the seam: `# TODO: Bright Data fetch -> embeddings -> Insforge pgvector (Prompt B, Phase 1)`. You fill that seam.

**You own:** the Bright Data ingestion, the cited RAG endpoint (served on Flash), **all Insforge** (auth, storage, pgvector — it's the backend), and the report/overlay UI. Your teammate (Prompt A) owns the GPU pose endpoint, scoring, and fan-out, and **never touches Insforge**.

**Shared-branch rule:** work on `main` alongside A. **Edit everything except A's files:** do **not** create or edit `flash/pose_endpoint.py`, `flash/scoring.py`, or `flash/orchestrate.py`.

---

## Phase exit protocol (every phase)
- **All pass →** `git add -A && git commit -m "[B] phase N: <summary>" && git pull --rebase origin main && git push origin main`, then **STOP** and report "pushed, awaiting go." If push is rejected, `git pull --rebase origin main` and retry push.
- **Any fail / unsure →** **STOP**, report what's broken, do **not** commit or push.

## Rules
- One phase at a time. Wait for my go. Simplicity first.
- **HUMAN ACTION** lines are mine (auth/credentials/tokens).
- Flash anchors: `from runpod_flash import Endpoint, GpuType`; load-balanced = `Endpoint()` + HTTP routes; CPU worker `@Endpoint(name=..., cpu=...)` (EU-RO-1 only); `flash run` (explorer at `localhost:8888/docs`); 500MB limit.
- Bright Data anchors: SDK `brightdata-sdk` (`bdclient`), `client.discover(...)` (intent-ranked semantic search w/ parsed content — the RAG retrieval layer; modes standard/deep/fast); pre-built scrapers (YouTube etc.) via Web Scraper API; Web Unlocker for protected pages; token via env var; ~5,000 req/mo free.
- Insforge anchors: Postgres + **pgvector** vector store, S3-style storage, JWT/OAuth auth; agent-operated via its MCP/CLI + skill. This is the existing backend — extend it, don't replace it.

## SHARED CONTRACT (identical in Prompt A — do not change unilaterally)
A's pipeline emits:
```json
{ "reps": [ { "rep_id": "r1", "score": 42.0, "flaw_label": "low_release_elbow", "keypoints_uri": "optional" } ], "worst": ["r1","r3"] }
```
Your RAG endpoint consumes `flaw_label` → returns a drill, optionally with `sources` (cited URLs) — B-internal, doesn't change the A↔B contract. Until integration, **mock** A's JSON.

---

## Phase 0 — Setup
**HUMAN ACTION:** confirm push access to `main`. Run `npm install` (links committed Runpod skills from `skills/`). Bring up the **Insforge** project (or creds) and confirm its auth/storage/pgvector are reachable. Get a **Bright Data API token** and export it. Install Bright Data + **Insforge** skills/MCPs (`github.com/brightdata/skills`, Insforge skill/MCP).

**verify:** Bright Data auth works (a trivial `client.discover` returns results); Insforge reachable (can read schema + the existing pgvector table); the cleanup seam imports.

## Phase 1 — Bright Data ingestion → Insforge pgvector (fills the seam)
Use Bright Data (Discover API for coaching/drill content + pre-built scrapers e.g. YouTube where useful) to collect real basketball shooting-form/drill content, parse to clean markdown, embed it, and **upsert into Insforge's pgvector store** (reuse the existing table the cleanup preserved — no local Chroma/FAISS, no NetworkVolume for the corpus). Run the collect+embed step as a **`@Endpoint(cpu=...)` Flash worker**. Keep deps light for the 500MB limit.

**verify:** Insforge pgvector holds N coaching docs, each row carrying its **source URL**; a sample similarity query returns relevant chunks.

## Phase 2 — Cited RAG as a load-balanced Flash endpoint
Expose RAG via `Endpoint()` + an HTTP route: `flaw_label` in → top drill out **with `sources`**, retrieved from **Insforge pgvector**. For a flaw with no strong match, **fall back to a live Bright Data Discover query** and ground the drill in fresh cited results (optionally upsert the new result back into pgvector). Serve with `flash run`.

**verify:** hit the route from `localhost:8888/docs` → relevant drill + sources from pgvector; force a miss → live Discover fallback returns a cited drill.

## Phase 3 — Report & overlay UI (on Insforge)
Repoint the echo-overlay to read keypoints from the endpoint response. Build the report view rendering the SHARED CONTRACT — worst reps + score + cited drill (clickable sources). Use **Insforge auth** for sign-in and **Insforge storage** to persist uploaded clips, keypoints, and run reports. Mock A's JSON until integration.

**verify:** signed-in user sees a ranked report (from mock contract JSON) with drills + sources; a run persists to Insforge and reloads.

## Phase 4 — Stretch (skip if short on time)
Cost/observability panel: CPU-vs-GPU-seconds split (from A's Phase 5) + Bright Data request count + Insforge rows ingested.

**verify:** panel shows the numbers and updates per run.

## Integration (DO WITH TEAMMATE)
Both streams are already on `main`. Replace the mock contract with A's real output, wire worst-rep `flaw_label` → your live RAG endpoint, route uploaded clips (Insforge storage) into A's pipeline, run end-to-end, **pre-warm all endpoints before demoing**.
