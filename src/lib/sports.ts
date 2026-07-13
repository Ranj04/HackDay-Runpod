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

export const SPORTS: Record<SportId, SportCopy> = {
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
  },
};

export function parseSport(value: string | string[] | undefined): SportId {
  return value === "baseball" ? "baseball" : "basketball";
}
