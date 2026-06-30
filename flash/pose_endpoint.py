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
from runpod_flash import Endpoint, GpuType

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
    dependencies=["rtmlib", "onnxruntime-gpu", "opencv-python-headless", "numpy"],
    system_dependencies=["ffmpeg", "libgl1", "libglib2.0-0"],
)
async def pose(clip: dict) -> dict:
    """One clip -> per-frame COCO-17 keypoints. `clip` = {clip_url|clip_b64, rep_id, stride?}."""
    # Only the function body ships to the worker — import everything here (skill gotcha #1).
    import base64
    import tempfile
    import urllib.request

    import cv2
    import numpy as np
    from rtmlib import Body

    rep_id = clip.get("rep_id", "r1")
    stride = int(clip.get("stride", 1))  # process every Nth frame (1 = all)

    # Materialize the clip to a local file on the worker.
    path = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False).name
    if clip.get("clip_url"):
        urllib.request.urlretrieve(clip["clip_url"], path)
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
    idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % stride == 0:
            kpts, scores = model(frame)  # (N,17,2), (N,17)
            if len(kpts):
                # Largest detected person = the shooter.
                person = int(np.argmax([(k[:, 0].ptp() * k[:, 1].ptp()) for k in kpts]))
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
        idx += 1
    cap.release()

    return {
        "rep_id": rep_id,
        "fps": float(fps),
        "width": width,
        "height": height,
        "keypoint_format": "coco17",
        "frames": frames,
    }
