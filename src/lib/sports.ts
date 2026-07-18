export const SPORT_IDS = ["basketball", "baseball", "football"] as const;

export type SportId = (typeof SPORT_IDS)[number];

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
  movement: "shot" | "pitch" | "throw";
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
  football: {
    id: "football",
    label: "Football",
    discipline: "Quarterback throwing coach",
    headline: "See the throw",
    accentHeadline: "checkpoint by checkpoint.",
    description:
      "Echo compares your throwing sequence with a quarterback reference and gives you one focused correction for the next rep.",
    primaryLabel: "Analyze your throw",
    primaryHref: "/capture?sport=football",
    secondaryLabel: "View sample",
    sampleHref: "/results?sport=football",
    trackedLabel: "Throw tracked",
    alignedLabel: "Sequence aligned",
    movement: "throw",
    checkpoints: ["Set", "Foot plant", "Release"],
  },
};

export function parseSport(value: string | string[] | undefined): SportId {
  return value === "baseball" || value === "football"
    ? value
    : "basketball";
}

/** Keep the selected sport and any flow state in athlete-facing routes. */
export function sportHref(
  pathname: string,
  sport: SportId,
  query?: string | { toString(): string },
): string {
  const params = new URLSearchParams(query?.toString() ?? "");
  if (sport === "basketball") {
    params.delete("sport");
  } else {
    params.set("sport", sport);
  }
  const serialized = params.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}
