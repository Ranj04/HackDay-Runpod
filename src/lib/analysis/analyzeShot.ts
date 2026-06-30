// The full analysis entry point: capture -> metrics -> flaws -> score -> ghost.
import type { AnalysisResult, AnalyzeShot } from "../contracts";
import { extractMetrics } from "./extractMetrics";
import { detectFlaws, scoreForm } from "./flaws";
import { alignToReference } from "./align";
import { REFERENCE_CAPTURE, REFERENCE_METRICS } from "./reference";

/**
 * Turn a ShotCapture into a full AnalysisResult: derived metrics, the ranked
 * flaws (with the single biggest as topFlaw), a transparent score, and the
 * release-aligned reference ghost projected onto the user for overlay.
 */
export const analyzeShot: AnalyzeShot = async (capture): Promise<AnalysisResult> => {
  const metrics = extractMetrics(capture);
  const { topFlaw, allFlaws } = detectFlaws(metrics, REFERENCE_METRICS);
  const score = scoreForm(metrics, REFERENCE_METRICS);
  const ghostRef = alignToReference(capture, REFERENCE_CAPTURE, metrics.releaseFrameIndex ?? 0);
  return { capture, metrics, topFlaw, allFlaws, score, ghostRef };
};
