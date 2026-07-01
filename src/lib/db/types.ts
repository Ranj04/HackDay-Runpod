import { z } from "zod";

import {
  CoachingResultSchema,
  JointMetricsSchema,
  SeveritySchema,
} from "@/lib/contracts";

export const EchoSessionSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  score: z.number(),
  top_flaw_id: z.string(),
  top_flaw_label: z.string(),
  top_flaw_severity: SeveritySchema,
  metrics: JointMetricsSchema,
  coaching: CoachingResultSchema,
  created_at: z.string(),
  report: z.unknown().nullable().optional(),
  clip_url: z.string().nullable().optional(),
  clip_key: z.string().nullable().optional(),
  keypoints_url: z.string().nullable().optional(),
  keypoints_key: z.string().nullable().optional(),
  report_url: z.string().nullable().optional(),
  report_key: z.string().nullable().optional(),
});

export type EchoSession = z.infer<typeof EchoSessionSchema>;
export type PersistenceMode = "supabase" | "local-demo";

export const RunArtifactsSchema = EchoSessionSchema.pick({
  report: true,
  clip_url: true,
  clip_key: true,
  keypoints_url: true,
  keypoints_key: true,
  report_url: true,
  report_key: true,
});
export type RunArtifacts = z.infer<typeof RunArtifactsSchema>;
