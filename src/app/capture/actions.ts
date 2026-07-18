"use server";

// Live-capture analysis runs server-side: analyzeShot is pure pose math, but
// coachFlaw reads Nebius (and the future Bright Data) keys from the environment, so the whole
// step must run on the server (keys never reach the client).
import { analyzeShot, coachFlaw } from "@/lib/core";
import {
  applyCaptureScorePolicy,
  type CaptureSource,
} from "@/lib/analysis/scorePolicy";
import {
  analyzeBaseballPitch,
  coachBaseballPitch,
} from "@/lib/analysis/baseball";
import {
  ShotCaptureSchema,
  type AnalysisResult,
  type CoachingResult,
  type ShotCapture,
} from "@/lib/contracts";

export async function analyzeAndCoach(
  capture: ShotCapture,
  source?: CaptureSource,
): Promise<{
  analysis: AnalysisResult;
  coaching: CoachingResult;
}> {
  const parsed = ShotCaptureSchema.parse(capture);
  const rawAnalysis = await analyzeShot(parsed);
  const analysis = source
    ? applyCaptureScorePolicy(rawAnalysis, source)
    : rawAnalysis;
  const coaching = await coachFlaw(analysis.topFlaw);
  return { analysis, coaching };
}

export async function analyzeBaseballAndCoach(capture: ShotCapture): Promise<{
  analysis: AnalysisResult;
  coaching: CoachingResult;
}> {
  const parsed = ShotCaptureSchema.parse(capture);
  const analysis = analyzeBaseballPitch(parsed);
  const coaching = coachBaseballPitch(analysis.topFlaw);
  return { analysis, coaching };
}
