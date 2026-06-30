// Bright Data retrieval seam for the coaching RAG.
//
// The legacy web-search data source has been removed. The retrieval *interface*
// below is intact, but the live
// data-source wiring is a stub: hasLiveRetrieval() returns false, so coachFlaw
// falls back to the curated drill DB until this seam is implemented.
//
// TODO: Bright Data fetch -> embeddings -> Insforge pgvector (Prompt B, Phase 1)
import type { Drill, Flaw, Reference } from "../contracts";
import { buildQuery } from "./queries";

/** True once the Bright Data fetch -> embeddings -> Insforge pgvector path is wired. */
export function hasLiveRetrieval(): boolean {
  // TODO: Bright Data fetch -> embeddings -> Insforge pgvector (Prompt B, Phase 1)
  return false;
}

/** Retrieve a flaw-specific corrective drill. Stubbed until Bright Data lands. */
export async function retrieveDrill(flaw: Flaw): Promise<Drill> {
  void buildQuery(flaw); // query feeds the future Bright Data Discover/scraper call
  // TODO: Bright Data fetch -> embeddings -> Insforge pgvector (Prompt B, Phase 1)
  throw new Error("Bright Data retrieval not yet wired - using curated fallback");
}

/** Retrieve 1-2 supporting sources for a flaw. Stubbed until Bright Data lands. */
export async function retrieveSources(flaw: Flaw): Promise<Reference[]> {
  void buildQuery(flaw); // query feeds the future Bright Data Discover/scraper call
  // TODO: Bright Data fetch -> embeddings -> Insforge pgvector (Prompt B, Phase 1)
  throw new Error("Bright Data retrieval not yet wired - using curated fallback");
}
