/**
 * FROZEN CONTRACTS — the only surface the two build halves share.
 *
 * Person A and Person B both work on main and code against these Zod schemas
 * + inferred types. Editing this file requires a NOTIFY PARTNER gate
 * (see OWNERSHIP.md). Do not change shapes casually.
 *
 * Zod v4. Runtime validation lives here so fixtures, persisted rows, and
 * cross-boundary payloads can all be parsed against one source of truth.
 */
import { z } from "zod";

/** A single tracked body landmark in image-normalized coordinates (0..1). */
export const KeypointSchema = z.object({
  name: z.string(),
  x: z.number(),
  y: z.number(),
  z: z.number().optional(),
  score: z.number(),
});
export type Keypoint = z.infer<typeof KeypointSchema>;

/** One frame of pose: a timestamp (ms) and the landmarks detected in it. */
export const PoseFrameSchema = z.object({
  t: z.number(),
  keypoints: z.array(KeypointSchema),
});
export type PoseFrame = z.infer<typeof PoseFrameSchema>;

/** Camera view the shot was filmed from. Side-on is the primary supported view. */
export const ViewSchema = z.enum(["side", "front"]);
export type View = z.infer<typeof ViewSchema>;

/** A full captured shot: the raw pose sequence plus capture metadata. */
export const ShotCaptureSchema = z.object({
  id: z.string(),
  frames: z.array(PoseFrameSchema),
  fps: z.number(),
  view: ViewSchema,
});
export type ShotCapture = z.infer<typeof ShotCaptureSchema>;

/**
 * Derived biomechanical metrics for a shot. Every field is nullable: a metric
 * is null when it can't be derived from the available view/frames (e.g. knee
 * flexion is unreliable from a front view).
 */
export const JointMetricsSchema = z.object({
  releaseElbowAngle: z.number().nullable(),
  releaseFrameIndex: z.number().int().nullable(),
  kneeFlexionAtDip: z.number().nullable(),
  wristSnapTiming: z.number().nullable(),
  guideHandPresence: z.number().nullable(),
  releaseHeight: z.number().nullable(),
});
export type JointMetrics = z.infer<typeof JointMetricsSchema>;

export const SeveritySchema = z.enum(["low", "med", "high"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const FlawDirectionSchema = z.enum(["too_high", "too_low", "late", "early"]);
export type FlawDirection = z.infer<typeof FlawDirectionSchema>;

/**
 * A single detected form flaw, expressed directionally against a reference.
 * `observed` vs `reference` is the measured gap; `direction` names which way.
 */
export const FlawSchema = z.object({
  id: z.string(),
  label: z.string(),
  severity: SeveritySchema,
  metric: z.string(),
  observed: z.number(),
  reference: z.number(),
  direction: FlawDirectionSchema,
});
export type Flaw = z.infer<typeof FlawSchema>;

/**
 * The full output of the analysis layer for one shot: metrics, the single
 * biggest flaw to coach, all flaws ranked, an overall score, and the
 * temporally-aligned reference ("ghost") pose to overlay.
 */
export const AnalysisResultSchema = z.object({
  capture: ShotCaptureSchema,
  metrics: JointMetricsSchema,
  topFlaw: FlawSchema,
  allFlaws: z.array(FlawSchema),
  score: z.number(),
  ghostRef: z.array(PoseFrameSchema),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

/** A cited reference (drill source or supporting article). */
export const ReferenceSchema = z.object({
  title: z.string(),
  url: z.string(),
});
export type Reference = z.infer<typeof ReferenceSchema>;

/** A retrieved drill that targets a specific flaw, with its source. */
export const DrillSchema = z.object({
  title: z.string(),
  steps: z.array(z.string()),
  sourceUrl: z.string(),
  sourceTitle: z.string(),
});
export type Drill = z.infer<typeof DrillSchema>;

/** The coaching layer's output for one flaw: a plain-language fix + citations. */
export const CoachingResultSchema = z.object({
  flawId: z.string(),
  summary: z.string(),
  drill: DrillSchema,
  references: z.array(ReferenceSchema),
});
export type CoachingResult = z.infer<typeof CoachingResultSchema>;

/**
 * The two core function signatures both halves build against.
 * Person A implements these; Person B calls them.
 */
export type AnalyzeShot = (capture: ShotCapture) => Promise<AnalysisResult>;
export type CoachFlaw = (flaw: Flaw) => Promise<CoachingResult>;
