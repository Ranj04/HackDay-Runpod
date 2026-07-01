// Flash-served coaching RAG: Supabase pgvector first, Bright Data live fallback.
import type { CoachingResult, Drill, Flaw, Reference } from "../contracts";
import { hasFlashRag, retrieveCitedDrill } from "../flash/client";
import { buildQuery } from "./queries";

const cache = new Map<string, Promise<CoachingResult>>();

function retrieve(flaw: Flaw): Promise<CoachingResult> {
  const existing = cache.get(flaw.id);
  if (existing) return existing;
  void buildQuery(flaw);
  const pending = retrieveCitedDrill(flaw);
  cache.set(flaw.id, pending);
  pending.catch(() => cache.delete(flaw.id));
  return pending;
}

/** True when a Flash RAG base URL is configured (or during local development). */
export function hasLiveRetrieval(): boolean {
  return hasFlashRag();
}

export async function retrieveDrill(flaw: Flaw): Promise<Drill> {
  return (await retrieve(flaw)).drill;
}

export async function retrieveSources(flaw: Flaw): Promise<Reference[]> {
  return (await retrieve(flaw)).references;
}
