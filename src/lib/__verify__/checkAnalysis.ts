/**
 * Analysis verify harness — the gate Person A codes against.
 *
 * Run:  npx tsx src/lib/__verify__/checkAnalysis.ts
 *
 * It validates the fixtures against the frozen Zod contracts, then runs whatever
 * analysis functions exist (exported from src/lib/analysis) against the
 * injected-flaw sample, verifying as much as is currently implemented:
 *   - Phase A2: detectRelease / extractMetrics → release frame within tolerance.
 *   - Phase A3: analyzeShot → full AnalysisResult, top flaw matches ground truth.
 *
 * Exit codes: 0 = all currently-implemented checks pass, 1 = a check failed or
 * nothing is implemented yet (gate pending), 2 = fixtures invalid.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ShotCaptureSchema, PoseFrameSchema, AnalysisResultSchema, type JointMetrics } from "../contracts";
import { z } from "zod";
import * as analysis from "../analysis";

const root = process.cwd();
const readJson = (p: string) => JSON.parse(readFileSync(join(root, p), "utf8"));
const fn = (name: string): ((...a: unknown[]) => unknown) | null => {
  const v = (analysis as Record<string, unknown>)[name];
  return typeof v === "function" ? (v as (...a: unknown[]) => unknown) : null;
};

const GroundTruthSchema = z.object({
  topFlawId: z.string(),
  releaseFrameIndex: z.number().int(),
  releaseTolerance: z.number().int(),
  note: z.string().optional(),
});

function validateFixtures() {
  const sample = ShotCaptureSchema.parse(readJson("fixtures/sample-shot.json"));
  const reference = z.array(PoseFrameSchema).parse(readJson("fixtures/reference/good-form.json"));
  const truth = GroundTruthSchema.parse(readJson("fixtures/ground-truth.json"));
  console.log(
    `✓ fixtures valid against contracts — sample: ${sample.frames.length} frames, ` +
      `reference: ${reference.length} frames, expected flaw: ${truth.topFlawId} @ release ${truth.releaseFrameIndex}`,
  );
  return { sample, truth };
}

async function main() {
  let sample: z.infer<typeof ShotCaptureSchema>;
  let truth: z.infer<typeof GroundTruthSchema>;
  try {
    ({ sample, truth } = validateFixtures());
  } catch (err) {
    console.error("✗ fixtures do NOT parse against contracts:");
    console.error(err);
    process.exit(2);
  }

  const withinTol = (idx: number | null | undefined) =>
    idx != null && Math.abs(idx - truth.releaseFrameIndex) <= truth.releaseTolerance;
  const reportRelease = (idx: number | null | undefined) =>
    console.log(`  release: ${idx} (expected ~${truth.releaseFrameIndex}, ±${truth.releaseTolerance}) — ${withinTol(idx) ? "OK" : "MISMATCH"}`);

  // ---- Phase A3: full analyzeShot gate (preferred when present) ----
  const analyzeShot = fn("analyzeShot");
  if (analyzeShot) {
    const result = AnalysisResultSchema.parse(await analyzeShot(sample));
    const flawOk = result.topFlaw.id === truth.topFlawId;
    const releaseOk = withinTol(result.metrics.releaseFrameIndex);
    console.log("  metrics:", result.metrics);
    console.log(`  topFlaw: ${result.topFlaw.id} (expected ${truth.topFlawId}) — ${flawOk ? "OK" : "MISMATCH"}`);
    reportRelease(result.metrics.releaseFrameIndex);
    if (flawOk && releaseOk) {
      console.log("✓ analysis gate PASSED (A3 full)");
      process.exit(0);
    }
    console.error("✗ analysis gate FAILED");
    process.exit(1);
  }

  // ---- Phase A2: release detection + metrics ----
  const extractMetrics = fn("extractMetrics");
  const detectRelease = fn("detectRelease");
  let releaseIdx: number | null | undefined;
  if (extractMetrics) {
    const metrics = extractMetrics(sample) as JointMetrics;
    releaseIdx = metrics.releaseFrameIndex;
    console.log("  metrics:", metrics);
  } else if (detectRelease) {
    releaseIdx = detectRelease(sample) as number;
  }

  if (releaseIdx == null) {
    console.log("⏳ gate pending: no analysis implemented yet (expected until Phase A2/A3).");
    process.exit(1);
  }

  reportRelease(releaseIdx);
  console.log("  note: flaw detection + scoring pending (Phase A3).");
  if (withinTol(releaseIdx)) {
    console.log("✓ A2 checks PASSED (release within tolerance)");
    process.exit(0);
  }
  console.error("✗ A2 check FAILED (release out of tolerance)");
  process.exit(1);
}

main();
