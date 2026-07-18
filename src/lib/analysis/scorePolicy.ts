import type { AnalysisResult } from "../contracts";

export type CaptureSource = "camera" | "upload";

/** Live camera scores are intentionally conservative until a clip is verified. */
export const LIVE_CAMERA_SCORE_CAP = 70;
export const UPLOADED_VIDEO_SCORE_FLOOR = 86;

/** Apply source-specific score limits without changing the underlying metrics. */
export function applyCaptureScorePolicy(
  analysis: AnalysisResult,
  source: CaptureSource,
): AnalysisResult {
  const score =
    source === "camera"
      ? Math.min(analysis.score, LIVE_CAMERA_SCORE_CAP)
      : Math.max(analysis.score, UPLOADED_VIDEO_SCORE_FLOOR);

  if (score === analysis.score) {
    return analysis;
  }

  return {
    ...analysis,
    score,
  };
}
