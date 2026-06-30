// Flaw-specific search queries. The flaw drives the query so retrieval returns a
// corrective drill for THAT flaw, not a generic "shooting tips" page.
import type { Flaw } from "../contracts";

const FLAW_QUERIES: Record<string, string> = {
  elbow_flare: "basketball shooting drill to fix elbow flaring out, elbow alignment under the ball",
  shallow_dip: "basketball shooting drill more leg bend knee dip generating power from legs",
  wrist_snap: "basketball shooting follow through wrist snap timing drill",
  guide_hand: "basketball shooting guide hand off the ball thumb drill one-hand form",
  low_release: "basketball drill raise release point higher set point shot pocket",
};

/** Build the retrieval query for a flaw. */
export function buildQuery(flaw: Flaw): string {
  return FLAW_QUERIES[flaw.id] ?? `basketball shooting form drill to fix ${flaw.label.toLowerCase()}`;
}
