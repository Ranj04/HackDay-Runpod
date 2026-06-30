# RunPod Flash Hack Day — Reference Sheet

> In-person, full-day, judged hackathon. This doc is facts only — logistics, products, requirements, and key context. No project ideas.

---

## Event Logistics

| Detail | Info |
|---|---|
| **Date** | Tuesday, June 30, 2026 |
| **Venue** | Bright Data Web Loft, 625 2nd St, San Francisco, CA |
| **Doors open** | 9:30 AM PT (breakfast/coffee + setup) |
| **Kickoff** | 10:00 AM PT (promptly) |
| **Submissions due** | 4:00 PM PT |
| **Winners announced** | 6:00–7:00 PM PT |
| **Event ends** | 7:00 PM PT |
| **Build solo or team** | Either — can find collaborators onsite |
| **Food** | Coffee (no full breakfast), lunch provided, dinner provided |

### Day-of Schedule
- 9:30 AM — doors open, breakfast, setup
- 10:00 AM — welcome + kickoff
- 10:07 AM — RunPod Flash keynote + technical walkthrough
- 10:25 AM — Bright Data welcome
- 10:35 AM — build sprint kickoff + support resources
- 10:45 AM — build time begins
- 11:15 AM — optional RunPod workshop: getting started fast
- 12:30 PM — lunch
- 1:10 PM — afternoon build sprint
- 2:15 PM — optional RunPod workshop: implementation clinic
- 4:00 PM — **project submissions due (HackerSquad)**
- 4:00–5:00 PM — judges review, select top 10 + dinner
- 5:00–6:00 PM — networking while judges finalize
- 6:00–7:00 PM — winners + closing remarks

> **Note:** This is the IN-PERSON portion. A separate REMOTE hackathon runs ~2-3 weeks later, one week in duration. Tomorrow has its own prizes and its own winner announcement — confirmed it is NOT just a qualifier for the remote round.

---

## Prizes (for tomorrow)
- **1st place:** $4,000 cash + $4,000 credits
- **2nd place:** $2,000 cash + $2,000 credits
- **3rd place:** $1,000 cash + $1,000 credits
- **+ bonus prizes** for miscellaneous categories

---

## Submission & Demo Requirements
- Working build due **4:00 PM** via the **HackerSquad event page** (also where you log in + submit feedback)
- **Demos are 3 minutes max** (you'll get a warning before time is up)
- **Narrow, working projects beat broad, unfinished ones**
- **Live product, terminal, logs, or code is better than slides**
- Clarity matters — judges want: *what did you build, how does it work, why is it useful?*

---

## What To Bring
- Laptop + charger
- Local dev environment ready to go (Python 3.10–3.13 required for Flash)
- Any accounts/tools you expect to build with
- One narrow project idea/use case you can realistically demo by end of day

---

## PRODUCTS NAMED IN EVENT MATERIALS

### 1. RunPod Flash (the core tool — the whole point of the day)
A Python SDK that turns any function into a live, auto-scaling serverless endpoint. **No Dockerfile, no container image management** — specify GPU and dependencies directly in Python; Flash handles provisioning, scaling, dependencies, and execution.

**What the event says to explore:**
- Python-first serverless endpoints for GPU and CPU workloads
- Queue-based jobs and low-latency API patterns
- Practical production concerns: scaling, reliability, observability, cost awareness
- Real project shipping, not just theory

### 2. Bright Data (venue host)
The world's #1 web data platform — proxy networks, web scrapers (450+ sites), SERP API, datasets. Event guidance: *"utilize data from Bright Data's global infrastructure for web access for agents."* This is a strong hint / available infrastructure, **NOT a hard requirement.**

Most hackathon-relevant Bright Data tools:
- **Discover API** — free, always-live web discovery for agents
- **Scraper APIs** — real-time data from LinkedIn, eComm, social media, etc.
- **SERP API** — real-time Google/Bing/etc. search results
- **Web Unlocker** — bypass blocks/CAPTCHAs

### 3. HackerSquad
Not a build tool — the platform for login, feedback, and **project submission**.

> No other sponsor products / required APIs / mandated stack are named anywhere in the event page, blasts, or Know Before You Go doc. There is no explicit "build X using Y" prompt. The only product instruction is: build something real with RunPod Flash.

---

## FLASH — TECHNICAL FACTS

### Setup (do BEFORE arriving)
```bash
pip install runpod-flash          # or: uv tool install runpod-flash
flash login                        # opens browser, authorizes once
npx skills add runpod/skills       # installs Flash skill for Claude Code/Cursor/Cline
```
- Requires a **RunPod account with verified email + balance loaded**
- Requires **Python 3.10, 3.11, 3.12, or 3.13**
- Runs natively on **macOS and Linux**; Windows via WSL2
- `flash init` writes an `AGENTS.md` (+ `CLAUDE.md` symlink) with CLI-first rules for AI coding tools

### Core usage
- Decorate a Python function with `@Endpoint(...)` → it runs on RunPod Serverless GPU/CPU
- Specify GPU via typed enum (`GpuType.NVIDIA_GEFORCE_RTX_4090`, `GpuType.NVIDIA_A100_80GB_PCIe`) or groups (`GpuGroup.ANY`, `GpuGroup.AMPERE_80`) for capacity flexibility
- CPU via `cpu="cpu5c-4-8"` or `CpuInstanceType.CPU5C_4_8`
- Dependencies declared in the decorator (`dependencies=["torch", "transformers"]`) — installed automatically on the worker
- Auto-scales workers from 0 to N based on demand; scales back to zero when idle
- `max_concurrency` lets each worker process multiple jobs at once

### The four endpoint patterns
1. **Queue-based** (`@Endpoint(...)` as decorator) — batch/async work; the original Flash pattern (good for fan-out)
2. **Load-balanced** (`Endpoint(...)` instance with route methods) — low-latency HTTP APIs, multiple routes share workers, no queue overhead
3. **Custom Docker images** (`image=`) — for prebuilt workers (vLLM, TensorRT-LLM, ComfyUI, etc.)
4. **Existing endpoints by ID** — call anything already deployed on RunPod from a Flash script

### Key features
- **Cross-endpoint function calls** — functions on different endpoints call each other directly; makes hybrid **CPU→GPU pipelines** (cheap CPU preprocessing → big GPU inference) trivial. This is the flagship pattern RunPod's CTO highlights.
- **Flash Apps** — collections of interconnected endpoints with different hardware configs, deployed as one unit
- **NetworkVolume** — first-class persistent storage; cache a model once at `/runpod-volume/`, reuse across cold starts
- `flash dev --auto-provision` — spins up all endpoints upfront so first request isn't a cold start
- `flash deploy` — produces real production deployments; cross-platform builds (M-series Mac → Linux x86_64)
- `flash undeploy` — list/remove endpoints (manual cleanup recommended to avoid charges)
- `env=` variables excluded from config hash — rotating a key won't trigger a rebuild
- `system_dependencies` — install apt packages (e.g. for OpenCV)
- **EndpointJob API** — manage async/queue work as a clean Python object

### Constraints / gotchas
- **500MB deployment limit** (PyTorch pre-installed on GPU base images — cache big weights on NetworkVolume instead of bundling)
- **CPU endpoints restricted to EU-RO-1 datacenter** (GPU endpoints can deploy to multiple datacenters)
- Workers can scale fast → you may hit your max worker threshold; contact RunPod support to raise capacity
- Endpoints persist until manually deleted — clean up to avoid charges
- Two deployment patterns confirmed across all sources: **queue-based** (batch/async) + **load-balanced** (real-time)

### Open source
- MIT license, on PyPI (`runpod-flash`), source at github.com/runpod/flash
- Examples: github.com/runpod/flash-examples
- Docs: docs.runpod.io/flash/overview

---

## COMPANY / EXECUTIVE CONTEXT (RunPod)

Useful for talking to mentors/judges and understanding what they want to see.

- **CEO & Co-founder:** Zhen Lu. Quote: *"We built Flash because the feedback was consistent: Serverless is powerful, but the setup gets in the way. Docker is a great tool; it's just not the work developers came to do. Flash gives developers back that time."*
- **CTO:** Brennen Smith. Quote: *"Everyone is talking about agentic AI... there needs to be a really good substrate and glue for these agents, whatever they might be powered by, to be able to work with."* He explicitly demos **"polyglot" pipelines** — cheap CPU preprocessing routed to high-end GPU (H100/B200) for inference — as the flagship use case.
- **Company framing:** RunPod believes the next wave of AI spend is **inference, not training**, and that **agents** are the dominant emerging pattern. Agents "don't fit neatly into one container or one endpoint — they need to call different models, route between compute types, and scale on demand." Flash is positioned as the **"substrate and glue"** for that.
- **Scale stats:** 750,000+ developers, 37,000 serverless endpoints created in March 2026 alone, 2,000+ new endpoints/week. ~$120M ARR. Series A raised. 30+ GPU SKUs, billing by the millisecond. Sub-200ms cold starts via FlashBoot. Production users include Glam Labs, CivitAI, Zillow. Positioned as "most cited AI cloud on GitHub."
- **Flash GA date:** April 30, 2026 (beta launched March 2026).

---

## WHAT THE JUDGES WANT (synthesized from RunPod's own messaging + event demo rules)

In priority order:
1. **Scale is the feature.** Real parallel GPU work — many jobs across autoscaling workers, visibly spinning up in the logs. Not a single API call with a decorator on it.
2. **Real web data.** Ideally Bright Data doing actual work in the pipeline (scraping / live fact-checking), not a name-drop.
3. **Narrow + working + live.** One clear use case, demoed in a live terminal in 3 minutes. Working MVP beats broad/unfinished.
4. **Honest "why GPU" answer.** Be ready to point to a real bottleneck (many embeddings, a real-sized model, growing comparison set) where GPU parallelism solves a genuine latency/throughput problem — not a checkbox.

**The shape they're fishing for, in one line:** an AI agent/pipeline where parallel GPU autoscaling is the entire point, fed by real web data, proven live in a terminal — not claimed in a deck.

**Strongest single demo beat:** workers visibly spinning up as jobs hit the queue, ideally with a before/after timing comparison (sequential/CPU vs. parallel/GPU).

---

## GENERIC HACKATHON JUDGING CRITERIA (background context)

Universal criteria that apply broadly, but **for this event, weight technical execution + live demo much more heavily than business/market framing** (the event docs never mention market sizing or revenue):
1. Creativity & innovation
2. Technical execution (core features, code quality, performance, architecture, functionality, stack choice)
3. Functional MVP (core functionality working, proof of concept)
4. Problem-solving & relevance (solution impact, audience fit, feasibility)
5. Impact & potential (real-world adoption, economic viability) — *lower weight for a 1-day event*
6. Final pitch (vision, holistic view, makes overlooked projects stand out)

Event-specific override from the "Know Before You Go" doc: **live product/terminal/logs > slides.**

---

## PRE-EVENT CHECKLIST
- [ ] RunPod account created, email verified, **balance loaded**
- [ ] `pip install runpod-flash` done
- [ ] `flash login` authenticated
- [ ] `npx skills add runpod/skills` installed
- [ ] Python 3.10–3.13 confirmed locally
- [ ] Bright Data account + API key ready (if using)
- [ ] HackerSquad event page login working
- [ ] Laptop + charger packed
- [ ] One narrow, demoable use case decided