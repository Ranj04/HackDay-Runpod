// The coaching chain orchestrator: retrieve (Bright Data seam) -> generate
// (Nebius), with a per-flaw cache and a curated offline fallback so the demo
// never depends on a live call on stage.
//
// Server-only — reads API keys from the environment. Person B should call this
// from a server action / route handler, not the client.
import type { CoachFlaw, CoachingResult, Drill, Reference } from "../contracts";
import { CoachingResultSchema } from "../contracts";
import { curatedFor } from "./curated";
import { retrieveDrill, retrieveSources, hasLiveRetrieval } from "./retrieval";
import { generateCoachingNote, templateSummary, hasNebiusKey } from "./nebius";

const cache = new Map<string, CoachingResult>();

export type CoachSource = "live" | "curated" | "cache";
let lastSource: CoachSource = "curated";
/** Which path produced the most recent result (for logging/verification). */
export function lastCoachSource(): CoachSource {
  return lastSource;
}

export const coachFlaw: CoachFlaw = async (flaw): Promise<CoachingResult> => {
  const cached = cache.get(flaw.id);
  if (cached) {
    lastSource = "cache";
    return cached;
  }

  const curated = curatedFor(flaw);
  let drill: Drill = curated.drill;
  let references: Reference[] = curated.references;
  let summary: string;
  let source: CoachSource = "curated";

  try {
    // Retrieval: prefer the live Bright Data seam once it is wired (Prompt B).
    if (hasLiveRetrieval()) {
      drill = await retrieveDrill(flaw);
      references = await retrieveSources(flaw);
    }

    // Generation: Nebius writes the grounded note, else a deterministic template.
    if (hasNebiusKey()) {
      summary = await generateCoachingNote({ flaw, drill, references });
      source = "live";
    } else {
      summary = templateSummary(flaw, drill);
      if (hasLiveRetrieval()) source = "live";
    }
  } catch {
    // Any live failure -> fully curated, demo-safe.
    drill = curated.drill;
    references = curated.references;
    summary = templateSummary(flaw, drill);
    source = "curated";
  }

  const result = CoachingResultSchema.parse({ flawId: flaw.id, summary, drill, references });
  cache.set(flaw.id, result);
  lastSource = source;
  return result;
};

/** Test/demo helper: clear the in-memory coaching cache. */
export function clearCoachCache(): void {
  cache.clear();
}
