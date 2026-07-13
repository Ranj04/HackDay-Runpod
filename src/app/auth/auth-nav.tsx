import Link from "next/link";
import { LogOut } from "lucide-react";

import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase/server";

import { signOut } from "./actions";

async function getUserEmail(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await getServerSupabase();
    const { data } = await supabase.auth.getUser();
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

export async function AuthNav() {
  const email = await getUserEmail();

  if (!email) {
    return (
      <Link
        href="/auth"
        className="inline-flex h-11 items-center rounded-md border border-border px-5 font-medium text-foreground transition hover:border-primary hover:bg-primary/10"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
      <form action={signOut}>
        <button
          className="inline-flex h-11 items-center gap-1.5 rounded-md border border-border px-4 font-medium text-foreground transition hover:border-primary hover:bg-primary/10"
          type="submit"
        >
          <LogOut className="size-3.5" />
          Sign out
        </button>
      </form>
    </div>
  );
}
