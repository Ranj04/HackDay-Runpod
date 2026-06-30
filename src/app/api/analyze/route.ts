import { analyzeShot, coachFlaw } from "@/lib/core";
import { ShotCaptureSchema } from "@/lib/contracts";
import { poseClipOnGpu } from "@/lib/flash/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const fallbackCapture = ShotCaptureSchema.parse(
      JSON.parse(String(form.get("capture") ?? "")),
    );
    const clip = form.get("clip");

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
