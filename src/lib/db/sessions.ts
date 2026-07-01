"use client";

import type { AnalysisResult, CoachingResult } from "@/lib/contracts";

import { getBrowserSupabase, isSupabaseConfigured } from "./client";
import {
  EchoSessionSchema,
  type EchoSession,
  type PersistenceMode,
  type RunArtifacts,
} from "./types";

const LOCAL_SESSION_KEY = "echo.demo.sessions.v1";
const DEMO_USER_ID = "local-demo-player";

export function getPersistenceMode(): PersistenceMode {
  return isSupabaseConfigured() ? "supabase" : "local-demo";
}

export { isSupabaseConfigured };

export async function saveSession(
  analysis: AnalysisResult,
  coaching: CoachingResult,
  artifacts?: RunArtifacts,
): Promise<EchoSession> {
  const supabase = getBrowserSupabase();
  const createdAt = new Date().toISOString();

  if (!supabase) {
    const session = toSession(analysis, coaching, DEMO_USER_ID, createdAt, artifacts);
    writeLocalSessions([session, ...readLocalSessions()]);
    return session;
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("AUTH_REQUIRED");

  const session = toSession(analysis, coaching, authData.user.id, createdAt, artifacts);
  const { data, error } = await supabase
    .from("echo_sessions")
    .insert([session])
    .select()
    .single();
  if (error) throw error;
  return EchoSessionSchema.parse(data);
}

export async function loadSessions(): Promise<{
  sessions: EchoSession[];
  mode: PersistenceMode;
  userEmail?: string;
}> {
  const supabase = getBrowserSupabase();
  if (!supabase) {
    return { sessions: readLocalSessions(), mode: "local-demo" };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return { sessions: [], mode: "supabase" };

  const { data, error } = await supabase
    .from("echo_sessions")
    .select("*")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  return {
    sessions: EchoSessionSchema.array().parse(data ?? []),
    mode: "supabase",
    userEmail: authData.user.email ?? undefined,
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

function readLocalSessions(): EchoSession[] {
  if (typeof window === "undefined") return [];
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
