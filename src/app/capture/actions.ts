"use server";

// Live-capture analysis runs server-side: analyzeShot is pure pose math, but
// coachFlaw reads Nebius (and the future Bright Data) keys from the environment, so the whole
// step must run on the server (keys never reach the client).
import { analyzeShot, coachFlaw } from "@/lib/core";
import {
  analyzeBaseballPitch,
  coachBaseballPitch,
} from "@/lib/analysis/baseball";
import {
  analyzeFootballThrow,
  coachFootballThrow,
} from "@/lib/analysis/football";
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

export async function analyzeBaseballAndCoach(capture: ShotCapture): Promise<{
  analysis: AnalysisResult;
  coaching: CoachingResult;
}> {
  const parsed = ShotCaptureSchema.parse(capture);
  const analysis = analyzeBaseballPitch(parsed);
  const coaching = coachBaseballPitch(analysis.topFlaw);
  return { analysis, coaching };
}

export async function analyzeFootballAndCoach(capture: ShotCapture): Promise<{
  analysis: AnalysisResult;
  coaching: CoachingResult;
}> {
  const parsed = ShotCaptureSchema.parse(capture);
  const analysis = await analyzeFootballThrow(parsed);
  const coaching = await coachFootballThrow(analysis.topFlaw);
  return { analysis, coaching };
}
