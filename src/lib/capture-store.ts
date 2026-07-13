// Hand-off store for a just-recorded shot: the capture page writes the live
// ShotCapture here, then routes to /results, which reads it back and analyzes
// it. sessionStorage (per-tab, survives client navigation + reload) keeps the
// demo robust — a reload re-runs the same real shot instead of blanking.
import { ShotCaptureSchema, type ShotCapture } from "@/lib/contracts";
import type { SportId } from "@/lib/sports";

const KEY = "echo.capture.v1";
const SPORT_KEY = "echo.capture.sport.v1";
let capturedClip: Blob | null = null;
let capturedSport: SportId | null = null;

export function saveCapture(
  capture: ShotCapture,
  clip?: Blob,
  sport: SportId = "basketball",
): void {
  if (typeof window === "undefined") return;
  capturedClip = clip ?? null;
  capturedSport = sport;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(capture));
    window.sessionStorage.setItem(SPORT_KEY, sport);
  } catch {
    // Quota or private-mode failure: /results falls back to the sample shot.
  }
}

/** Read + validate the stored capture. Returns null when none/invalid. */
export function loadCapture(expectedSport?: SportId): ShotCapture | null {
  if (typeof window === "undefined") return null;
  try {
    const storedSport = window.sessionStorage.getItem(SPORT_KEY) ?? "basketball";
    if (expectedSport && storedSport !== expectedSport) return null;
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = ShotCaptureSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The recorded video survives Next.js client navigation, but not a full reload. */
export function loadCapturedClip(expectedSport?: SportId): Blob | null {
  if (expectedSport && capturedSport !== expectedSport) return null;
  return capturedClip;
}

export function clearCapture(): void {
  if (typeof window === "undefined") return;
  capturedClip = null;
  capturedSport = null;
  try {
    window.sessionStorage.removeItem(KEY);
    window.sessionStorage.removeItem(SPORT_KEY);
  } catch {
    // Best effort.
  }
}
