"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase/server";

export interface AuthActionState {
  message?: string;
  error?: string;
  /** Retained for form compatibility; email is auto-confirmed so this stays false. */
  verifyEmail?: boolean;
  email?: string;
  next?: string;
}

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().trim().max(80).optional(),
  next: z.string().optional(),
});

export async function authenticate(
  mode: "sign-in" | "sign-up",
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. Add the project URL and anon key." };
  }

  const supabase = await getServerSupabase();
  if (mode === "sign-up") {
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { name: parsed.data.name } },
    });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error) return { error: error.message };
  }

  redirect(safeNextPath(parsed.data.next));
}

// Email auto-confirm is enabled, so the 6-digit verification step never triggers.
// These stay exported for the auth form's imports.
export async function resendVerificationCode(
  _previousState: AuthActionState,
  _formData: FormData,
): Promise<AuthActionState> {
  return { message: "No verification needed — sign in with your password." };
}

export async function verifyEmailCode(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  redirect(safeNextPath((formData.get("next") as string) || undefined));
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await getServerSupabase();
    await supabase.auth.signOut();
  }
  redirect("/");
}

function safeNextPath(nextPath?: string) {
  return nextPath?.startsWith("/") && !nextPath.startsWith("//")
    ? nextPath
    : "/capture";
}
