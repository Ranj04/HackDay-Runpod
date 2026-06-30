"""Ghost at Scale — fan-out orchestrator (Prompt A, Phase 3).

The Runpod showcase: take N clips, dispatch them to the GPU pose endpoint in
parallel with `asyncio.gather` (workers scale 0->N), score each on the CPU, and
return a report ranked worst-first.

`rank()` is transport-agnostic — it fans out over an injected `pose_call`:
  - native_pose_call: the runpod_flash awaitable (for integration / `flash deploy`)
  - http_pose_call_factory: POSTs to a running `flash dev` (used by the verify)

Scoring is local CPU math (flash/scoring.py); the reference metrics are loaded
once here and passed in, so the scorer never needs the reference file on a worker.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import urllib.request

# Make `scoring` importable whether run as a script (cwd=flash/) or imported by
# `flash dev`'s project scan from the repo root.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scoring import reference_metrics, score_rep  # noqa: E402

POSE_ROUTE = "/flash/pose_endpoint/runsync"


def _post_json(url: str, payload: dict, timeout: int = 600) -> dict:
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


async def rank(clips: list[dict], pose_call, reference: dict | None = None) -> dict:
    """N clips -> ranked report {reps:[{rep_id,score,flaw_label}], worst:[rep_id...]}.

    Fan-out is the single `asyncio.gather` below: one in-flight pose job per clip,
    so the GPU endpoint scales 0->N workers. A failed rep scores 0 / "error" so one
    bad clip never sinks the whole batch.
    """
    ref = reference if reference is not None else reference_metrics()
    outputs = await asyncio.gather(
        *[pose_call(c) for c in clips], return_exceptions=True
    )

    reps = []
    for clip, out in zip(clips, outputs):
        if isinstance(out, Exception) or not isinstance(out, dict) or "frames" not in out:
            reps.append({"rep_id": clip.get("rep_id"), "score": 0.0, "flaw_label": "error"})
            continue
        res = score_rep(out, ref)
        reps.append({
            "rep_id": clip.get("rep_id"),
            "score": float(res["score"]),
            "flaw_label": res["flaw_label"],
        })

    reps.sort(key=lambda r: r["score"])  # ascending — worst first
    return {"reps": reps, "worst": [r["rep_id"] for r in reps]}


async def native_pose_call(clip: dict) -> dict:
    """Dispatch one clip to the GPU pose endpoint via runpod_flash (integration path)."""
    from pose_endpoint import pose
    return await pose(clip)


def http_pose_call_factory(base_url: str):
    """Build a pose_call that POSTs to a running `flash dev` server (dev verify)."""
    async def call(clip: dict) -> dict:
        raw = await asyncio.to_thread(
            _post_json, f"{base_url}{POSE_ROUTE}", {"input": {"clip": clip}}
        )
        return raw.get("output", raw)  # unwrap runsync envelope
    return call


if __name__ == "__main__":
    # Dev fan-out: requires a running `flash dev` and a CLIP_URL. Submits N clips
    # in parallel and prints the ranked report.
    base = os.environ.get("FLASH_BASE", "http://localhost:8888")
    clip_url = os.environ["CLIP_URL"]
    n = int(os.environ.get("N", "5"))
    clips = [
        {"clip_url": clip_url, "rep_id": f"r{i + 1}", "stride": 4, "nonce": f"{i}-{os.getpid()}"}
        for i in range(n)
    ]
    report = asyncio.run(rank(clips, http_pose_call_factory(base)))
    print(json.dumps(report, indent=2))
