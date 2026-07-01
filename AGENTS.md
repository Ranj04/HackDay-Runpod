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

<!-- SUPABASE:START -->
## Supabase backend

This project uses [Supabase](https://supabase.com) as the backend: Postgres + **pgvector**, Auth, and Storage.

- **Project:** ref `vtdgoihwxdcoatieyuvx` (`https://vtdgoihwxdcoatieyuvx.supabase.co`).
- **Client:** `@supabase/supabase-js` + `@supabase/ssr` — browser client, cookie-bound server client, and a session-refresh middleware (`src/proxy.ts`), all under `src/lib/supabase/`.
- **Vector store:** `coaching_documents` (`embedding vector(1536)`) + the `match_coaching_documents` RPC — the Flash RAG upserts/retrieves here with the service role.
- **Auth + DB:** email/password (auto-confirm) via Supabase Auth; `echo_sessions` rows are RLS-scoped to `auth.uid()`.
- **Storage:** `echo-runs` bucket for clips/keypoints/reports (server-side uploads with the service role, `src/lib/db/supabase-admin.ts`).
- **Credentials:** `.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only). Never hardcode or commit keys.

Key patterns:

- Admin/server writes use the service-role client; browser reads/writes use the anon client under RLS.
- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- Apply schema via `migrations/` (Supabase SQL editor or `supabase db push`).
<!-- SUPABASE:END -->
