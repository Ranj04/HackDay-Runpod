"use server";

// Live-capture analysis runs server-side: analyzeShot is pure pose math, but
// coachFlaw reads You.com/Tavily/Nebius keys from the environment, so the whole
// step must run on the server (keys never reach the client).
import { analyzeShot, coachFlaw } from "@/lib/core";
import {
  ShotCaptureSchema,
  type AnalysisResult,
  type CoachingResult,
  type ShotCapture,
} from "@/lib/contracts";

export async function analyzeAndCoach(capture: ShotCapture): Promise<{
  analysis: AnalysisResult;
  coaching: CoachingResult;
}> {
  const parsed = ShotCaptureSchema.parse(capture);
  const analysis = await analyzeShot(parsed);
  const coaching = await coachFlaw(analysis.topFlaw);
  return { analysis, coaching };
}
