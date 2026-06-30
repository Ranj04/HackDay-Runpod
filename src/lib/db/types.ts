import { z } from "zod";

import {
  CoachingResultSchema,
  JointMetricsSchema,
  SeveritySchema,
} from "@/lib/contracts";

export const GhostSessionSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  score: z.number(),
  top_flaw_id: z.string(),
  top_flaw_label: z.string(),
  top_flaw_severity: SeveritySchema,
  metrics: JointMetricsSchema,
  coaching: CoachingResultSchema,
  created_at: z.string(),
});

export type GhostSession = z.infer<typeof GhostSessionSchema>;
export type PersistenceMode = "insforge" | "local-demo";
