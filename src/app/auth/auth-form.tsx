"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  authenticate,
  resendVerificationCode,
  verifyEmailCode,
  type AuthActionState,
} from "./actions";

const initialState: AuthActionState = {};

export function AuthForm({
  configured,
  nextPath,
}: {
  configured: boolean;
  nextPath: string;
}) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const action = authenticate.bind(null, mode);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (state.verifyEmail && state.email) {
    return (
      <VerifyEmailForm
        email={state.email}
        nextPath={state.next ?? nextPath}
        notice={state.message}
      />
    );
  }

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 rounded-xl bg-white/5 p-1">
        {(["sign-in", "sign-up"] as const).map((option) => (
          <button
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              mode === option
                ? "bg-[#101a2b] text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
            key={option}
            onClick={() => setMode(option)}
            type="button"
          >
            {option === "sign-in" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form action={formAction} className="space-y-4">
        <input name="next" type="hidden" value={nextPath} />
        {mode === "sign-up" && (
          <Field
            autoComplete="name"
            label="Name"
            name="name"
            placeholder="Your name"
          />
        )}
        <Field
          autoComplete="email"
          label="Email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
        <Field
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          label="Password"
          minLength={8}
          name="password"
          placeholder="At least 8 characters"
          required
          type="password"
        />
        {state.error && (
          <p
            aria-live="polite"
            className="rounded-lg bg-[#ff3b30]/10 px-3 py-2 text-sm text-[#ff9a8a]"
          >
            {state.error}
          </p>
        )}
        {state.message && (
          <p
            aria-live="polite"
            className="rounded-lg bg-[#11233e] px-3 py-2 text-sm text-[#1e2a3d]"
          >
            {state.message}
          </p>
        )}
        <Button
          className="h-11 w-full bg-[#2e86ff] font-medium text-[#04080f] hover:bg-[#1e6fe0]"
          disabled={pending || !configured}
          type="submit"
        >
          {pending && <LoaderCircle className="animate-spin" />}
          {mode === "sign-in" ? "Sign in to Ghost" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
function VerifyEmailForm({
  email,
  nextPath,
  notice,
}: {
  email: string;
  nextPath: string;
  notice?: string;
}) {
  const [state, formAction, pending] = useActionState(
    verifyEmailCode,
    { verifyEmail: true, email, next: nextPath } as AuthActionState,
  );
  const [resendState, resendAction, resending] = useActionState(
    resendVerificationCode,
    { verifyEmail: true, email, next: nextPath } as AuthActionState,
  );

  const banner = state.error
    ? null
    : resendState.message ?? notice;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Verify your email</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the 6-digit code we sent to{" "}
          <span className="font-medium text-foreground">{email}</span>.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <input name="email" type="hidden" value={email} />
        <input name="next" type="hidden" value={nextPath} />
        <label className="block text-sm font-medium">
          Verification code
          <input
            autoComplete="one-time-code"
            autoFocus
            className="mt-1.5 h-12 w-full rounded-lg border border-white/10 bg-[#101a2b] px-3 text-center text-2xl text-foreground tracking-[0.5em] outline-none transition placeholder:text-white/20 focus:border-[#2e86ff] focus:ring-3 focus:ring-[#2e86ff]/25"
            inputMode="numeric"
            maxLength={6}
            name="otp"
            pattern="\d{6}"
            placeholder="······"
            required
          />
        </label>
        {banner && (
          <p
            aria-live="polite"
            className="rounded-lg bg-[#11233e] px-3 py-2 text-sm text-[#cfe2ff]"
          >
            {banner}
          </p>
        )}
        {state.error && (
          <p
            aria-live="polite"
            className="rounded-lg bg-[#ff6a1a]/10 px-3 py-2 text-sm text-[#ffd2b3]"
          >
            {state.error}
          </p>
        )}
        <Button
          className="h-11 w-full bg-[#2e86ff] font-medium text-[#04080f] hover:bg-[#1e6fe0]"
          disabled={pending}
          type="submit"
        >
          {pending && <LoaderCircle className="animate-spin" />}
          Verify and continue
        </Button>
      </form>

      <form action={resendAction} className="mt-3">
        <input name="email" type="hidden" value={email} />
        <input name="next" type="hidden" value={nextPath} />
        <button
          className="flex w-full items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          disabled={resending}
          type="submit"
        >
          {resending && <LoaderCircle className="size-4 animate-spin" />}
          Didn&apos;t get it? Resend code
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  ...props
}: React.ComponentProps<"input"> & { label: string }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        className="mt-1.5 h-11 w-full rounded-lg border border-white/10 bg-[#101a2b] px-3 outline-none transition placeholder:text-white/30 focus:border-[#2e86ff] focus:ring-3 focus:ring-[#2e86ff]/25"
        {...props}
      />
    </label>
  );
}
