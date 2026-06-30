"use server";

import { createClient } from "@insforge/sdk";
import { createAuthActions } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

export interface AuthActionState {
  message?: string;
  error?: string;
  /** Set when sign-up needs a 6-digit email verification code. */
  verifyEmail?: boolean;
  /** Email carried into the verification step. */
  email?: string;
  /** Path to redirect to once verified. */
  next?: string;
}

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().trim().max(80).optional(),
  next: z.string().optional(),
});

const verifySchema = z.object({
  email: z.email("Enter a valid email address."),
  otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
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

  if (
    !process.env.NEXT_PUBLIC_INSFORGE_URL ||
    !process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
  ) {
    return {
      error:
        "InsForge is not configured. Add the public project URL and anon key to use account auth.",
    };
  }

  const auth = createAuthActions({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
    cookies: await cookies(),
  });

  const result =
    mode === "sign-up"
      ? await auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          name: parsed.data.name,
          redirectTo: `${getAppUrl()}/auth`,
        })
      : await auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });

  if (result.error) {
    const message = result.error.message ?? "";
    const status = result.error.statusCode;

    // Sign-in on an unverified account: send a fresh code and move the user
    // into the verification step instead of dead-ending on an error.
    if (
      mode === "sign-in" &&
      (status === 403 || /not\s*verif/i.test(message))
    ) {
      await sendVerificationCode(parsed.data.email);
      return {
        verifyEmail: true,
        email: parsed.data.email,
        next: parsed.data.next,
        message:
          "This account isn't verified yet. We sent a fresh 6-digit code — enter it below.",
      };
    }

    // Sign-up for an address that already has an account.
    if (mode === "sign-up" && /already\s*exists/i.test(message)) {
      await sendVerificationCode(parsed.data.email);
      return {
        verifyEmail: true,
        email: parsed.data.email,
        next: parsed.data.next,
        message:
          "That email is already registered. If you never verified it, enter the 6-digit code we just sent. Otherwise switch to Sign in.",
      };
    }

    return { error: message || "Authentication failed." };
  }

  if (
    mode === "sign-up" &&
    result.data &&
    "requireEmailVerification" in result.data &&
    result.data.requireEmailVerification
  ) {
    return {
      verifyEmail: true,
      email: parsed.data.email,
      next: parsed.data.next,
      message: "We emailed you a 6-digit code. Enter it below to finish.",
    };
  }

  redirect(safeNextPath(parsed.data.next));
}

/** Resend the email verification code via the base client (no session needed). */
async function sendVerificationCode(email: string) {
  if (
    !process.env.NEXT_PUBLIC_INSFORGE_URL ||
    !process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
  ) {
    return;
  }
  const client = createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
  });
  await client.auth.resendVerificationEmail({ email });
}

export async function resendVerificationCode(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = (formData.get("email") as string) || "";
  const next = (formData.get("next") as string) || undefined;

  if (!email) {
    return { verifyEmail: true, error: "Missing email address." };
  }

  await sendVerificationCode(email);
  return {
    verifyEmail: true,
    email,
    next,
    message: "Sent a new code. Check your inbox.",
  };
}

export async function verifyEmailCode(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = verifySchema.safeParse({
    email: formData.get("email"),
    otp: formData.get("otp"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return {
      verifyEmail: true,
      email: (formData.get("email") as string) || undefined,
      next: (formData.get("next") as string) || undefined,
      error: parsed.error.issues[0]?.message ?? "Check the code and try again.",
    };
  }

  if (
    !process.env.NEXT_PUBLIC_INSFORGE_URL ||
    !process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
  ) {
    return {
      verifyEmail: true,
      email: parsed.data.email,
      next: parsed.data.next,
      error: "InsForge is not configured.",
    };
  }

  const auth = createAuthActions({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
    cookies: await cookies(),
  });

  const result = await auth.verifyEmail({
    email: parsed.data.email,
    otp: parsed.data.otp,
  });

  if (result.error) {
    return {
      verifyEmail: true,
      email: parsed.data.email,
      next: parsed.data.next,
      error: result.error.message,
    };
  }

  // verifyEmail saves the session — user is signed in.
  redirect(safeNextPath(parsed.data.next));
}

export async function signOut() {
  if (
    process.env.NEXT_PUBLIC_INSFORGE_URL &&
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
  ) {
    const auth = createAuthActions({
      baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL,
      anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
      cookies: await cookies(),
    });
    await auth.signOut();
  }

  redirect("/");
}

function safeNextPath(nextPath?: string) {
  return nextPath?.startsWith("/") && !nextPath.startsWith("//")
    ? nextPath
    : "/capture";
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
