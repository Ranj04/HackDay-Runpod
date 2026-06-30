export type DeploymentStatus = "production";
export type ReferenceBuilderStatus = "curated-reference";

/**
 * Public deployment metadata used by submission packaging and demo tooling.
 *
 * Nebius reference generation is intentionally not marked complete: this
 * workspace had no Nebius credentials, so the demo continues to use the
 * curated reference rather than claiming unverified generated data.
 */
export const deployment = {
  provider: "vercel",
  project: "ghost-form-coach",
  status: "production" as DeploymentStatus,
  url: "https://ghost-form-coach.vercel.app",
  deployedAt: "2026-06-28",
  referenceBuilder: {
    provider: "nebius",
    status: "curated-reference" as ReferenceBuilderStatus,
    generatedReferenceExists: false,
    reason: "Nebius credentials were not available for a real GPU job.",
  },
} as const;
