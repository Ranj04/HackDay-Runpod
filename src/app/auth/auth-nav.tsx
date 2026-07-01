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
        className="ml-1 rounded-full bg-primary px-3.5 py-2 font-medium text-primary-foreground transition hover:bg-primary/90"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="ml-1 flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
      <form action={signOut}>
        <button
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 font-medium text-primary-foreground transition hover:bg-primary/90"
          type="submit"
        >
          <LogOut className="size-3.5" />
          Sign out
        </button>
      </form>
    </div>
  );
}
