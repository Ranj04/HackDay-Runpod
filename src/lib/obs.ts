import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

// Phase 4 (observability): structured logging with request IDs + timing, an
// in-process latency/error rollup, and error capture. One JSON object per line
// to stdout so any log drain (Vercel, RunPod, `next start` piped to a file)
// gets machine-parseable events without an agent or SDK.

type LogLevel = "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

const requestContext = new AsyncLocalStorage<{ requestId: string; route: string }>();

/** Reuse a caller-supplied x-request-id so traces span the proxy in front of us. */
export function requestIdFrom(request: Request): string {
  return request.headers.get("x-request-id")?.slice(0, 64) || randomUUID();
}

/** Run `fn` with a request ID + route bound to every log line inside it. */
export function withRequestContext<T>(
  requestId: string,
  route: string,
  fn: () => T,
): T {
  return requestContext.run({ requestId, route }, fn);
}

export function currentRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

export function log(level: LogLevel, event: string, fields: LogFields = {}): void {
  const ctx = requestContext.getStore();
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    requestId: ctx?.requestId,
    route: ctx?.route,
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/**
 * Record a failure as a structured log line and, when SENTRY_DSN is set, ship it
 * to Sentry via the envelope API (no SDK — this Next build is nonstandard, and a
 * raw POST can't break the bundle). Fire-and-forget: capture must never throw or
 * add latency to the request that failed.
 */
export function captureError(event: string, caught: unknown, fields: LogFields = {}): void {
  const error = caught instanceof Error ? caught : new Error(String(caught));
  log("error", event, {
    ...fields,
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack?.split("\n").slice(0, 8).join("\n"),
  });
  void sendToSentry(event, error, fields).catch(() => {});
}

async function sendToSentry(event: string, error: Error, fields: LogFields): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  // DSN = https://<publicKey>@<host>/<projectId>
  const match = /^https:\/\/([^@]+)@([^/]+)\/(\d+)$/.exec(dsn.trim());
  if (!match) return;
  const [, publicKey, host, projectId] = match;

  const eventId = randomUUID().replace(/-/g, "");
  const payload = {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    platform: "javascript",
    level: "error",
    environment: process.env.NODE_ENV,
    tags: { event, requestId: currentRequestId() ?? "" },
    extra: { ...fields, stack: error.stack },
    exception: { values: [{ type: error.name, value: error.message }] },
  };
  const envelope =
    JSON.stringify({ event_id: eventId, sent_at: payload.timestamp }) +
    "\n" +
    JSON.stringify({ type: "event" }) +
    "\n" +
    JSON.stringify(payload);

  await fetch(
    `https://${host}/api/${projectId}/envelope/?sentry_key=${publicKey}&sentry_version=7`,
    {
      method: "POST",
      headers: { "content-type": "application/x-sentry-envelope" },
      body: envelope,
      signal: AbortSignal.timeout(3000),
    },
  );
}

// --- Latency/error rollup -----------------------------------------------------
// Per-process rolling window (last 500 samples per name). Enough to make p50/p95
// and error rate visible on /api/metrics without an external metrics backend;
// in a multi-instance deploy each instance reports its own window.

const WINDOW = 500;
const samples = new Map<string, { durations: number[]; errors: number; total: number }>();

export function recordTiming(name: string, durationMs: number, ok: boolean): void {
  let bucket = samples.get(name);
  if (!bucket) {
    bucket = { durations: [], errors: 0, total: 0 };
    samples.set(name, bucket);
  }
  bucket.total += 1;
  if (!ok) bucket.errors += 1;
  bucket.durations.push(durationMs);
  if (bucket.durations.length > WINDOW) bucket.durations.shift();
}

export function metricsSnapshot() {
  const percentile = (sorted: number[], p: number) =>
    sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : null;

  return Object.fromEntries(
    [...samples.entries()].map(([name, bucket]) => {
      const sorted = [...bucket.durations].sort((a, b) => a - b);
      return [
        name,
        {
          count: bucket.total,
          errors: bucket.errors,
          errorRate: bucket.total ? +(bucket.errors / bucket.total).toFixed(3) : 0,
          p50Ms: percentile(sorted, 0.5),
          p95Ms: percentile(sorted, 0.95),
          maxMs: sorted.at(-1) ?? null,
        },
      ];
    }),
  );
}
