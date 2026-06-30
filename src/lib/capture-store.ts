// Hand-off store for a just-recorded shot: the capture page writes the live
// ShotCapture here, then routes to /results, which reads it back and analyzes
// it. sessionStorage (per-tab, survives client navigation + reload) keeps the
// demo robust — a reload re-runs the same real shot instead of blanking.
import { ShotCaptureSchema, type ShotCapture } from "@/lib/contracts";

const KEY = "ghost.capture.v1";

export function saveCapture(capture: ShotCapture): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(capture));
  } catch {
    // Quota or private-mode failure: /results falls back to the sample shot.
  }
}

/** Read + validate the stored capture. Returns null when none/invalid. */
export function loadCapture(): ShotCapture | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = ShotCaptureSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function clearCapture(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Best effort.
  }
}
