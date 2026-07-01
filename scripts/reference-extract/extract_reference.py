#!/usr/bin/env python3
"""Extract a side-on shooting rep from a video into a contract-valid PoseFrame[]
JSON that can serve as the reference "echo" in fixtures/reference/generated/.

Uses MediaPipe Tasks PoseLandmarker with pose_landmarker_lite — the SAME model the
browser capture pipeline uses (src/lib/vision/poseLandmarker.ts) — so the output is
byte-compatible with the PoseFrame contract in src/lib/contracts.ts.

Pipeline:
  1. Coarse-scan the clip (IMAGE mode, sampled) for full-body, side-on segments.
  2. Auto-pick the cleanest side-on shooting rep (or use --release to force one).
  3. Fine-extract that window at full frame rate (VIDEO mode).
  4. Write 33-landmark frames, downsampled to ~20fps, rounded to 4 decimals.
  5. Optionally render a skeleton-overlay montage PNG for visual verification.

Usage:
  python extract_reference.py --video curry.mp4 --out ../../fixtures/reference/generated/curry.json
  python extract_reference.py --video curry.mp4 --release 188.0 --montage check.png

The model file (pose_landmarker_lite.task) is downloaded next to this script on
first run if absent. yt-dlp is NOT invoked here — download clips separately (see
README.md) so this stays a pure local-file tool.
"""
import argparse
import json
import os
import sys
import urllib.request

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

POSE_LANDMARK_NAMES = [
    "nose", "left_eye_inner", "left_eye", "left_eye_outer", "right_eye_inner",
    "right_eye", "right_eye_outer", "left_ear", "right_ear", "mouth_left",
    "mouth_right", "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_pinky", "right_pinky", "left_index",
    "right_index", "left_thumb", "right_thumb", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle", "left_heel",
    "right_heel", "left_foot_index", "right_foot_index",
]
IDX = {n: i for i, n in enumerate(POSE_LANDMARK_NAMES)}
MODEL_URL = ("https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
             "pose_landmarker_lite/float16/1/pose_landmarker_lite.task")
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "pose_landmarker_lite.task")


def ensure_model():
    if not os.path.exists(MODEL_PATH):
        print(f"downloading pose model -> {MODEL_PATH}")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)


def scan(video, step):
    """Sampled IMAGE-mode scan. Returns (fps, [per-sample raw metrics])."""
    opts = vision.PoseLandmarkerOptions(
        base_options=python.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=vision.RunningMode.IMAGE, num_poses=1)
    lm = vision.PoseLandmarker.create_from_options(opts)
    cap = cv2.VideoCapture(video)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    out, idx = [], 0
    while cap.grab():
        if idx % step == 0:
            ok, frame = cap.retrieve()
            if ok:
                res = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB,
                                         data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)))
                if res.pose_landmarks:
                    p = res.pose_landmarks[0]
                    ls, rs, lh, rh = p[IDX["left_shoulder"]], p[IDX["right_shoulder"]], p[IDX["left_hip"]], p[IDX["right_hip"]]
                    la, ra, lw, rw = p[IDX["left_ankle"]], p[IDX["right_ankle"]], p[IDX["left_wrist"]], p[IDX["right_wrist"]]
                    sh_y, hip_y = (ls.y + rs.y) / 2, (lh.y + rh.y) / 2
                    out.append({
                        "t": round(idx / fps, 3),
                        "torso": round(abs(sh_y - hip_y), 3),
                        "body": round(abs((la.y + ra.y) / 2 - sh_y), 3),
                        "side": round((abs(ls.x - rs.x) + abs(lh.x - rh.x)) / 2, 3),
                        "vis": round(min(ls.visibility, rs.visibility, lh.visibility,
                                         la.visibility, ra.visibility), 3),
                        "wabove": round(sh_y - min(lw.y, rw.y), 3),
                    })
        idx += 1
        if idx % 6000 == 0:
            print(f"  scan {idx}/{total} ({100*idx/total:.0f}%)", flush=True)
    cap.release(); lm.close()
    return fps, out


def pick_release(samples):
    """Best side-on shooting release: full-body, tightly side-on, real wrist arc."""
    good = [x for x in samples if x["body"] > 0.22 and x["torso"] > 0.09
            and x["side"] < 0.05 and x["vis"] > 0.6]
    segs, cur = [], []
    for x in good:
        if cur and x["t"] - cur[-1]["t"] > 1.5:
            segs.append(cur); cur = []
        cur.append(x)
    if cur:
        segs.append(cur)
    best = None
    for seg in segs:
        if len(seg) < 4:
            continue
        pk = max(seg, key=lambda x: x["wabove"])
        if not (0.05 < pk["wabove"] < 0.4):
            continue
        score = pk["wabove"] - pk["side"]
        if best is None or score > best[0]:
            best = (score, pk["t"])
    return None if best is None else best[1]


def fine_extract(video, t0, t1, target_fps, precision):
    opts = vision.PoseLandmarkerOptions(
        base_options=python.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=vision.RunningMode.VIDEO, num_poses=1)
    lm = vision.PoseLandmarker.create_from_options(opts)
    cap = cv2.VideoCapture(video)
    cap.set(cv2.CAP_PROP_POS_MSEC, t0 * 1000)
    raw = []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        tsec = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0
        if tsec > t1:
            break
        res = lm.detect_for_video(
            mp.Image(image_format=mp.ImageFormat.SRGB,
                     data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)), int(tsec * 1000))
        if res.pose_landmarks:
            raw.append((tsec, res.pose_landmarks[0]))
    cap.release(); lm.close()
    if not raw:
        return []
    t_start = raw[0][0]
    min_gap = 1.0 / target_fps
    frames, last_t = [], None
    for i, (tsec, p) in enumerate(raw):
        if i == 0 or i == len(raw) - 1 or last_t is None or (tsec - last_t) >= min_gap:
            frames.append({
                "t": round((tsec - t_start) * 1000),
                "keypoints": [{"name": POSE_LANDMARK_NAMES[j], "x": round(k.x, precision),
                               "y": round(k.y, precision), "score": round(k.visibility, precision)}
                              for j, k in enumerate(p)],
            })
            last_t = tsec
    return frames


def render_montage(video, frames, win_start_ms, path):
    import numpy as np
    bones = [("left_shoulder", "right_shoulder"), ("left_shoulder", "left_elbow"),
             ("left_elbow", "left_wrist"), ("right_shoulder", "right_elbow"),
             ("right_elbow", "right_wrist"), ("left_shoulder", "left_hip"),
             ("right_shoulder", "right_hip"), ("left_hip", "right_hip"),
             ("left_hip", "left_knee"), ("left_knee", "left_ankle"),
             ("right_hip", "right_knee"), ("right_knee", "right_ankle")]
    cap = cv2.VideoCapture(video)
    tiles = []
    for fr in frames:
        cap.set(cv2.CAP_PROP_POS_MSEC, win_start_ms + fr["t"])
        ok, img = cap.read()
        if not ok:
            continue
        h, w = img.shape[:2]
        kp = {k["name"]: (int(k["x"] * w), int(k["y"] * h)) for k in fr["keypoints"]}
        for a, b in bones:
            cv2.line(img, kp[a], kp[b], (0, 255, 0), 2)
        for n in ("left_wrist", "right_wrist", "left_elbow", "right_elbow"):
            cv2.circle(img, kp[n], 3, (0, 0, 255), -1)
        tiles.append(img)
    cap.release()
    if not tiles:
        return
    cols = min(7, len(tiles))
    rows = (len(tiles) + cols - 1) // cols
    th, tw = tiles[0].shape[:2]
    grid = np.zeros((rows * th, cols * tw, 3), np.uint8)
    for i, t in enumerate(tiles):
        r, c = divmod(i, cols)
        grid[r*th:(r+1)*th, c*tw:(c+1)*tw] = t
    s = 1400 / grid.shape[1]
    cv2.imwrite(path, cv2.resize(grid, (int(grid.shape[1]*s), int(grid.shape[0]*s))))
    print(f"wrote montage {path}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--video", required=True, help="local video file")
    ap.add_argument("--out", required=True, help="output PoseFrame[] JSON")
    ap.add_argument("--release", type=float, default=None,
                    help="force release time (s); skips auto-selection")
    ap.add_argument("--montage", default=None, help="optional verification PNG")
    ap.add_argument("--scan-step", type=int, default=5, help="scan every Nth frame")
    ap.add_argument("--pre", type=float, default=0.85, help="seconds before release")
    ap.add_argument("--post", type=float, default=0.55, help="seconds after release")
    ap.add_argument("--target-fps", type=float, default=20)
    ap.add_argument("--precision", type=int, default=4)
    args = ap.parse_args()

    ensure_model()

    if args.release is not None:
        t_release = args.release
        print(f"forced release t={t_release:.2f}s")
    else:
        print("scanning for side-on shooting reps...")
        _, samples = scan(args.video, args.scan_step)
        t_release = pick_release(samples)
        if t_release is None:
            print("NO side-on shooting rep found — try --release, or a cleaner clip")
            sys.exit(2)
        print(f"auto-picked release t={t_release:.2f}s")

    t0 = max(0.0, t_release - args.pre)
    t1 = t_release + args.post
    frames = fine_extract(args.video, t0, t1, args.target_fps, args.precision)
    if not frames:
        print("NO frames extracted in window")
        sys.exit(3)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    json.dump(frames, open(args.out, "w"), indent=2)
    print(f"wrote {args.out}: {len(frames)} frames, span {frames[-1]['t']}ms")

    if args.montage:
        render_montage(args.video, frames, t0 * 1000, args.montage)


if __name__ == "__main__":
    main()
