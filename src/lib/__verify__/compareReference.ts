/**
 * One-off: compare extracted JointMetrics for the hand-authored good-form.json
 * vs the real-footage generated/curry.json, to inform flaw-band tuning.
 * Run: npx tsx src/lib/__verify__/compareReference.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { PoseFrameSchema, type PoseFrame, type ShotCapture } from "../contracts";
import { extractMetrics } from "../analysis/extractMetrics";
import { detectShootingSide, detectRelease } from "../analysis/detectRelease";

const root = process.cwd();
const load = (p: string): ShotCapture => {
  const frames = z.array(PoseFrameSchema).parse(
    JSON.parse(readFileSync(join(root, p), "utf8")),
  ) as PoseFrame[];
  return { id: p, frames, fps: 20, view: "side" };
};

for (const p of ["fixtures/reference/good-form.json", "fixtures/reference/generated/curry.json"]) {
  const cap = load(p);
  const side = detectShootingSide(cap);
  const rel = detectRelease(cap, side);
  console.log(`\n=== ${p} ===`);
  console.log(`  frames=${cap.frames.length} shootingSide=${side} releaseIdx=${rel}`);
  console.log("  metrics:", extractMetrics(cap));
}
