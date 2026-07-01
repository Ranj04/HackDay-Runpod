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
  if (direct?.trim()) return direct.trim();

  const base = flashBaseUrl();
  if (!base) {
    throw new Error("FLASH_NOT_CONFIGURED");
  }
  if (kind === "pose") return `${base}/flash/pose_endpoint/runsync`;
  if (kind === "rag") return `${base}/flash/coaching_rag/drill`;
  return `${base}/flash/orchestrate/rank`;
}

async function postJson(url: string, body: unknown, timeoutMs: number) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (process.env.RUNPOD_API_KEY && !url.includes("127.0.0.1")) {
    headers.authorization = `Bearer ${process.env.RUNPOD_API_KEY}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`Flash request failed (${response.status})`);
  }
  return response.json();
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
    endpointUrl("pose"),
    {
      input: {
        clip: {
          clip_b64: encoded,
          rep_id: fallback.id,
          stride: 2,
        },
      },
    },
    180_000,
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
    endpointUrl("rag"),
    { request: { flaw_label: flaw.id } },
    180_000,
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
    endpointUrl("rank"),
    { clips, attach_drills: false },
    600_000,
  );
  return RankReportSchema.parse(raw?.output ?? raw);
}
