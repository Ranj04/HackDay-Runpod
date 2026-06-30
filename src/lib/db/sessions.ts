"use client";

import type { AnalysisResult, CoachingResult } from "@/lib/contracts";

import { getBrowserInsForge, isInsForgeConfigured } from "./client";
import {
  GhostSessionSchema,
  type GhostSession,
  type PersistenceMode,
} from "./types";

const LOCAL_SESSION_KEY = "ghost.demo.sessions.v1";
const DEMO_USER_ID = "local-demo-player";

export function getPersistenceMode(): PersistenceMode {
  return isInsForgeConfigured() ? "insforge" : "local-demo";
}

export { isInsForgeConfigured };

export async function saveSession(
  analysis: AnalysisResult,
  coaching: CoachingResult,
): Promise<GhostSession> {
  const client = getBrowserInsForge();
  const createdAt = new Date().toISOString();

  if (!client) {
    const session = toSession(
      analysis,
      coaching,
      DEMO_USER_ID,
      createdAt,
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
  );
  const { data, error } = await client.database
    .from("ghost_sessions")
    .insert(session)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return GhostSessionSchema.parse(data);
}

export async function loadSessions(): Promise<{
  sessions: GhostSession[];
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
    .from("ghost_sessions")
    .select("*")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return {
    sessions: GhostSessionSchema.array().parse(data ?? []),
    mode: "insforge",
    userEmail: authData.user.email,
  };
}

function toSession(
  analysis: AnalysisResult,
  coaching: CoachingResult,
  userId: string,
  createdAt: string,
): GhostSession {
  return GhostSessionSchema.parse({
    id: crypto.randomUUID(),
    user_id: userId,
    score: analysis.score,
    top_flaw_id: analysis.topFlaw.id,
    top_flaw_label: analysis.topFlaw.label,
    top_flaw_severity: analysis.topFlaw.severity,
    metrics: analysis.metrics,
    coaching,
    created_at: createdAt,
  });
}

function readLocalSessions(): GhostSession[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.localStorage.getItem(LOCAL_SESSION_KEY);
    return value ? GhostSessionSchema.array().parse(JSON.parse(value)) : [];
  } catch {
    return [];
  }
}

function writeLocalSessions(sessions: GhostSession[]) {
  window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sessions));
}
