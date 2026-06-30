import { AnalysisResultSchema, type AnalyzeShot } from "@/lib/contracts";
import { analyzeShot } from "@/lib/core";

/**
 * B4 demo analyzer. Both players go through this same function. The small,
 * deterministic variation represents two distinct sample captures while the
 * real capture/analysis core is still behind the integration gate.
 */
export const analyzeBattleShot: AnalyzeShot = async (capture) => {
  const result = await analyzeShot(capture);
  const variation = capture.id.endsWith("-a") ? 5 : -4;

  return AnalysisResultSchema.parse({
    ...result,
    capture,
    score: Math.max(0, Math.min(100, result.score + variation)),
  });
};
