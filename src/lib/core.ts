import { analyzeShot as realAnalyzeShot } from "@/lib/analysis";
import { coachFlaw as realCoachFlaw } from "@/lib/coach";
import { ShotCaptureSchema, type ShotCapture } from "@/lib/contracts";
import sampleShot from "../../fixtures/sample-shot.json";

// Single integration switch: wired to Person A's real core (analysis + coach).
export const analyzeShot = realAnalyzeShot;
export const coachFlaw = realCoachFlaw;

// Demo/fallback input: a real side-on jump shot with a known elbow flare and
// proper MediaPipe landmark names, so the wired flow renders the full canvas
// (player skeleton + ghost) until live capture-to-results data flow lands.
export const mockShotCapture: ShotCapture = ShotCaptureSchema.parse(sampleShot);
