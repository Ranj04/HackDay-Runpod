<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## RunPod Flash

This project uses RunPod Flash to run GPU/CPU serverless endpoints. Flash is **required** for the project to be eligible for prizes — any compute-heavy workload (inference, embedding, analysis) must run as a Flash endpoint.

- **Skill:** Runpod skills are committed under `skills/` (`flash`, `runpodctl`, `companion-clis`). After clone, `npm install` links them for agents at `.agents/skills`. Read `skills/flash/SKILL.md` before implementing any Flash endpoint instead of guessing the API.
- **Reference:** see `runpod.md` in the project root for full technical details, GPU types, and constraints.
- **Credentials:** `RUNPOD_API_KEY` in `.env.local`. Never hardcode.

Key patterns:

- Decorate a Python function with `@Endpoint(gpu=GpuType.NVIDIA_GEFORCE_RTX_4090, dependencies=["torch"])` to make it a serverless endpoint.
- Parameters must be JSON-serializable — no pickle, no raw tensors across the boundary.
- Declare all pip dependencies in the decorator; declare apt packages via `system_dependencies=`.
- Cache large model weights to a `NetworkVolume` — do not bundle them in the deployment (500 MB limit).
- Use `flash dev` locally to test; `flash deploy` for production.

<!-- INSFORGE:START -->
## InsForge backend

This project uses [InsForge](https://insforge.dev): an all-in-one, open-source Postgres-based backend (BaaS) that gives this app a database, authentication, file storage, edge functions, realtime, an AI model gateway, and payments through one platform.

- **Project:** **hack** (API base `https://5jxi4wvj.us-east.insforge.app`)
- **Skills:** these InsForge skills are installed for supported coding agents. Reach for them before implementing any InsForge feature instead of guessing the API:
  - `insforge`: app code with the `@insforge/sdk` client (database CRUD, auth, storage, edge functions, realtime, AI, email, and Stripe payments).
  - `insforge-cli`: backend and infrastructure via the `insforge` CLI (projects, SQL, migrations, RLS policies, storage buckets, functions, secrets, payment setup, schedules, deploys).
  - `insforge-debug`: diagnosing failures (SDK/HTTP errors, RLS denials, auth and OAuth issues) and running security or performance audits.
  - `insforge-integrations`: wiring external auth providers (Clerk, Auth0, WorkOS, Better Auth, etc.) for JWT-based RLS, or the OKX x402 payment facilitator.
  - `find-skills`: discovering additional skills on demand.
- **Credentials:** app code reads keys from `.env.local`; the CLI reads `.insforge/project.json`. Never hardcode or commit keys.

Key patterns:

- Database inserts take an array: `insert([{ ... }])`.
- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- For storage uploads, persist both the returned `url` and `key`.
<!-- INSFORGE:END -->
