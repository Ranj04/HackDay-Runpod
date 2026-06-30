"""Cited basketball coaching RAG served by a load-balanced Flash endpoint.

Request:

    {"request": {"flaw_label": "elbow_flare"}}

Set ``force_live`` to verify the Bright Data fallback:

    {"request": {"flaw_label": "elbow_flare", "force_live": true}}

Response source URLs always come from InsForge pgvector or a live Bright Data
Discover result; the language model never invents citations.
"""

import os

from runpod_flash import CpuInstanceType, DataCenter, Endpoint


def _worker_environment() -> dict[str, str]:
    names = (
        "BRIGHTDATA_API_TOKEN",
        "OPENROUTER_API_KEY",
        "INSFORGE_API_KEY",
        "INSFORGE_API_BASE_URL",
    )
    return {name: os.environ.get(name, "") for name in names}


rag = Endpoint(
    name="ghost-coaching-rag",
    cpu=CpuInstanceType.CPU5C_2_4,
    datacenter=DataCenter.EU_RO_1,
    workers=(0, 2),
    max_concurrency=4,
    dependencies=[
        "brightdata-sdk==2.4.0",
        "httpx>=0.27.0",
        "openai>=1.0.0",
    ],
    env=_worker_environment(),
    execution_timeout_ms=300_000,
)


@rag.post("/drill")
async def cited_drill(request: dict) -> dict:
    """Return a grounded drill for one scorer ``flaw_label``."""

    # Flash dev ships only this body to the worker. Keep imports, constants, and
    # helper functions inside the route.
    import json
    import os
    import re

    import httpx
    from brightdata import BrightDataClient
    from openai import AsyncOpenAI

    required = (
        "BRIGHTDATA_API_TOKEN",
        "OPENROUTER_API_KEY",
        "INSFORGE_API_KEY",
        "INSFORGE_API_BASE_URL",
    )
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        raise RuntimeError(f"Missing worker environment: {', '.join(missing)}")

    flaw_label = str(request.get("flaw_label", "")).strip()
    if not flaw_label:
        raise ValueError("flaw_label is required")

    queries = {
        "elbow_flare": (
            "basketball shooting drill to align the shooting elbow under the "
            "ball and stop elbow flare"
        ),
        "shallow_dip": (
            "basketball shooting drill for deeper knee bend and generating "
            "shot power from the legs"
        ),
        "wrist_snap": (
            "basketball shooting follow-through drill for wrist snap timing"
        ),
        "guide_hand": (
            "basketball shooting drill to stop guide-hand thumb interference"
        ),
        "low_release": (
            "basketball shooting drill to raise a low release point and set point"
        ),
        "low_release_elbow": (
            "basketball shooting drill for a low release and poor elbow alignment"
        ),
        "none": "basketball shooting form consistency drill",
    }
    query = queries.get(
        flaw_label,
        f"basketball shooting form drill to correct {flaw_label.replace('_', ' ')}",
    )
    force_live = bool(request.get("force_live", False))
    match_threshold = max(
        0.0,
        min(float(request.get("match_threshold", 0.55)), 1.0),
    )
    blocked = re.compile(
        r"just a moment|captcha|access denied|cf-browser-verification|"
        r"page not found|404 not found",
        re.IGNORECASE,
    )

    def as_dict(value: object) -> dict:
        if isinstance(value, dict):
            return value
        if hasattr(value, "model_dump"):
            return value.model_dump()
        return {
            key: getattr(value, key)
            for key in (
                "link",
                "title",
                "description",
                "relevance_score",
                "content",
            )
            if hasattr(value, key)
        }

    def unique_sources(rows: list[dict]) -> list[dict]:
        sources = []
        seen = set()
        for row in rows:
            url = str(row.get("source_url") or row.get("link") or "").strip()
            if not url or url in seen:
                continue
            seen.add(url)
            sources.append(
                {
                    "title": str(
                        row.get("source_title")
                        or row.get("title")
                        or url
                    ),
                    "url": url,
                }
            )
        return sources

    openrouter = AsyncOpenAI(
        api_key=os.environ["OPENROUTER_API_KEY"],
        base_url="https://openrouter.ai/api/v1",
    )
    embedding_response = await openrouter.embeddings.create(
        model="openai/text-embedding-3-small",
        input=query,
    )
    query_embedding = embedding_response.data[0].embedding

    database_base = os.environ["INSFORGE_API_BASE_URL"].rstrip("/")
    database_headers = {
        "Authorization": f"Bearer {os.environ['INSFORGE_API_KEY']}",
        "Content-Type": "application/json",
    }
    rows: list[dict] = []
    retrieval_mode = "pgvector"

    if not force_live:
        async with httpx.AsyncClient(timeout=90) as database:
            response = await database.post(
                database_base + "/api/database/rpc/match_coaching_documents",
                headers=database_headers,
                json={
                    "query_embedding": query_embedding,
                    "match_count": 5,
                    "match_threshold": match_threshold,
                    "filter_flaw_label": (
                        flaw_label
                        if flaw_label
                        in {
                            "elbow_flare",
                            "shallow_dip",
                            "wrist_snap",
                            "guide_hand",
                            "low_release",
                        }
                        else None
                    ),
                },
            )
            response.raise_for_status()
            rows = response.json()

    if not rows:
        retrieval_mode = "brightdata_live"
        async with BrightDataClient(
            token=os.environ["BRIGHTDATA_API_TOKEN"],
            auto_create_zones=False,
        ) as brightdata:
            result = await brightdata.discover(
                query=query,
                intent=(
                    "find authoritative basketball coaching pages with a "
                    "specific, actionable corrective drill"
                ),
                include_content=True,
                num_results=2,
                timeout=180,
            )
            candidates = [as_dict(item) for item in (result.data or [])]
            rows = [
                candidate
                for candidate in candidates
                if len(str(candidate.get("content") or "")) >= 300
                and not blocked.search(str(candidate.get("content") or ""))
            ][:4]

    if not rows:
        raise RuntimeError("No usable coaching sources were retrieved")

    sources = unique_sources(rows)
    if not sources:
        raise RuntimeError("Retrieved coaching content had no source URLs")

    context_parts = []
    for index, row in enumerate(rows[:5], start=1):
        content = str(row.get("content") or "")[:3_500]
        source = str(row.get("source_url") or row.get("link") or "")
        title = str(
            row.get("source_title") or row.get("title") or source
        )
        context_parts.append(f"[{index}] {title}\nURL: {source}\n{content}")

    completion = await openrouter.chat.completions.create(
        model="openai/gpt-4o-mini",
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a basketball shooting coach. Use only the supplied "
                    "source excerpts. Return JSON with exactly these keys: "
                    "summary (one concise sentence), title (short drill name), "
                    "steps (an array of 3 to 5 short, actionable strings). "
                    "Do not include URLs or citations in the JSON."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Flaw: {flaw_label}\nGoal: {query}\n\nSources:\n"
                    + "\n\n---\n\n".join(context_parts)
                ),
            },
        ],
    )
    raw = completion.choices[0].message.content or "{}"
    generated = json.loads(raw)
    steps = generated.get("steps")
    if not isinstance(steps, list) or not 3 <= len(steps) <= 5:
        raise RuntimeError("Coaching model returned an invalid steps array")
    steps = [str(step).strip() for step in steps if str(step).strip()]
    if len(steps) < 3:
        raise RuntimeError("Coaching model returned too few usable steps")

    top_source = sources[0]
    similarities = [
        float(row["similarity"])
        for row in rows
        if row.get("similarity") is not None
    ]
    return {
        "flaw_label": flaw_label,
        "summary": str(generated.get("summary") or "").strip(),
        "drill": {
            "title": str(generated.get("title") or "Form shooting drill").strip(),
            "steps": steps,
            "sourceUrl": top_source["url"],
            "sourceTitle": top_source["title"],
        },
        "sources": sources,
        "retrieval": retrieval_mode,
        "similarity": max(similarities) if similarities else None,
    }
