"use client";

import type { AnalysisResult, CoachingResult } from "@/lib/contracts";

import { getBrowserInsForge, isInsForgeConfigured } from "./client";
import {
  EchoSessionSchema,
  type EchoSession,
  type PersistenceMode,
  type RunArtifacts,
} from "./types";

const LOCAL_SESSION_KEY = "echo.demo.sessions.v1";
const DEMO_USER_ID = "local-demo-player";

export function getPersistenceMode(): PersistenceMode {
  return isInsForgeConfigured() ? "insforge" : "local-demo";
}

export { isInsForgeConfigured };

export async function saveSession(
  analysis: AnalysisResult,
  coaching: CoachingResult,
  artifacts?: RunArtifacts,
): Promise<EchoSession> {
  const client = getBrowserInsForge();
  const createdAt = new Date().toISOString();

  if (!client) {
    const session = toSession(
      analysis,
      coaching,
      DEMO_USER_ID,
      createdAt,
      artifacts,
    );
    const sessions = readLocalSessions();
    writeLocalSessions([session, ...sessions]);
    return session;
  }

  const { data: authData, error: authError } =
    await client.auth.getCurrentUser();

  if (authError) {
    throw authError;
  }
  if (!authData.user) {
    throw new Error("AUTH_REQUIRED");
  }

  const session = toSession(
    analysis,
    coaching,
    authData.user.id,
    createdAt,
    artifacts,
  );
  const { data, error } = await client.database
    .from("echo_sessions")
    .insert([session])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return EchoSessionSchema.parse(data);
}

export async function loadSessions(): Promise<{
  sessions: EchoSession[];
  mode: PersistenceMode;
  userEmail?: string;
}> {
  const client = getBrowserInsForge();

  if (!client) {
    return {
      sessions: readLocalSessions(),
      mode: "local-demo",
    };
  }

  const { data: authData, error: authError } =
    await client.auth.getCurrentUser();
  if (authError) {
    throw authError;
  }
  if (!authData.user) {
    return { sessions: [], mode: "insforge" };
  }

  const { data, error } = await client.database
    .from("echo_sessions")
    .select("*")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return {
    sessions: EchoSessionSchema.array().parse(data ?? []),
    mode: "insforge",
    userEmail: authData.user.email,
  };
}

function toSession(
  analysis: AnalysisResult,
  coaching: CoachingResult,
  userId: string,
  createdAt: string,
  artifacts?: RunArtifacts,
): EchoSession {
  return EchoSessionSchema.parse({
    id: crypto.randomUUID(),
    user_id: userId,
    score: analysis.score,
    top_flaw_id: analysis.topFlaw.id,
    top_flaw_label: analysis.topFlaw.label,
    top_flaw_severity: analysis.topFlaw.severity,
    metrics: analysis.metrics,
    coaching,
    created_at: createdAt,
    ...artifacts,
  });
}

export async function uploadRunArtifacts({
  analysis,
  coaching,
  clip,
  compute,
}: {
  analysis: AnalysisResult;
  coaching: CoachingResult;
  clip: Blob | null;
  compute: {
    provider: "flash-gpu" | "browser-fallback";
    gpuMs?: number;
    modelLoadMs?: number;
  };
}): Promise<RunArtifacts> {
  const client = getBrowserInsForge();
  if (!client) throw new Error("INSFORGE_NOT_CONFIGURED");

  const { data: authData, error: authError } =
    await client.auth.getCurrentUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("AUTH_REQUIRED");

  const runId = analysis.capture.id.replace(/[^a-zA-Z0-9_-]/g, "-");
  const prefix = `${authData.user.id}/${runId}`;
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

  const upload = async (key: string, body: Blob) => {
    const { data, error } = await client.storage
      .from("echo-runs")
      .upload(key, body);
    if (error) throw error;
    if (!data?.url || !data.key) {
      throw new Error(`Storage upload returned no artifact reference for ${key}`);
    }
    return data;
  };

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

function readLocalSessions(): EchoSession[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.localStorage.getItem(LOCAL_SESSION_KEY);
    return value ? EchoSessionSchema.array().parse(JSON.parse(value)) : [];
  } catch {
    return [];
  }
}

function writeLocalSessions(sessions: EchoSession[]) {
  window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sessions));
}
