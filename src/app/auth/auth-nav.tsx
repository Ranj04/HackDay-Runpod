import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { LogOut } from "lucide-react";

import { signOut } from "./actions";

async function getUserEmail(): Promise<string | null> {
  if (
    !process.env.NEXT_PUBLIC_INSFORGE_URL ||
    !process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
  ) {
    return null;
  }

  try {
    const insforge = createServerClient({
      baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL,
      anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
      cookies: await cookies(),
    });
    const { data } = await insforge.auth.getCurrentUser();
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
        className="ml-1 rounded-full bg-[#2e86ff] px-3.5 py-2 font-medium text-[#04080f] transition hover:bg-[#1e6fe0]"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="ml-1 flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline">
        {email}
      </span>
      <form action={signOut}>
        <button
          className="inline-flex items-center gap-1.5 rounded-full bg-[#2e86ff] px-3.5 py-2 font-medium text-[#04080f] transition hover:bg-[#1e6fe0]"
          type="submit"
        >
          <LogOut className="size-3.5" />
          Sign out
        </button>
      </form>
    </div>
  );
}
