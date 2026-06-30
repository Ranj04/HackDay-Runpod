"use server";

import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";

import type { AnalysisResult, CoachingResult } from "@/lib/contracts";

import {
  GhostSessionSchema,
  type GhostSession,
  type PersistenceMode,
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

/**
 * Loads the signed-in user's sessions on the server, where the
 * `insforge_access_token` cookie is available as a bearer token. This avoids
 * the browser SDK's cold-load refresh path, which fails on localhost because
 * the httpOnly refresh cookie is never sent cross-origin to the InsForge API.
 */
export async function loadSessionsAction(): Promise<{
  sessions: GhostSession[];
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
    .from("ghost_sessions")
    .select("*")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return {
    sessions: GhostSessionSchema.array().parse(data ?? []),
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
): Promise<GhostSession> {
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

  const session = GhostSessionSchema.parse({
    id: crypto.randomUUID(),
    user_id: authData.user.id,
    score: analysis.score,
    top_flaw_id: analysis.topFlaw.id,
    top_flaw_label: analysis.topFlaw.label,
    top_flaw_severity: analysis.topFlaw.severity,
    metrics: analysis.metrics,
    coaching,
    created_at: new Date().toISOString(),
  });

  const { data, error } = await insforge.database
    .from("ghost_sessions")
    .insert([session])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return GhostSessionSchema.parse(data);
}
