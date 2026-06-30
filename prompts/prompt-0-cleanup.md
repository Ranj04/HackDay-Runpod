# Prompt 0 — Cleanup & Refactor (RUN FIRST, on `main`)

Run this **once, by one person, on `main`, before anyone branches.** It de-sponsors the legacy Ghost repo, rewrites the docs to the new context, and leaves a clean **Bright Data seam** for the RAG. When it's done, both teammates pull `main`, branch `stream-a` / `stream-b`, and run Prompt A / Prompt B in parallel.

---

## Phase exit protocol (every phase)
Run the verify checks.
- **All pass →** `git add -A && git commit -m "cleanup phase N: <summary>" && git push origin main`, then **STOP** and report "pushed, awaiting go."
- **Any fail / unsure →** **STOP**, report exactly what's broken, do **not** commit or push.

## Rules
- One phase at a time. Wait for my go between phases.
- **Phase 0 inventory is READ-ONLY.** No deletions until I confirm.
- **Nothing destructive without my confirmation.**
- Surgical: remove only what the refactor orphans; list (don't delete) unrelated pre-existing dead code.
- **HUMAN ACTION** lines are mine.
- Anchors for the docs (don't invent): Runpod **Flash** = `from runpod_flash import Endpoint, GpuType`, `@Endpoint(...)`, `flash run`. Bright Data = web-data/retrieval layer (Discover API, pre-built scrapers, Web Unlocker; Python SDK `brightdata-sdk`).

---

## Phase 0 — Inventory (READ-ONLY)
Produce a **sponsor-tool reference table**: every import, env var, key, config, dep, and doc mention tied to an external sponsor tool, each classified **DEAD** (unused) or **LOAD-BEARING** (doing real work). Flag the **old RAG data source / vector store** specifically — note its embedding model + store. Also list every `.md`/spec file and which hackathon it references.

**verify:** I receive the classified table + the doc list.

**STOP — I confirm what to strip vs seam before any change.**

## Phase 1 — Strip & leave the Bright Data seam
After I confirm:
- Remove all **DEAD** sponsor imports, env vars, config, deps.
- For the **LOAD-BEARING** old RAG data source: keep the RAG retrieval *interface* intact, but replace its data-source/vector-store wiring with a clean stub marked `# TODO: Bright Data ingestion -> local vector store (Prompt B, Phase 1)`. Do not leave broken imports.
- Remove only the imports/vars your deletions orphan. Leave unrelated pre-existing dead code in place (just list it).

**verify:** `grep -ri` for each old sponsor name + old hackathon name → zero hits in active code; project imports cleanly; the RAG interface imports and returns from the stub.

## Phase 2 — Doc rewrite
- Move old build-prompt/spec `.md` files to `./_archive/` so no agent re-reads them.
- Rewrite `README.md` for **Ghost at Scale on Runpod Flash**, with **Bright Data** named as the web-data/retrieval layer.
- Add `ARCHITECTURE.md` mapping each component to its Flash construct + the Bright Data seam.

**verify:** no active `.md` references the old hackathon or sponsors.

---

## Done → HUMAN ACTION
`main` is now clean, documented, and branchable. Both teammates: `git pull origin main`, then create `stream-a` / `stream-b` and run **Prompt A** / **Prompt B**.
