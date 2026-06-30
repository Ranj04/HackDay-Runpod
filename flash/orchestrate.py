"""Echo at Scale — fan-out orchestrator (Prompt A, Phase 3).

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
import time
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

    SHARED CONTRACT — additive VIZ fields (optional; consumers ignore when absent):
      reps[].dimensions : per-axis 0-100 sub-scores {release_angle, arc, knee_bend,
                          follow_through} surfaced from the scorer (100 = matches
                          the reference). Does NOT change `score` or `flaw_label`.
      timeline          : one {rep_id, worker_id, started_at, finished_at} per clip,
                          timestamps in seconds relative to batch start. Intervals
                          overlap (parallel GPU execution); measurement only — the
                          dispatch/parallelism is untouched.
    """
    ref = reference if reference is not None else reference_metrics()
    outputs = await asyncio.gather(
        *[pose_call(c) for c in clips], return_exceptions=True
    )

    reps = []
    gpu_ms_total = 0.0          # Phase 5 cost panel: GPU-side compute summed over reps
    cpu_t0 = time.time()        # CPU-side = local scoring time
    for clip, out in zip(clips, outputs):
        if isinstance(out, Exception) or not isinstance(out, dict) or "frames" not in out:
            reps.append({"rep_id": clip.get("rep_id"), "score": 0.0,
                         "flaw_label": "error", "keypoints_uri": clip.get("keypoints_uri")})
            continue
        gpu_ms_total += float(out.get("gpu_ms", 0.0))
        res = score_rep(out, ref)
        reps.append({
            "rep_id": clip.get("rep_id"),
            "score": float(res["score"]),
            "flaw_label": res["flaw_label"],
            "keypoints_uri": clip.get("keypoints_uri"),  # optional; B persists/sets it
        })
    cpu_ms = (time.time() - cpu_t0) * 1000.0

    reps.sort(key=lambda r: r["score"])  # ascending — worst first
    return {
        "reps": reps,
        "worst": [r["rep_id"] for r in reps],
        # Additive cost panel for B's UI; the {reps, worst} contract is unchanged.
        "cost": {
            "gpu_seconds": round(gpu_ms_total / 1000.0, 2),
            "cpu_seconds": round(cpu_ms / 1000.0, 3),
            "workers": len(clips),
            "reps": len(reps),
        },
    }


# --- Mock RAG (Phase 4): stub B's drill lookup so the pipeline runs alone -----
# B's RAG endpoint consumes flaw_label and returns a cited corrective drill; until
# integration we fake one per flaw so the full pipeline produces coaching offline.
_MOCK_DRILLS = {
    "elbow_flare": "Wall form-shooting for elbow alignment",
    "shallow_dip": "Dip-and-rise for leg-driven power",
    "wrist_snap": "Follow-through hold for wrist snap",
    "guide_hand": "One-hand form shooting (guide hand off)",
    "low_release": "Raise the set point",
}
_DRILL_SOURCE = "https://www.breakthroughbasketball.com/fundamentals/shooting.html"


def mock_drill(flaw_label: str) -> dict | None:
    """Stand-in for B's RAG drill lookup. None when there's nothing to coach."""
    if flaw_label in ("none", "error"):
        return None
    return {
        "flaw_label": flaw_label,
        "title": _MOCK_DRILLS.get(flaw_label, "Form-shooting reset"),
        "source_url": _DRILL_SOURCE,
        "mock": True,  # replaced by B's real RAG endpoint at integration
    }


def attach_drills(report: dict, k: int | None = None) -> dict:
    """Attach a mocked drill to the worst k reps that have a real flaw (k=None: all)."""
    worst_ids = report["worst"][:k] if k else report["worst"]
    by_id = {r["rep_id"]: r for r in report["reps"]}
    for rid in worst_ids:
        rep = by_id.get(rid)
        if rep:
            drill = mock_drill(rep["flaw_label"])
            if drill:
                rep["drill"] = drill
    return report


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
    attach_drills(report)  # mock B's RAG so the pipeline is coaching-complete alone
    print(json.dumps(report, indent=2))
