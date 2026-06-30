# Wizard Hackathon — Sponsor Tools Cheat Sheet

Quick reference for every sponsor's tooling: what it does, your credits, prize tracks, and how to wire it up fast during the sprint.

**Submission link:** https://sublet--saurabhskhire.replit.app/
**Discord:** https://discord.gg/krCsZxYRGW

## Tool capability comparison

| | Docs | CLI | SDK | MCP | RAG |
|---|---|---|---|---|---|
| **InsForge** | ✅ | ✅ | ✅ | ✅ | ✅ native |
| **You.com** | ✅ | — | ✅ Python/TypeScript | ✅ | ✅ strong |
| **Nebius** | ✅ | ✅ | ⚠️ OpenAI-compatible | ✅ beta | ✅ via Token Factory |
| **Replit** | ✅ | ✅ | ⚠️ limited | ✅ client/host | ❌ build it yourself |
| **Trae** | ✅ | ✅ Trae-Agent | ❌ | ✅ strong | ⚠️ via MCP |
| **FinChip** | ⚠️ limited | ✅ | ❌ | ⚠️ declared | N/A |

---

## 🏆 Prize-eligible sponsors

### InsForge — Agent-native backend platform
**Prize:** Best Use of InsForge — 🥇 $500 / 🥈 $300 / 🥉 $100

What it is: all-in-one backend (database, auth, storage, AI gateway, hosting) built specifically for AI coding agents to operate end-to-end.

- **Docs:** https://docs.insforge.dev — also fetch `https://insforge.dev/skill.md` (canonical agent setup, supersedes guesses)
- **CLI:** `@insforge/cli` — `insforge db query "SELECT ..." --json`, `insforge functions deploy ./fn -y`
- **MCP setup (fastest path):**
  ```bash
  npx @insforge/install --client claude-code --env API_KEY=your_key --env API_BASE_URL=https://api.insforge.com
  ```
  Also supports Cursor, Windsurf, Cline, Roo Code, Trae, VS Code, Zed.
- **Manual MCP config:**
  ```json
  { "mcpServers": { "insforge": { "command": "npx", "args": ["-y", "@insforge/mcp@latest"],
    "env": { "API_KEY": "your_api_key", "API_BASE_URL": "https://api.insforge.com" } } } }
  ```
- **Agent Skills (lighter than MCP):** `npx skills add insforge/insforge-skills`
- **RAG:** native pgvector + embeddings + AI gateway — good for "upload docs → ask questions" builds in any track.
- **Good fit for:** Sports Arena (live data + auth), Potion Lab (user profiles/matching), any track needing fast backend.
- **More resources:** [main site](https://insforge.dev/), [MCP setup](https://docs.insforge.dev/mcp-setup), [GitHub](https://github.com/InsForge/InsForge), [MCP server](https://github.com/InsForge/insforge-mcp), [installer](https://github.com/InsForge/insforge-install), [`@insforge/mcp`](https://www.npmjs.com/package/@insforge/mcp), [Skills + CLI announcement](https://insforge.dev/blog/insforge-skills-cli)

---

### You.com — Real-time web search & research APIs
**Prize:** Best Use of You.com — 🏆 $1,000 in credits
**Credits:** $100 in You.com credits per participant

What it is: Search, Contents, and Research APIs — real-time, citation-backed web results for grounding agents.

- **Docs:** https://you.com/docs — append `.md` to any page for plain text, `/llms.txt` for full index
- **No-signup MCP (start instantly, 100 queries/day):**
  ```
  https://api.you.com/mcp?profile=free
  ```
  Works in Claude Code, Cursor, VS Code, JetBrains — just connect, no API key needed.
- **With your $100 credit (higher limits + more tools):** get key at https://you.com/platform
- **Local MCP package:** `npx @youdotcom-oss/mcp` (set `YDC_API_KEY` env var)
- **SDKs:** official **Python** and **TypeScript** SDKs (typed, async, auto-retry)
- **Key param for RAG:** `livecrawl` — returns full-page Markdown alongside search results in one call (no separate scrape step)
- **Framework integrations:** `langchain-youdotcom`, LlamaIndex retriever, LangGraph tools
- **Good fit for:** Creative Expressions (research-grounded story/content gen), Potion Lab (recommendation engines), any "agent that needs current info" build.
- **More resources:** [quickstart](https://you.com/docs/welcome), [MCP guide](https://docs.you.com/developer-resources/mcp-server), [integrations](https://you.com/docs/integrations-overview), [developer overview](https://docs.you.com/developer-resources/overview), [private RAG example](https://you.com/docs/examples/private-rag)

---

## 💳 Credit-only sponsors (no dedicated prize track, but free fuel)

### Nebius — AI cloud / inference + Tavily bundle
**Credits:** $50 tokens + $50 GPU credits + $25 Tavily credits

What it is: GPU cloud + "Token Factory" — OpenAI-compatible inference API for 60+ open models (Llama, DeepSeek, Qwen) plus embeddings.

- **Docs:** https://docs.nebius.com
- **CLI:** `nebius` (full infra mgmt — compute, storage, IAM)
- **No dedicated SDK** — just point the **OpenAI SDK** at their endpoint:
  ```python
  from openai import OpenAI
  client = OpenAI(base_url="https://api.tokenfactory.nebius.com", api_key="NEBIUS_API_KEY")
  ```
- **MCP (beta):** `nebius/mcp-server` on GitHub — lets agents run CLI commands + fetch docs. ⚠️ Never use "Allow always" on the execute tool.
- **RAG:** embedding models (BGE, E5-mistral) + pgvector; `langchain-nebius` package gives you `ChatNebius`, `NebiusEmbeddings`, `NebiusRetriever` in one import.
- **Good fit for:** cheaper/faster inference than your usual Bedrock calls if you're burning through tokens fast during the sprint.
- **More resources:** [CLI docs](https://docs.nebius.com/cli), [AI Studio](https://nebius.com/ai-studio), [RAG solutions](https://nebius.com/solutions/rag), [MCP server](https://github.com/nebius/mcp-server), [Cloud API](https://github.com/nebius/api), [`langchain-nebius`](https://pypi.org/project/langchain-nebius/), [LangChain integration](https://docs.langchain.com/oss/python/integrations/embeddings/nebius)

### Replit — Build & deploy environment
**Credits:** $25 per participant

What it is: browser-based IDE + hosting. This is also where you **submit** your project (the submission form itself is a Replit app).

- **Docs:** https://docs.replit.com
- **MCP:** Replit Agent acts as an MCP *client* — connect external MCP servers (Stripe, Linear, etc.) via the Integrations pane, OAuth handled automatically.
- **No real SDK** — it's a hosting/build environment, not an API product.
- **Good fit for:** fast deploy + demo hosting regardless of track — useful as your "ship it" layer even if you build elsewhere.
- **More resources:** [MCP tutorial](https://docs.replit.com/tutorials/mcp-in-3), [CLUI docs](https://docs.replit.com/references/workspace-tools/clui-graphical-cli), [`replit-py`](https://replit-py.readthedocs.io/en/latest/cli.html), [`replit` npm package](https://www.npmjs.com/package/replit), [`repl-cli`](https://pypi.org/project/repl-cli/)

### Trae — AI-powered IDE (ByteDance)
**Credits:** 7-day free Pro plan + $20 in credits

What it is: VS Code-based AI-first IDE with an MCP marketplace and agentic Builder mode.

- **Docs:** https://docs.trae.ai
- **CLI:** Trae-Agent CLI (open source, terminal-based agent)
- **MCP:** built-in marketplace, one-click installs (e.g., Context7 for live SDK docs — handy if you're using an unfamiliar library mid-hack)
- **InsForge integration:** first-party — install InsForge directly from Trae's MCP marketplace
- **Good fit for:** your actual coding environment for the day if you want AI pair-programming with MCP tools wired in already.
- **More resources:** [setup](https://docs.trae.ai/ide/set-up-trae?_lang=en), [MCP overview](https://docs.trae.ai/ide/model-context-protocol), [adding MCP servers](https://docs.trae.ai/ide/add-mcp-servers), [models](https://docs.trae.ai/ide/models), [marketplace](https://solo.trae.ai/marketplace)

---

## 🤝 Partner (non-prize, ecosystem)

### FinChip — Tokenized AI skill marketplace
Not an infra/API sponsor in the usual sense — it's a Web3 marketplace where AI "skills" become tradeable on-chain assets (ERC-1155/721).

- **Site:** https://finchip.ai
- **CLI:** `finchip-cli` (npm) — mint, trade, acquire skill tokens; handles x402/USDC payments
- Likely only relevant if your project leans into the "agent economy / agents owning tools" angle — probably overkill for most tracks in a one-day sprint.
- **More resources:** [marketplace](https://finchip.ai/top), [A2A entry point](https://finchip.ai/a2aentry), [CLI source](https://github.com/Sleipnirs/finchip-cli), [`finchip-cli`](https://www.npmjs.com/package/finchip-cli)

---

## ⚡ Recommended stack-ups for speed

| If you're building... | Stack |
|---|---|
| Research/search agent | **You.com** (search+citations) + **InsForge** (storage/auth) |
| RAG chatbot over docs | **InsForge** (pgvector) + **Nebius** (cheap embeddings/inference) |
| Live data app (sports, fan tools) | **You.com** (real-time data) + **Replit** (fast deploy) |
| Anything needing a deployed demo by 5 PM | **Trae** or **Replit** as your build/deploy env regardless of API stack |

---

## Track reminders
- 🏟️ Sports Arena · 🎼 Creative Expressions · 🧪 Potion Lab · 🎮 GameCraft Arena

**Schedule:** Hacking 11:00–5:00 → Submit & Round 1 judging 5:00–6:00 → Finalist demos 6:00–7:00 → Winners 7:00–8:00
