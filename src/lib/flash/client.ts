import "server-only";

import { z } from "zod";

import {
  CoachingResultSchema,
  PoseFrameSchema,
  ReferenceSchema,
  ShotCaptureSchema,
  type CoachingResult,
  type Flaw,
  type ShotCapture,
} from "@/lib/contracts";
import { captureError, currentRequestId, log, recordTiming } from "@/lib/obs";

const MAX_FLASH_CLIP_BYTES = 7_000_000;
const DEFAULT_DEV_BASE = "http://127.0.0.1:8888";

const PoseOutputSchema = z.object({
  fps: z.number().positive(),
  frames: z.array(PoseFrameSchema).min(1),
  gpu_ms: z.number().optional(),
  model_load_ms: z.number().optional(),
});

const RagOutputSchema = z.object({
  summary: z.string().min(1),
  drill: CoachingResultSchema.shape.drill,
  sources: z.array(ReferenceSchema).min(1),
});

function flashBaseUrl(): string | null {
  const configured = process.env.RUNPOD_FLASH_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return process.env.NODE_ENV === "development" ? DEFAULT_DEV_BASE : null;
}

function endpointUrl(kind: "pose" | "rag" | "rank"): string {
  const direct =
    kind === "pose"
      ? process.env.RUNPOD_POSE_ENDPOINT_URL
      : kind === "rag"
        ? process.env.RUNPOD_RAG_ENDPOINT_URL
        : process.env.RUNPOD_RANK_ENDPOINT_URL;
  if (direct?.trim()) return normalizeRunpodUrl(direct.trim(), kind);

  const base = flashBaseUrl();
  if (!base) {
    throw new Error("FLASH_NOT_CONFIGURED");
  }
  if (kind === "pose") return `${base}/flash/pose_endpoint/runsync`;
  if (kind === "rag") return `${base}/flash/coaching_rag/drill`;
  return `${base}/flash/orchestrate/rank`;
}

/** Append RunPod serverless / Flash path suffixes when env vars are bare hosts. */
function normalizeRunpodUrl(url: string, kind: "pose" | "rag" | "rank"): string {
  const trimmed = url.replace(/\/$/, "");
  if (/api\.runpod\.ai\/v2\/[^/]+$/i.test(trimmed)) {
    return `${trimmed}/runsync`;
  }
  if (trimmed.includes(".api.runpod.ai") && !trimmed.includes("/flash/")) {
    const suffix =
      kind === "pose"
        ? "/flash/pose_endpoint/runsync"
        : kind === "rag"
          ? "/flash/coaching_rag/drill"
          : "/flash/orchestrate/rank";
    return `${trimmed}${suffix}`;
  }
  return trimmed;
}

async function postJson(
  kind: "pose" | "rag" | "rank",
  url: string,
  body: unknown,
  timeoutMs: number,
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (process.env.RUNPOD_API_KEY && !url.includes("127.0.0.1")) {
    headers.authorization = `Bearer ${process.env.RUNPOD_API_KEY}`;
  }

  // Phase 4 (observability): every outbound Flash call is timed and logged under
  // the caller's request ID, so a slow or failed run names the exact dependency.
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const durationMs = Date.now() - startedAt;
    recordTiming(`flash.${kind}`, durationMs, response.ok);
    if (!response.ok) {
      log("error", "flash.call_failed", {
        kind,
        host: new URL(url).host,
        status: response.status,
        durationMs,
      });
      throw new Error(`Flash request failed (${response.status})`);
    }
    log("info", "flash.call", { kind, host: new URL(url).host, durationMs });
    return response.json();
  } catch (caught) {
    if (!(caught instanceof Error && caught.message.startsWith("Flash request failed"))) {
      // Network error / timeout — the fetch never got a status to log above.
      recordTiming(`flash.${kind}`, Date.now() - startedAt, false);
      captureError("flash.call_errored", caught, {
        kind,
        host: new URL(url).host,
        durationMs: Date.now() - startedAt,
      });
    }
    throw caught;
  }
}

export function hasFlashRag(): boolean {
  return Boolean(
    process.env.RUNPOD_RAG_ENDPOINT_URL ||
      process.env.RUNPOD_FLASH_BASE_URL ||
      process.env.NODE_ENV === "development",
  );
}

export function hasFlashRank(): boolean {
  return Boolean(
    process.env.RUNPOD_RANK_ENDPOINT_URL ||
      process.env.RUNPOD_FLASH_BASE_URL ||
      process.env.NODE_ENV === "development",
  );
}

const RankRepSchema = z.object({
  rep_id: z.string(),
  score: z.number(),
  flaw_label: z.string(),
  keypoints_uri: z.string().nullable().optional(),
  dimensions: z
    .object({
      release_angle: z.number(),
      arc: z.number(),
      knee_bend: z.number(),
      follow_through: z.number(),
    })
    .optional(),
});

const RankReportSchema = z.object({
  reps: z.array(RankRepSchema).min(1),
  worst: z.array(z.string()).min(1),
  cost: z
    .object({
      gpu_seconds: z.number().optional(),
      cpu_seconds: z.number().optional(),
      workers: z.number().optional(),
      reps: z.number().optional(),
    })
    .optional(),
  timeline: z
    .array(
      z.object({
        rep_id: z.string(),
        worker_id: z.string(),
        started_at: z.number(),
        finished_at: z.number(),
      }),
    )
    .optional(),
});

export type FlashRankReport = z.infer<typeof RankReportSchema>;

export async function poseClipOnGpu(
  clip: Blob,
  fallback: ShotCapture,
): Promise<{
  capture: ShotCapture;
  gpuMs?: number;
  modelLoadMs?: number;
}> {
  if (clip.size === 0 || clip.size > MAX_FLASH_CLIP_BYTES) {
    throw new Error(
      clip.size === 0 ? "EMPTY_CLIP" : "CLIP_TOO_LARGE_FOR_FLASH",
    );
  }

  const encoded = Buffer.from(await clip.arrayBuffer()).toString("base64");
  const raw = await postJson(
    "pose",
    endpointUrl("pose"),
    {
      input: {
        clip: {
          clip_b64: encoded,
          rep_id: fallback.id,
          stride: 2,
          // Phase 4: correlates the worker's log lines with this server request.
          request_id: currentRequestId(),
        },
      },
    },
    // Cap the wait: allows a GPU cold start (~25-35s) but never hangs for minutes.
    // If it exceeds this, the caller keeps the instant browser-keypoint result.
    40_000,
  );
  const output = PoseOutputSchema.parse(raw?.output ?? raw);
  const capture = ShotCaptureSchema.parse({
    id: fallback.id,
    view: fallback.view,
    fps: output.fps / 2,
    frames: output.frames,
  });

  return {
    capture,
    gpuMs: output.gpu_ms,
    modelLoadMs: output.model_load_ms,
  };
}

export async function retrieveCitedDrill(
  flaw: Flaw,
): Promise<CoachingResult> {
  const raw = await postJson(
    "rag",
    endpointUrl("rag"),
    // `auth` is the shared secret the load-balanced RAG worker checks (server-only
    // env, never exposed to the browser). Empty when unset -> worker fails open.
    {
      flaw_label: flaw.id,
      auth: process.env.FLASH_SHARED_SECRET ?? "",
      request_id: currentRequestId(),
    },
    10_000, // coaching has a curated fallback — fail fast, don't hang the UI
  );
  const output = RagOutputSchema.parse(raw?.output ?? raw);
  return CoachingResultSchema.parse({
    flawId: flaw.id,
    summary: output.summary,
    drill: output.drill,
    references: output.sources,
  });
}

export async function rankClipsOnFlash(
  clips: Array<Record<string, unknown>>,
): Promise<FlashRankReport> {
  const raw = await postJson(
    "rank",
    endpointUrl("rank"),
    { clips, attach_drills: false },
    600_000,
  );
  return RankReportSchema.parse(raw?.output ?? raw);
}
