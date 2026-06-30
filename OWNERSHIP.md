# Ownership Map

Two people build Ghost in parallel. There are **no feature branches** — both
partners commit directly to `main` and `git pull --rebase origin main` before
every push. Stay inside your folders. Anything under **SHARED — FROZEN**
requires a NOTIFY PARTNER gate before editing.

```
PERSON A (Ranjiv) — works on main — owns:
  src/lib/vision/**      (pose capture, release detection)
  src/lib/analysis/**    (metrics, reference alignment, flaw detection, scoring)
  src/lib/coach/**       (You.com + Tavily retrieval + Nebius generation)
  src/components/capture/**
  src/components/overlay/**

PERSON B (Partner) — works on main — owns:
  src/app/**             (routing, pages, layout)
  src/lib/db/**          (InsForge auth + persistence)
  src/lib/payments/**    (Kite PvP stake)
  src/lib/deploy/**      (Vercel + Nebius reference-builder)
  src/lib/finchip/**     (submission packaging)
  src/components/ui/**   (shadcn + shared UI)
  src/components/results/**  (results + progress views)

SHARED — FROZEN — changes require a NOTIFY PARTNER gate:
  src/lib/contracts.ts
  OWNERSHIP.md
  docs/ARCHITECTURE.md (sponsor table only)

RULE: work only in your own folders. Before every push: git pull --rebase origin main.
```
