# Build prompts

The per-person build prompts for Ghost, vendored into the repo so they're here on clone.

- **Ranjiv** runs [`PROMPT_A_RANJIV.md`](./PROMPT_A_RANJIV.md) — vision + coaching core.
- **Partner** runs [`PROMPT_B_PARTNER.md`](./PROMPT_B_PARTNER.md) — platform + integrations.

Both run on `main` — no feature branches.

Guardrails (all three apply to both of us):
- `src/lib/contracts.ts` is **frozen** — build against it, don't edit it.
- `OWNERSHIP.md` defines folder boundaries — stay in your own folders.
- `git pull --rebase origin main` before every push.
