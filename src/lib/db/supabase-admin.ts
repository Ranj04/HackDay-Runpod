import "server-only";

import { createClient } from "@supabase/supabase-js";

// Server-only Supabase admin client (service role) for storage writes. Auth is
// still InsForge until Phase 3, so uploads run with the service key (bypassing
// Storage RLS); the echo-runs bucket is public for stable, renderable URLs.
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

/** Upload bytes to Supabase Storage (service role) → { url, key }. */
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
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return { url: data.publicUrl, key };
}
