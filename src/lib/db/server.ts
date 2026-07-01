"use server";

import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";

import {
  AnalysisResultSchema,
  CoachingResultSchema,
  type AnalysisResult,
  type CoachingResult,
} from "@/lib/contracts";
import type { CoachedReport } from "@/lib/sample-report";

import { uploadArtifact } from "./supabase-admin";

import {
  EchoSessionSchema,
  RunArtifactsSchema,
  type EchoSession,
  type PersistenceMode,
  type RunArtifacts,
} from "./types";

function configured() {
  return Boolean(
    process.env.NEXT_PUBLIC_INSFORGE_URL &&
      process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
  );
}

async function client() {
  return createServerClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
    cookies: await cookies(),
  });
}

type ComputeMeta = {
  provider: "flash-gpu" | "browser-fallback";
  gpuMs?: number;
  modelLoadMs?: number;
};

/** Uploads clip/keypoints/report to Supabase Storage (service-role). */
async function uploadRunArtifactsServer(
  userId: string,
  analysis: AnalysisResult,
  coaching: CoachingResult,
  clip: Blob | null,
  compute: ComputeMeta,
): Promise<RunArtifacts> {
  const runId = analysis.capture.id.replace(/[^a-zA-Z0-9_-]/g, "-");
  const prefix = `${userId}/${runId}`;
  const report = {
    version: 1,
    compute,
    reps: [
      {
        rep_id: analysis.capture.id,
        score: analysis.score,
        flaw_label: analysis.topFlaw.id,
        keypoints_uri: `${prefix}/keypoints.json`,
      },
    ],
    worst: [analysis.capture.id],
    analysis,
    coaching,
  };

  const upload = (key: string, body: Blob) => uploadArtifact(key, body);

  const keypoints = await upload(
    `${prefix}/keypoints.json`,
    new Blob([JSON.stringify(analysis.capture)], {
      type: "application/json",
    }),
  );
  const reportFile = await upload(
    `${prefix}/report.json`,
    new Blob([JSON.stringify(report)], { type: "application/json" }),
  );

  let clipFile: { url: string; key: string } | undefined;
  if (clip) {
    const extension = clip.type.includes("mp4") ? "mp4" : "webm";
    clipFile = await upload(`${prefix}/clip.${extension}`, clip);
  }

  return {
    report,
    clip_url: clipFile?.url ?? null,
    clip_key: clipFile?.key ?? null,
    keypoints_url: keypoints.url,
    keypoints_key: keypoints.key,
    report_url: reportFile.url,
    report_key: reportFile.key,
  };
}

/**
 * Persists a completed analysis for the signed-in user. Accepts FormData so
 * clip bytes and auth both flow through the server (browser InsForge client
 * cannot read httpOnly session cookies for storage upload).
 */
export async function saveCompleteSessionAction(
  formData: FormData,
): Promise<EchoSession> {
  if (!configured()) {
    throw new Error("AUTH_REQUIRED");
  }

  const analysis = AnalysisResultSchema.parse(
    JSON.parse(String(formData.get("analysis") ?? "{}")),
  );
  const coaching = CoachingResultSchema.parse(
    JSON.parse(String(formData.get("coaching") ?? "{}")),
  );
  const compute = JSON.parse(String(formData.get("compute") ?? "{}")) as ComputeMeta;
  const clipEntry = formData.get("clip");
  const clip =
    clipEntry instanceof Blob && clipEntry.size > 0 ? clipEntry : null;

  const insforge = await client();
  const { data: authData, error: authError } =
    await insforge.auth.getCurrentUser();
  if (authError) {
    throw new Error(authError.message);
  }
  if (!authData.user) {
    throw new Error("AUTH_REQUIRED");
  }

  let artifacts: RunArtifacts | undefined;
  try {
    artifacts = await uploadRunArtifactsServer(
      authData.user.id,
      analysis,
      coaching,
      clip,
      compute,
    );
  } catch {
    // Progress still saves if storage is misconfigured; clip/keypoints are optional.
    artifacts = undefined;
  }

  return saveSessionAction(analysis, coaching, artifacts);
}

/**
 * Loads the signed-in user's sessions on the server, where the
 * `insforge_access_token` cookie is available as a bearer token. This avoids
 * the browser SDK's cold-load refresh path, which fails on localhost because
 * the httpOnly refresh cookie is never sent cross-origin to the InsForge API.
 */
export async function loadSessionsAction(): Promise<{
  sessions: EchoSession[];
  mode: PersistenceMode;
  userEmail?: string;
}> {
  if (!configured()) {
    return { sessions: [], mode: "local-demo" };
  }

  const insforge = await client();

  const { data: authData, error: authError } =
    await insforge.auth.getCurrentUser();
  if (authError) {
    throw new Error(authError.message);
  }
  if (!authData.user) {
    return { sessions: [], mode: "insforge" };
  }

  const { data, error } = await insforge.database
    .from("echo_sessions")
    .select("*")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return {
    sessions: EchoSessionSchema.array().parse(data ?? []),
    mode: "insforge",
    userEmail: authData.user.email,
  };
}

/**
 * Persists a completed analysis for the signed-in user (server-side, so the
 * access-token cookie authenticates the insert under RLS). Throws
 * `AUTH_REQUIRED` when no session is present so the UI can redirect to sign-in.
 */
export async function saveSessionAction(
  analysis: AnalysisResult,
  coaching: CoachingResult,
  artifactInput?: RunArtifacts,
): Promise<EchoSession> {
  if (!configured()) {
    throw new Error("AUTH_REQUIRED");
  }

  const insforge = await client();

  const { data: authData, error: authError } =
    await insforge.auth.getCurrentUser();
  if (authError) {
    throw new Error(authError.message);
  }
  if (!authData.user) {
    throw new Error("AUTH_REQUIRED");
  }
  const artifacts = artifactInput
    ? RunArtifactsSchema.parse(artifactInput)
    : undefined;

  const session = EchoSessionSchema.parse({
    id: crypto.randomUUID(),
    user_id: authData.user.id,
    score: analysis.score,
    top_flaw_id: analysis.topFlaw.id,
    top_flaw_label: analysis.topFlaw.label,
    top_flaw_severity: analysis.topFlaw.severity,
    metrics: analysis.metrics,
    coaching,
    created_at: new Date().toISOString(),
    ...artifacts,
  });

  const { data, error } = await insforge.database
    .from("echo_sessions")
    .insert([session])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return EchoSessionSchema.parse(data);
}

const NULL_METRICS = {
  releaseElbowAngle: null,
  releaseFrameIndex: null,
  kneeFlexionAtDip: null,
  wristSnapTiming: null,
  guideHandPresence: null,
  releaseHeight: null,
};

const FALLBACK_COACHING: CoachingResult = {
  flawId: "none",
  summary: "Clean rep — nothing to fix.",
  drill: { title: "Maintain form", steps: ["Keep grooving the motion."], sourceUrl: "", sourceTitle: "" },
  references: [],
};

/**
 * Persists a fan-out report for the signed-in user (RLS). The full SHARED
 * CONTRACT goes in `report`; the summary columns come from the worst rep, so the
 * run also shows up in history.
 */
export async function saveReportAction(report: CoachedReport): Promise<EchoSession> {
  if (!configured()) {
    throw new Error("AUTH_REQUIRED");
  }
  const insforge = await client();
  const { data: authData, error: authError } = await insforge.auth.getCurrentUser();
  if (authError) {
    throw new Error(authError.message);
  }
  if (!authData.user) {
    throw new Error("AUTH_REQUIRED");
  }

  const worst = report.reps.find((r) => r.rep_id === report.worst[0]) ?? report.reps[0];
  const coaching = worst?.coaching ?? FALLBACK_COACHING;

  const session = EchoSessionSchema.parse({
    id: crypto.randomUUID(),
    user_id: authData.user.id,
    score: worst?.score ?? 0,
    top_flaw_id: worst?.flaw_label ?? "none",
    top_flaw_label: worst?.flaw_label ?? "none",
    top_flaw_severity: "high",
    metrics: NULL_METRICS,
    coaching,
    created_at: new Date().toISOString(),
    report,
  });

  const { data, error } = await insforge.database
    .from("echo_sessions")
    .insert([session])
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return EchoSessionSchema.parse(data);
}

/** Loads the signed-in user's most recent persisted report (for reload). */
export async function loadLatestReportAction(): Promise<CoachedReport | null> {
  if (!configured()) {
    return null;
  }
  const insforge = await client();
  const { data: authData, error: authError } = await insforge.auth.getCurrentUser();
  if (authError) {
    throw new Error(authError.message);
  }
  if (!authData.user) {
    return null;
  }

  const { data, error } = await insforge.database
    .from("echo_sessions")
    .select("report, created_at")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) {
    throw new Error(error.message);
  }

  const row = (data ?? []).find((r: { report?: unknown }) => r.report);
  return (row?.report as CoachedReport | undefined) ?? null;
}
