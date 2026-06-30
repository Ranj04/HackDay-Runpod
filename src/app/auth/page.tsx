import { Cloud, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";

import { AuthForm } from "./auth-form";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/capture" } = await searchParams;
  const configured = Boolean(
    process.env.NEXT_PUBLIC_INSFORGE_URL &&
      process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
  );

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-2">
      <section>
        <p className="eyebrow">Player account</p>
        <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em]">
          Your progress should outlast the session.
        </h1>
        <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
          Sign in to save every score, see recurring form flaws, and measure
          improvement over time.
        </p>
        <div className="mt-8 space-y-3 text-sm">
          <p className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-[#5aa0ff]" />
            Server-owned refresh session
          </p>
          <p className="flex items-center gap-3">
            <Cloud className="size-5 text-[#5aa0ff]" />
            InsForge-backed player history
          </p>
        </div>
      </section>

      <Card className="border-0 p-3 ring-white/10">
        <CardContent className="p-5 sm:p-7">
          {!configured && (
            <div className="mb-5 rounded-xl border border-[#ff6a1a]/30 bg-[#ff6a1a]/10 p-4 text-sm leading-6 text-[#ffd2b3]">
              InsForge credentials are not configured in this environment.
              Account actions are disabled; you can still use the{" "}
              <Link className="font-semibold underline" href="/results">
                local demo flow
              </Link>
              .
            </div>
          )}
          <AuthForm configured={configured} nextPath={next} />
          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            Test and demo accounts only. Do not reuse a production password.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
