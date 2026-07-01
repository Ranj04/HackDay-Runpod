// Readiness/liveness probe for the Next app. Reports per-dependency status so a
// load balancer or uptime check can tell whether the app can actually serve
// traffic — not just whether the process is up. Never throws; a dependency being
// down surfaces as a degraded status + 503, never a white-screen.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Check = { status: "ok" | "down" | "unconfigured"; detail?: string };

async function checkSupabase(): Promise<Check> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return { status: "unconfigured" };
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    // Any response < 500 means Supabase answered (a 401 without an apikey still
    // proves reachability). Only a 5xx or a network/timeout error is "down".
    return res.status < 500
      ? { status: "ok" }
      : { status: "down", detail: `HTTP ${res.status}` };
  } catch (e) {
    return { status: "down", detail: e instanceof Error ? e.message : "unreachable" };
  }
}

function checkFlash(): Check {
  const configured = Boolean(
    process.env.RUNPOD_FLASH_BASE_URL ||
      process.env.RUNPOD_POSE_ENDPOINT_URL ||
      process.env.RUNPOD_RAG_ENDPOINT_URL,
  );
  // Not pinged on purpose — a probe shouldn't wake/bill a serverless GPU worker.
  return configured ? { status: "ok" } : { status: "unconfigured" };
}

export async function GET() {
  const [supabase] = await Promise.all([checkSupabase()]);
  const checks = { supabase, flash: checkFlash() };

  // Supabase is the only hard dependency for readiness (auth + persistence). Flash
  // has curated/sample fallbacks, so its absence is degraded-but-serving, not down.
  const ready = checks.supabase.status !== "down";

  return Response.json(
    { status: ready ? "ok" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: ready ? 200 : 503 },
  );
}
