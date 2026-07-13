import { analyzeShot, coachFlaw } from "@/lib/core";
import {
  analyzeBaseballPitch,
  coachBaseballPitch,
} from "@/lib/analysis/baseball";
import {
  analyzeFootballThrow,
  coachFootballThrow,
} from "@/lib/analysis/football";
import {
  ShotCaptureSchema,
  type AnalysisResult,
  type CoachingResult,
  type Flaw,
  type ShotCapture,
} from "@/lib/contracts";
import { poseClipOnGpu } from "@/lib/flash/client";
import { parseSport, type SportId } from "@/lib/sports";
import {
  captureError,
  log,
  recordTiming,
  requestIdFrom,
  withRequestContext,
} from "@/lib/obs";

export const runtime = "nodejs";

// Upload limits — reject invalid/oversized clips with a clean 4xx rather than
// silently degrading or forwarding junk to the GPU worker.
const MAX_CLIP_BYTES = 10_000_000; // 10 MB
const CLIP_TYPE_PREFIX = "video/";

function assertNeverSport(sport: never): never {
  throw new Error(`Unsupported sport: ${String(sport)}`);
}

async function analyzeCaptureForSport(
  sport: SportId,
  capture: ShotCapture,
): Promise<AnalysisResult> {
  switch (sport) {
    case "basketball":
      return analyzeShot(capture);
    case "baseball":
      return analyzeBaseballPitch(capture);
    case "football":
      return analyzeFootballThrow(capture);
    default:
      return assertNeverSport(sport);
  }
}

async function coachFlawForSport(
  sport: SportId,
  flaw: Flaw,
): Promise<CoachingResult> {
  switch (sport) {
    case "basketball":
      return coachFlaw(flaw);
    case "baseball":
      return coachBaseballPitch(flaw);
    case "football":
      return coachFootballThrow(flaw);
    default:
      return assertNeverSport(sport);
  }
}

export async function POST(request: Request) {
  // Phase 4 (observability): every response carries x-request-id, and every log
  // line inside handle() carries the same ID — a failed run is traceable from the
  // browser's network tab to the server logs to the Flash worker logs.
  const requestId = requestIdFrom(request);
  const startedAt = Date.now();

  const response = await withRequestContext(requestId, "/api/analyze", () =>
    handle(request),
  );

  recordTiming("/api/analyze", Date.now() - startedAt, response.ok);
  response.headers.set("x-request-id", requestId);
  return response;
}

async function handle(request: Request): Promise<Response> {
  const startedAt = Date.now();
  try {
    const form = await request.formData();
    const fallbackCapture = ShotCaptureSchema.parse(
      JSON.parse(String(form.get("capture") ?? "")),
    );
    const clip = form.get("clip");
    const sport = parseSport(String(form.get("sport") ?? ""));

    if (clip instanceof Blob && clip.size > 0) {
      if (clip.size > MAX_CLIP_BYTES) {
        log("warn", "analyze.rejected", { reason: "clip_too_large", bytes: clip.size });
        return Response.json(
          { error: `Clip too large (${(clip.size / 1e6).toFixed(1)}MB, max 10MB)` },
          { status: 413 },
        );
      }
      if (clip.type && !clip.type.startsWith(CLIP_TYPE_PREFIX)) {
        log("warn", "analyze.rejected", { reason: "bad_clip_type", clipType: clip.type });
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
        // Degraded, not failed — the browser keypoints still produce a result,
        // but the GPU miss must be visible, not silent.
        captureError("analyze.gpu_pose_failed", caught, { clipBytes: clip.size });
      }
    } else {
      warning = "No recorded clip was available for GPU pose";
    }

    const analysis = await analyzeCaptureForSport(sport, capture);
    const coaching = await coachFlawForSport(sport, analysis.topFlaw);

    log("info", "analyze.done", {
      durationMs: Date.now() - startedAt,
      compute,
      gpuMs,
      modelLoadMs,
      topFlaw: analysis.topFlaw?.id,
      sport,
      degraded: Boolean(warning),
    });

    return Response.json({
      analysis,
      coaching,
      compute,
      gpuMs,
      modelLoadMs,
      warning,
    });
  } catch (caught) {
    captureError("analyze.failed", caught, { durationMs: Date.now() - startedAt });
    return Response.json(
      {
        error:
          caught instanceof Error ? caught.message : "Could not analyze clip",
      },
      { status: 400 },
    );
  }
}
