import { metricsSnapshot } from "@/lib/obs";

// Phase 4 (observability): expose the in-process latency/error rollup so p50/p95
// and error rates are visible without an external metrics backend. Aggregates
// only — no user data, no request payloads — so it stays unauthenticated like
// /api/health. Numbers are per-instance (each process reports its own window).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    routes: metricsSnapshot(),
  });
}
