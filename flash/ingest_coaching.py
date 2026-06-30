"""Bright Data -> embeddings -> Supabase pgvector ingestion worker.

RunPod Flash executes this as a CPU serverless endpoint. The request is a
JSON-serializable object:

    {
      "num_results": 5,
      "topics": [
        {
          "flaw_label": "elbow_flare",
          "query": "basketball shooting drill to fix elbow flare"
        }
      ]
    }

If ``topics`` is omitted, the worker ingests the five flaw classes used by the
current Echo scorer. Every stored chunk retains its source URL and title.

Local verification:

    set -a; source .env.local; set +a
    flash dev --auto-provision
    curl -X POST http://localhost:8888/flash/ingest_coaching/ingest_coaching \
      -H 'content-type: application/json' \
      -d '{"payload":{"num_results":3}}'
"""

import os

from runpod_flash import CpuInstanceType, DataCenter, Endpoint


def _worker_environment() -> dict[str, str]:
    """Forward server-only credentials without placing values in source."""

    names = (
        "BRIGHTDATA_API_TOKEN",
        "OPENROUTER_API_KEY",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
    )
    return {name: os.environ.get(name, "") for name in names}


@Endpoint(
    name="echo-coaching-ingest",
    cpu=CpuInstanceType.CPU5C_2_4,
    datacenter=DataCenter.EU_RO_1,
    workers=(0, 1),
    dependencies=[
        "brightdata-sdk==2.4.0",
        "httpx>=0.27.0",
        "openai>=1.0.0",
    ],
    env=_worker_environment(),
    execution_timeout_ms=900_000,
)
async def ingest_coaching(payload: dict | None = None) -> dict:
    """Collect cited coaching pages, embed clean chunks, and upsert them."""

    # Flash dev ships only the function body, so worker imports and helpers live
    # here rather than depending on module globals.
    import hashlib
    import os
    import re
    from datetime import datetime, timezone
    from urllib.parse import urlsplit, urlunsplit

    import httpx
    from brightdata import BrightDataClient
    from openai import AsyncOpenAI

    request = payload or {}
    required = (
        "BRIGHTDATA_API_TOKEN",
        "OPENROUTER_API_KEY",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
    )
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        raise RuntimeError(f"Missing worker environment: {', '.join(missing)}")

    default_topics = [
        {
            "flaw_label": "elbow_flare",
            "query": (
                "basketball shooting drills to correct elbow flare and align "
                "the shooting elbow under the ball"
            ),
        },
        {
            "flaw_label": "shallow_dip",
            "query": (
                "basketball shooting drills for deeper knee bend and generating "
                "shot power from the legs"
            ),
        },
        {
            "flaw_label": "wrist_snap",
            "query": (
                "basketball shooting drills for wrist snap timing and a relaxed "
                "follow through"
            ),
        },
        {
            "flaw_label": "guide_hand",
            "query": (
                "basketball shooting drills to remove guide hand interference "
                "and guide thumb flick"
            ),
        },
        {
            "flaw_label": "low_release",
            "query": (
                "basketball shooting drills to raise a low release point and "
                "improve the set point"
            ),
        },
    ]
    topics = request.get("topics") or default_topics
    if not isinstance(topics, list) or not topics:
        raise ValueError("topics must be a non-empty array")

    num_results = max(1, min(int(request.get("num_results", 5)), 10))
    chunk_size = max(1_000, min(int(request.get("chunk_size", 5_000)), 8_000))
    overlap = max(100, min(int(request.get("chunk_overlap", 600)), 1_000))
    embedding_model = "openai/text-embedding-3-small"
    blocked = re.compile(
        r"just a moment|captcha|access denied|cf-browser-verification|"
        r"page not found|404 not found",
        re.IGNORECASE,
    )

    def normalize_url(value: str) -> str:
        parts = urlsplit(value)
        path = parts.path.rstrip("/") or "/"
        return urlunsplit(
            (parts.scheme.lower(), parts.netloc.lower(), path, "", "")
        )

    def clean_content(value: str) -> str:
        value = value.replace("\x00", "")
        value = re.sub(r"\r\n?", "\n", value)
        value = re.sub(r"[ \t]+", " ", value)
        value = re.sub(r"\n{3,}", "\n\n", value)
        return value.strip()

    def chunk_content(value: str) -> list[str]:
        paragraphs = [
            paragraph.strip()
            for paragraph in re.split(r"\n{2,}", value)
            if paragraph.strip()
        ]
        chunks: list[str] = []
        buffer = ""
        for paragraph in paragraphs:
            candidate = f"{buffer}\n\n{paragraph}" if buffer else paragraph
            if len(candidate) <= chunk_size:
                buffer = candidate
                continue
            if buffer:
                chunks.append(buffer)
                prefix = buffer[-overlap:]
                buffer = f"{prefix}\n\n{paragraph}"
            else:
                for start in range(0, len(paragraph), chunk_size - overlap):
                    piece = paragraph[start : start + chunk_size]
                    if piece:
                        chunks.append(piece)
                buffer = ""
        if buffer:
            chunks.append(buffer)
        return [chunk for chunk in chunks if len(chunk) >= 250]

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

    openrouter = AsyncOpenAI(
        api_key=os.environ["OPENROUTER_API_KEY"],
        base_url="https://openrouter.ai/api/v1",
    )
    supabase_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    database_url = (
        os.environ["SUPABASE_URL"].rstrip("/")
        + "/rest/v1/coaching_documents"
    )
    database_headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }

    seen_urls: set[str] = set()
    source_urls: list[str] = []
    topic_summaries: list[dict] = []
    errors: list[dict] = []
    inserted_chunks = 0
    skipped_pages = 0

    async with (
        BrightDataClient(
            token=os.environ["BRIGHTDATA_API_TOKEN"],
            auto_create_zones=False,
        ) as brightdata,
        httpx.AsyncClient(timeout=90) as database,
    ):
        for topic in topics:
            if not isinstance(topic, dict):
                raise ValueError("each topic must be an object")
            flaw_label = str(topic.get("flaw_label", "")).strip()
            query = str(topic.get("query", "")).strip()
            if not flaw_label or not query:
                raise ValueError("each topic requires flaw_label and query")

            try:
                result = await brightdata.discover(
                    query=query,
                    intent=(
                        "find authoritative basketball coaching pages with "
                        "specific, actionable shooting-form drills"
                    ),
                    include_content=True,
                    num_results=num_results,
                    timeout=180,
                )
                pages = [as_dict(item) for item in (result.data or [])]
            except Exception as exc:
                errors.append({"flaw_label": flaw_label, "error": str(exc)})
                continue

            topic_chunks = 0
            topic_sources = 0
            for page in pages:
                source_url = str(page.get("link") or "").strip()
                content = clean_content(str(page.get("content") or ""))
                if (
                    not source_url
                    or len(content) < 300
                    or blocked.search(content)
                ):
                    skipped_pages += 1
                    continue

                normalized_url = normalize_url(source_url)
                if normalized_url in seen_urls:
                    continue
                seen_urls.add(normalized_url)

                chunks = chunk_content(content)
                if not chunks:
                    skipped_pages += 1
                    continue

                embedding_response = await openrouter.embeddings.create(
                    model=embedding_model,
                    input=chunks,
                )
                vectors = [item.embedding for item in embedding_response.data]
                if len(vectors) != len(chunks):
                    raise RuntimeError("embedding response count did not match chunks")

                now = datetime.now(timezone.utc).isoformat()
                rows = []
                for index, (chunk, vector) in enumerate(zip(chunks, vectors)):
                    digest = hashlib.sha256(
                        f"{normalized_url}\0{chunk}".encode("utf-8")
                    ).hexdigest()
                    rows.append(
                        {
                            "source_url": source_url,
                            "source_title": page.get("title"),
                            "content": chunk,
                            "content_hash": digest,
                            "flaw_labels": [flaw_label],
                            "embedding": vector,
                            "embedding_model": embedding_model,
                            "metadata": {
                                "query": query,
                                "chunk_index": index,
                                "relevance_score": page.get("relevance_score"),
                                "ingested_at": now,
                            },
                        }
                    )

                # PostgREST can choke on one JSON array holding several
                # 1,536-float vectors, so keep every upsert request bounded to one row.
                for row in rows:
                    response = await database.post(
                        database_url,
                        params={"on_conflict": "content_hash"},
                        headers=database_headers,
                        json=[row],
                    )
                    response.raise_for_status()
                    inserted_chunks += 1
                    topic_chunks += 1
                topic_sources += 1
                source_urls.append(source_url)

            topic_summaries.append(
                {
                    "flaw_label": flaw_label,
                    "sources": topic_sources,
                    "chunks": topic_chunks,
                }
            )

    return {
        "status": "ok" if inserted_chunks else "empty",
        "documents_upserted": inserted_chunks,
        "sources_ingested": len(source_urls),
        "sources": source_urls,
        "skipped_pages": skipped_pages,
        "topics": topic_summaries,
        "errors": errors,
        "embedding_model": embedding_model,
    }
