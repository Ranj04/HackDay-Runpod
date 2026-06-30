"""Ghost at Scale — GPU pose endpoint (Prompt A, Phase 1).

Server-side pose estimation on a Runpod Flash GPU worker, replacing Ghost's old
client-side MediaPipe step. RTMPose (via rtmlib) runs per video frame and emits
per-frame keypoints. Queue-based decorator so the Phase-3 orchestrator can fan
out across clips with `asyncio.gather`.

Transport: clips are passed by URL (Flash has a 10MB payload limit — never inline
a video). The worker downloads the clip, decodes frames with OpenCV, and runs
RTMPose. A small clip may instead be passed base64 in `clip_b64` for local dev.

Output (consumed by flash/scoring.py in Phase 2):
    {
      "rep_id": "r1",
      "fps": 30.0,
      "width": 1080, "height": 1920,
      "keypoint_format": "coco17",
      "frames": [ {"t": 0.0, "keypoints": [{"name","x","y","score"}, ...17]}, ... ]
    }
x/y are normalized to 0..1 (image-plane), matching Ghost's keypoint convention.
"""
from runpod_flash import CudaVersion, Endpoint, GpuType

# COCO-17 keypoint order emitted by rtmlib's Body model.
COCO17_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle",
]


@Endpoint(
    name="ghost-pose",
    gpu=GpuType.NVIDIA_GEFORCE_RTX_4090,
    workers=(0, 5),
    min_cuda_version=CudaVersion.V13_0,
    # onnxruntime-gpu's CUDA-13 wheel doesn't bundle CUDA libs and the worker base
    # image doesn't reliably provide libcudart.so.13 — ship the CUDA-13 runtime via
    # pip nvidia wheels (onnxruntime>=1.19 auto-loads them from site-packages).
    # CUDA-13 nvidia wheels are unsuffixed (the -cu13 names are deprecated stubs).
    dependencies=[
        "rtmlib", "onnxruntime-gpu", "opencv-python-headless", "numpy",
        "nvidia-cuda-runtime", "nvidia-cudnn-cu13", "nvidia-cublas",
        "nvidia-cufft", "nvidia-curand",
    ],
    system_dependencies=["ffmpeg", "libgl1", "libglib2.0-0"],
)
async def pose(clip: dict) -> dict:
    """One clip -> per-frame COCO-17 keypoints. `clip` = {clip_url|clip_b64, rep_id, stride?, debug?}."""
    # Only the function body ships to the worker — import everything here (skill gotcha #1).
    import base64
    import tempfile
    import urllib.request

    import cv2
    import numpy as np
    from rtmlib import Body, draw_skeleton

    rep_id = clip.get("rep_id", "r1")
    stride = int(clip.get("stride", 1))  # process every Nth frame (1 = all)
    debug = bool(clip.get("debug", False))  # return one annotated frame (base64 PNG)

    # Materialize the clip to a local file on the worker.
    path = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False).name
    if clip.get("clip_url"):
        # Send a browser UA — some CDNs (e.g. Pexels) 403 the default urllib agent.
        req = urllib.request.Request(
            clip["clip_url"],
            headers={"User-Agent": "Mozilla/5.0", "Accept": "*/*"},
        )
        with urllib.request.urlopen(req, timeout=120) as resp, open(path, "wb") as fh:
            fh.write(resp.read())
    elif clip.get("clip_b64"):
        with open(path, "wb") as fh:
            fh.write(base64.b64decode(clip["clip_b64"]))
    else:
        raise ValueError("clip requires 'clip_url' or 'clip_b64'")

    # RTMPose on GPU (det + pose, COCO-17). Models download to cache on cold start.
    model = Body(mode="balanced", backend="onnxruntime", device="cuda")

    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1

    frames = []
    best_wrist_y = 1.0  # lowest normalized y == highest hand == near release
    debug_png = None
    idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % stride == 0:
            kpts, scores = model(frame)  # (N,17,2), (N,17)
            if len(kpts):
                # Largest detected person = the shooter.
                # bbox-area heuristic; np.ptp() — ndarray.ptp() was removed in numpy 2.
                person = int(np.argmax([np.ptp(k[:, 0]) * np.ptp(k[:, 1]) for k in kpts]))
                pk, ps = kpts[person], scores[person]
                keypoints = [
                    {
                        "name": COCO17_NAMES[j],
                        "x": float(pk[j][0] / width),
                        "y": float(pk[j][1] / height),
                        "score": float(ps[j]),
                    }
                    for j in range(len(COCO17_NAMES))
                ]
                frames.append({"t": idx / fps * 1000.0, "keypoints": keypoints})

                # Keep an annotated PNG of the near-release frame for eyeballing.
                if debug:
                    wrist_y = min(pk[9][1], pk[10][1]) / height  # L/R wrist
                    if wrist_y < best_wrist_y:
                        best_wrist_y = wrist_y
                        try:
                            ann = draw_skeleton(frame.copy(), kpts, scores, kpt_thr=0.4)
                            ok_png, buf = cv2.imencode(".png", ann)
                            if ok_png:
                                debug_png = base64.b64encode(buf.tobytes()).decode()
                        except Exception as exc:  # draw must never break extraction
                            debug_png = f"draw_error: {exc}"
        idx += 1
    cap.release()

    return {
        "rep_id": rep_id,
        "fps": float(fps),
        "width": width,
        "height": height,
        "keypoint_format": "coco17",
        "frames": frames,
        "debug_frame_b64": debug_png,
    }
