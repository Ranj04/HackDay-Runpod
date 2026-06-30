"""Phase 0 smoke test: confirm a trivial @Endpoint round-trips to a real GPU.

Load-balanced GET route. `flash dev` namespaces routes by file path, so this
file (flash/hello_gpu.py) is served at /flash/hello_gpu/gpu. Auth via
RUNPOD_API_KEY in the env (or `flash login`).

    export RUNPOD_API_KEY=...           # from .env.local
    flash dev --auto-provision > /tmp/flash-dev.log 2>&1 &
    until grep -q "localhost:" /tmp/flash-dev.log; do sleep 2; done
    curl -s "http://localhost:8888/flash/hello_gpu/gpu"
    # verified: {"gpu":"NVIDIA GeForce RTX 4090","cuda":"12.8"} from a remote worker

Teardown — `flash dev` deploys under a `live-` prefix; scope it (never --all on
a shared account):

    kill %1; flash undeploy live-echo-hello-gpu --force
"""
from runpod_flash import Endpoint, GpuType

gpu = Endpoint(
    name="echo-hello-gpu",
    gpu=GpuType.NVIDIA_GEFORCE_RTX_4090,
    workers=(0, 1),
    dependencies=["torch"],
)


@gpu.get("/gpu")
async def report_gpu():
    # Only the function body ships to the worker — import inside (skill gotcha #1).
    import torch

    return {
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "no-cuda",
        "cuda": torch.version.cuda,
    }
