export type SportId = "basketball" | "baseball";

export interface SportCopy {
  id: SportId;
  label: string;
  discipline: string;
  headline: string;
  accentHeadline: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  sampleHref: string;
  trackedLabel: string;
  alignedLabel: string;
}

export interface SportProfile extends SportCopy {
  movement: "shot" | "pitch";
  checkpoints: readonly [string, string, string];
}

export const SPORTS: Record<SportId, SportProfile> = {
  basketball: {
    id: "basketball",
    label: "Basketball",
    discipline: "Basketball form coach",
    headline: "See the shot",
    accentHeadline: "you can’t feel.",
    description:
      "Echo turns one video into measured mechanics, a visual reference, and one cited drill to fix what matters most.",
    primaryLabel: "Analyze your shot",
    primaryHref: "/capture",
    secondaryLabel: "View sample",
    sampleHref: "/results",
    trackedLabel: "Pose tracked",
    alignedLabel: "Reference aligned",
    movement: "shot",
    checkpoints: ["Dip", "Release", "Follow-through"],
  },
  baseball: {
    id: "baseball",
    label: "Baseball",
    discipline: "Baseball pitching coach",
    headline: "See the pitch",
    accentHeadline: "frame by frame.",
    description:
      "Echo maps your pitching sequence, compares your checkpoints with a reference, and gives you one focused drill for the next bullpen.",
    primaryLabel: "Analyze your pitch",
    primaryHref: "/capture?sport=baseball",
    secondaryLabel: "View sample",
    sampleHref: "/results?sport=baseball",
    trackedLabel: "Delivery tracked",
    alignedLabel: "Sequence aligned",
    movement: "pitch",
    checkpoints: ["Load", "Foot strike", "Release"],
  },
};

export function parseSport(value: string | string[] | undefined): SportId {
  return value === "baseball" ? "baseball" : "basketball";
}

/** Keep the selected sport in every athlete-facing route. */
export function sportHref(pathname: string, sport: SportId): string {
  return sport === "baseball" ? `${pathname}?sport=baseball` : pathname;
}
