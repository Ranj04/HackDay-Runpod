import "server-only";

import { createClient } from "@supabase/supabase-js";

// Server-only Supabase admin client (service role) for storage writes.
// Uploads run with the service key (bypassing Storage RLS). The echo-runs bucket
// is PRIVATE — reads go through short-lived signed URLs, never world-readable
// public links, so one user can't fetch another user's clips/keypoints/reports.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "echo-runs";

let admin: ReturnType<typeof createClient> | null = null;

function adminClient() {
  if (!url || !serviceKey) throw new Error("SUPABASE_NOT_CONFIGURED");
  admin ??= createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(url && serviceKey);
}

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1h

/** Upload bytes to Supabase Storage (service role) → { url, key }. The bucket is
 *  private, so `url` is a short-lived signed URL; persist `key` for on-demand
 *  re-signing via {@link signedUrlForKey}. */
export async function uploadArtifact(
  key: string,
  body: Blob,
): Promise<{ url: string; key: string }> {
  const supabase = adminClient();
  const { error } = await supabase.storage.from(BUCKET).upload(key, body, {
    upsert: true,
    contentType: body.type || "application/octet-stream",
  });
  if (error) throw new Error(error.message);
  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(key, SIGNED_URL_TTL_SECONDS);
  if (signError || !data) throw new Error(signError?.message ?? "SIGN_FAILED");
  return { url: data.signedUrl, key };
}

/** Mint a fresh signed URL for a stored artifact key (private-bucket reads). */
export async function signedUrlForKey(
  key: string,
  expiresIn = SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  const { data, error } = await adminClient()
    .storage.from(BUCKET)
    .createSignedUrl(key, expiresIn);
  return error || !data ? null : data.signedUrl;
}

/**
 * Per-key fixed-window rate limit (Postgres-backed, atomic, serverless-safe).
 * Returns true when the call is allowed, false when the limit is exceeded.
 * Fails OPEN — if the limiter itself errors we never block a legitimate user.
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const { data, error } = await adminClient().rpc(
      "check_rate_limit",
      { p_key: key, p_max: max, p_window_seconds: windowSeconds } as never,
    );
    if (error) return true;
    return data === true;
  } catch {
    return true;
  }
}
