import { analyzeShot, coachFlaw } from "@/lib/core";
import { ShotCaptureSchema } from "@/lib/contracts";
import { poseClipOnGpu } from "@/lib/flash/client";

export const runtime = "nodejs";

// Upload limits — reject invalid/oversized clips with a clean 4xx rather than
// silently degrading or forwarding junk to the GPU worker.
const MAX_CLIP_BYTES = 10_000_000; // 10 MB
const CLIP_TYPE_PREFIX = "video/";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const fallbackCapture = ShotCaptureSchema.parse(
      JSON.parse(String(form.get("capture") ?? "")),
    );
    const clip = form.get("clip");

    if (clip instanceof Blob && clip.size > 0) {
      if (clip.size > MAX_CLIP_BYTES) {
        return Response.json(
          { error: `Clip too large (${(clip.size / 1e6).toFixed(1)}MB, max 10MB)` },
          { status: 413 },
        );
      }
      if (clip.type && !clip.type.startsWith(CLIP_TYPE_PREFIX)) {
        return Response.json(
          { error: `Unsupported clip type: ${clip.type}` },
          { status: 415 },
        );
      }
    }

    let capture = fallbackCapture;
    let compute: "flash-gpu" | "browser-fallback" = "browser-fallback";
    let gpuMs: number | undefined;
    let modelLoadMs: number | undefined;
    let warning: string | undefined;

    if (clip instanceof Blob && clip.size > 0) {
      try {
        const gpu = await poseClipOnGpu(clip, fallbackCapture);
        capture = gpu.capture;
        gpuMs = gpu.gpuMs;
        modelLoadMs = gpu.modelLoadMs;
        compute = "flash-gpu";
      } catch (caught) {
        warning =
          caught instanceof Error ? caught.message : "GPU pose request failed";
      }
    } else {
      warning = "No recorded clip was available for GPU pose";
    }

    const analysis = await analyzeShot(capture);
    const coaching = await coachFlaw(analysis.topFlaw);

    return Response.json({
      analysis,
      coaching,
      compute,
      gpuMs,
      modelLoadMs,
      warning,
    });
  } catch (caught) {
    return Response.json(
      {
        error:
          caught instanceof Error ? caught.message : "Could not analyze clip",
      },
      { status: 400 },
    );
  }
}
