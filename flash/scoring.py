"""Echo at Scale — form scoring (Prompt A, Phase 2).

A faithful Python port of Echo's TypeScript shot-form analysis
(src/lib/analysis/*). Pure CPU math over the pose endpoint's per-frame keypoints.
The COCO-17 names emitted by flash/pose_endpoint.py already match the joint names
Echo's analysis reads (shoulder/elbow/wrist/hip/knee/ankle), so the keypoint
seam needs no remapping.

Public API:
    reference_metrics()                      -> reference JointMetrics (cached)
    score_rep(pose_output, reference=None)   -> {"score": int, "flaw_label": str}

`pose_output` is the dict returned by pose_endpoint.pose (has "frames"; each frame
is {"t": ms, "keypoints": [{"name","x","y","score"}, ...]}).

All angles are 2D image-plane measurements (side-on view) — directional signals,
not lab-grade joint angles (see docs/ARCHITECTURE.md).
"""
from __future__ import annotations

import json
import math
import os
from typing import Optional

Frame = dict
Metrics = dict

_REFERENCE_PATH = os.path.join(os.path.dirname(__file__), "reference", "good_form.json")
_REF_CACHE: Optional[Metrics] = None


# ---- geometry -------------------------------------------------------------

def _kp(frame: Frame, name: str) -> Optional[dict]:
    for k in frame["keypoints"]:
        if k["name"] == name:
            return k
    return None


def _dist(a: dict, b: dict) -> float:
    return math.hypot(a["x"] - b["x"], a["y"] - b["y"])


def _angle_deg(a: dict, b: dict, c: dict) -> float:
    """Interior angle (deg) at vertex b; ~180 = straight/extended, smaller = flexed."""
    v1x, v1y = a["x"] - b["x"], a["y"] - b["y"]
    v2x, v2y = c["x"] - b["x"], c["y"] - b["y"]
    m1 = math.hypot(v1x, v1y)
    m2 = math.hypot(v2x, v2y)
    if m1 == 0 or m2 == 0:
        return math.nan
    cos = max(-1.0, min(1.0, (v1x * v2x + v1y * v2y) / (m1 * m2)))
    return math.degrees(math.acos(cos))


def _round(n: float) -> float:
    return round(n * 100) / 100


# ---- release detection ----------------------------------------------------

def _shooting_side(frames: list[Frame]) -> str:
    """Shooting hand = the wrist with the greater vertical travel."""
    def travel(name: str) -> float:
        lo, hi = math.inf, -math.inf
        for f in frames:
            k = _kp(f, name)
            if k:
                lo = min(lo, k["y"])
                hi = max(hi, k["y"])
        return 0.0 if hi - lo == -math.inf else hi - lo
    return "right" if travel("right_wrist") >= travel("left_wrist") else "left"


def _detect_release(frames: list[Frame], side: str) -> int:
    """Release = peak upward wrist velocity (yPrev - y); fallback = highest wrist."""
    wrist = f"{side}_wrist"
    ys = [(_kp(f, wrist) or {}).get("y") for f in frames]

    best_idx, best_vel = -1, -math.inf
    for t in range(1, len(ys)):
        prev, cur = ys[t - 1], ys[t]
        if prev is None or cur is None:
            continue
        upward = prev - cur
        if upward > best_vel:
            best_vel, best_idx = upward, t
    if best_idx >= 0 and best_vel > 1e-4:
        return best_idx

    min_y, min_idx = math.inf, 0
    for i, y in enumerate(ys):
        if y is not None and y < min_y:
            min_y, min_idx = y, i
    return min_idx


# ---- metrics --------------------------------------------------------------

def _elbow_angle(frame: Frame, side: str) -> Optional[float]:
    s, e, w = _kp(frame, f"{side}_shoulder"), _kp(frame, f"{side}_elbow"), _kp(frame, f"{side}_wrist")
    if not s or not e or not w:
        return None
    a = _angle_deg(s, e, w)
    return None if math.isnan(a) else _round(a)


def _release_height(frame: Frame, side: str) -> Optional[float]:
    w = _kp(frame, f"{side}_wrist")
    return None if not w else _round(1 - w["y"])


def _guide_hand_presence(frame: Frame, side: str) -> Optional[float]:
    shoot = _kp(frame, f"{side}_wrist")
    guide = _kp(frame, f"{'left' if side == 'right' else 'right'}_wrist")
    if not shoot or not guide:
        return None
    return _round(max(0.0, min(1.0, 1 - _dist(shoot, guide) / 0.15)))


def _knee_flexion_at_dip(frames: list[Frame]) -> Optional[float]:
    min_angle: Optional[float] = None
    for f in frames:
        angles = []
        for side in ("left", "right"):
            hip, knee, ankle = _kp(f, f"{side}_hip"), _kp(f, f"{side}_knee"), _kp(f, f"{side}_ankle")
            if hip and knee and ankle:
                a = _angle_deg(hip, knee, ankle)
                if not math.isnan(a):
                    angles.append(a)
        if angles:
            avg = sum(angles) / len(angles)
            if min_angle is None or avg < min_angle:
                min_angle = avg
    return None if min_angle is None else _round(min_angle)


def _wrist_snap_timing(frames: list[Frame], side: str, release_idx: int) -> Optional[float]:
    wrist = f"{side}_wrist"
    peak_idx = release_idx
    peak_y = (_kp(frames[release_idx], wrist) or {}).get("y")
    if peak_y is None:
        return None
    for t in range(release_idx, len(frames)):
        y = (_kp(frames[t], wrist) or {}).get("y")
        if y is not None and y < peak_y:
            peak_y, peak_idx = y, t
    return _round(frames[peak_idx]["t"] - frames[release_idx]["t"])


def extract_metrics(frames: list[Frame]) -> Metrics:
    """Derive all joint metrics for a rep's frames."""
    side = _shooting_side(frames)
    release_idx = _detect_release(frames, side)
    rel = frames[release_idx] if frames else None
    return {
        "releaseElbowAngle": _elbow_angle(rel, side) if rel else None,
        "releaseFrameIndex": release_idx,
        "kneeFlexionAtDip": _knee_flexion_at_dip(frames),
        "wristSnapTiming": _wrist_snap_timing(frames, side, release_idx) if rel else None,
        "guideHandPresence": _guide_hand_presence(rel, side) if rel else None,
        "releaseHeight": _release_height(rel, side) if rel else None,
    }


# ---- flaws + score --------------------------------------------------------

# (key, flaw_id, label, band, weight, dir_high, dir_low) — tuned to the reference.
_METRIC_SPECS = [
    ("releaseElbowAngle", "elbow_flare", "Elbow flaring out at release", 10, 1.0, "too_high", "too_low"),
    ("kneeFlexionAtDip", "shallow_dip", "Shallow leg dip — not enough bend", 12, 0.7, "too_high", "too_low"),
    ("wristSnapTiming", "wrist_snap", "Wrist snap timing off", 80, 0.5, "late", "early"),
    ("guideHandPresence", "guide_hand", "Guide hand interfering at release", 0.25, 0.6, "too_high", "too_low"),
    ("releaseHeight", "low_release", "Release point too low", 0.1, 0.5, "too_high", "too_low"),
]
_MAX_BANDS = 5


def _severity(ratio: float) -> str:
    return "low" if ratio <= 2 else "med" if ratio <= 4 else "high"


def _evaluate(spec, metrics: Metrics, reference: Metrics):
    key, flaw_id, label, band, weight, dir_high, dir_low = spec
    observed, ref = metrics.get(key), reference.get(key)
    if observed is None or ref is None:
        return None
    dev = observed - ref
    ratio = abs(dev) / band
    flaw = {
        "id": flaw_id, "label": label, "severity": _severity(ratio), "metric": key,
        "observed": round(observed * 100) / 100, "reference": round(ref * 100) / 100,
        "direction": dir_high if dev >= 0 else dir_low,
    }
    return {"flaw": flaw, "ratio": ratio, "weight": weight,
            "weighted_penalty": weight * min(1.0, ratio / _MAX_BANDS)}


def detect_flaws(metrics: Metrics, reference: Metrics):
    cands = [c for c in (_evaluate(s, metrics, reference) for s in _METRIC_SPECS) if c]
    if not cands:
        return {"top_flaw": {"id": "none"}, "all_flaws": []}
    cands.sort(key=lambda c: c["ratio"], reverse=True)
    all_flaws = [c["flaw"] for c in cands if c["ratio"] > 1]
    return {"top_flaw": cands[0]["flaw"], "all_flaws": all_flaws, "top_ratio": cands[0]["ratio"]}


def score_form(metrics: Metrics, reference: Metrics) -> int:
    """0-100. penalty = weight·min(1, ratio/MAX_BANDS); score = 100·(1 − Σpen/Σw)."""
    cands = [c for c in (_evaluate(s, metrics, reference) for s in _METRIC_SPECS) if c]
    if not cands:
        return 0
    tw = sum(c["weight"] for c in cands)
    tp = sum(c["weighted_penalty"] for c in cands)
    return round(100 * (1 - tp / tw))


def reference_metrics() -> Metrics:
    global _REF_CACHE
    if _REF_CACHE is None:
        with open(_REFERENCE_PATH) as fh:
            _REF_CACHE = extract_metrics(json.load(fh))
    return _REF_CACHE


def score_rep(pose_output: dict, reference: Optional[Metrics] = None) -> dict:
    """One rep's pose output -> {"score", "flaw_label"}. flaw_label is "none" in-band."""
    ref = reference if reference is not None else reference_metrics()
    metrics = extract_metrics(pose_output["frames"])
    score = score_form(metrics, ref)
    flaws = detect_flaws(metrics, ref)
    label = flaws["top_flaw"]["id"] if flaws.get("top_ratio", 0) > 1 else "none"
    return {"score": score, "flaw_label": label}


# ---- local verify (Phase 2): no GPU, pure CPU math ------------------------

if __name__ == "__main__":
    import copy

    with open(_REFERENCE_PATH) as fh:
        ref_frames = json.load(fh)
    ref = extract_metrics(ref_frames)
    print("reference metrics:", json.dumps(ref))

    good = score_rep({"frames": ref_frames}, ref)
    print("REFERENCE rep ->", good, "(expect high score, flaw_label 'none')")

    # Deliberately bad rep: flare the elbow well past its band + shallow the dip.
    bad_metrics = copy.deepcopy(ref)
    if bad_metrics["releaseElbowAngle"] is not None:
        bad_metrics["releaseElbowAngle"] += 35   # elbow flare (band = 10)
    if bad_metrics["kneeFlexionAtDip"] is not None:
        bad_metrics["kneeFlexionAtDip"] += 30    # too straight = shallow dip
    bad_score = score_form(bad_metrics, ref)
    bad_flaw = detect_flaws(bad_metrics, ref)["top_flaw"]["id"]
    print("BAD rep -> {'score':", bad_score, ", 'flaw_label':", repr(bad_flaw), "} (expect low + 'elbow_flare')")

    assert good["score"] >= 90, f"reference should score high, got {good['score']}"
    assert good["flaw_label"] == "none", f"reference flaw_label should be none, got {good['flaw_label']}"
    assert bad_score < 70, f"bad rep should score low, got {bad_score}"
    assert bad_flaw == "elbow_flare", f"bad rep top flaw should be elbow_flare, got {bad_flaw}"
    print("\nPhase 2 verify: PASS")
