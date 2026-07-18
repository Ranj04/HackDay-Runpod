import { EchoSessionSchema, type EchoSession } from "@/lib/db/types";

const MOCK_USER_ID = "mock-progress-baseline";
const MOCK_ID_PREFIX = "mock-progress-";

type MockEntry = {
  createdAt: string;
  flawId: string;
  flawLabel: string;
  score: number;
};

const entries: MockEntry[] = [
  {
    createdAt: "2026-07-07T21:10:00.000Z",
    flawId: "shallow_leg_dip",
    flawLabel: "Shallow leg dip — not enough bend",
    score: 48,
  },
  {
    createdAt: "2026-07-08T21:10:00.000Z",
    flawId: "release_elbow_alignment",
    flawLabel: "Release elbow drifting outward",
    score: 55,
  },
  {
    createdAt: "2026-07-09T21:10:00.000Z",
    flawId: "shallow_leg_dip",
    flawLabel: "Shallow leg dip — not enough bend",
    score: 51,
  },
  {
    createdAt: "2026-07-10T21:10:00.000Z",
    flawId: "guide_hand_late",
    flawLabel: "Guide hand staying on too long",
    score: 62,
  },
  {
    createdAt: "2026-07-11T21:10:00.000Z",
    flawId: "shallow_leg_dip",
    flawLabel: "Shallow leg dip — not enough bend",
    score: 58,
  },
  {
    createdAt: "2026-07-12T21:10:00.000Z",
    flawId: "shallow_leg_dip",
    flawLabel: "Shallow leg dip — not enough bend",
    score: 69,
  },
  {
    createdAt: "2026-07-13T21:10:00.000Z",
    flawId: "shallow_leg_dip",
    flawLabel: "Shallow leg dip — not enough bend",
    score: 64,
  },
  {
    createdAt: "2026-07-14T21:10:00.000Z",
    flawId: "shallow_leg_dip",
    flawLabel: "Shallow leg dip — not enough bend",
    score: 73,
  },
  {
    createdAt: "2026-07-15T21:10:00.000Z",
    flawId: "shallow_leg_dip",
    flawLabel: "Shallow leg dip — not enough bend",
    score: 68,
  },
  {
    createdAt: "2026-07-16T21:10:00.000Z",
    flawId: "wrist_snap_timing_early",
    flawLabel: "Wrist snap timing off",
    score: 70,
  },
];

function drillFor(entry: MockEntry) {
  if (entry.flawId === "wrist_snap_timing_early") {
    return {
      title: "Follow-through hold for wrist snap",
      steps: [
        "Shoot close to the basket and focus only on the finish.",
        "Snap the wrist down and hold the follow-through until the ball lands.",
        "Make 25 with a relaxed gooseneck finish before stepping back.",
      ],
    };
  }

  if (entry.flawId === "release_elbow_alignment") {
    return {
      title: "Wall-alignment release drill",
      steps: [
        "Set up beside a wall with the shooting elbow under the ball.",
        "Make 15 slow releases without letting the elbow flare into the wall.",
        "Repeat from close range while keeping the same path.",
      ],
    };
  }

  if (entry.flawId === "guide_hand_late") {
    return {
      title: "One-hand close-range form shots",
      steps: [
        "Begin three feet from the basket using only the shooting hand.",
        "Add the guide hand without letting it push through release.",
        "Make 20 while the guide hand finishes quiet and open.",
      ],
    };
  }

  return {
    title: "Dip-and-rise for leg-driven power",
    steps: [
      "Start balanced and lower through the hips and knees.",
      "Rise smoothly as the ball travels into the shooting pocket.",
      "Make 20 close-range shots with one continuous upward motion.",
    ],
  };
}

const chronological = entries.map((entry, index): EchoSession => {
  const drill = drillFor(entry);

  return EchoSessionSchema.parse({
    id: `${MOCK_ID_PREFIX}${String(index + 1).padStart(2, "0")}`,
    user_id: MOCK_USER_ID,
    score: entry.score,
    top_flaw_id: entry.flawId,
    top_flaw_label: entry.flawLabel,
    top_flaw_severity: entry.score < 60 ? "high" : "med",
    metrics: {
      releaseElbowAngle: entry.flawId === "release_elbow_alignment" ? 126 : 149,
      releaseFrameIndex: 42,
      kneeFlexionAtDip: entry.flawId === "shallow_leg_dip" ? 18 : 34,
      wristSnapTiming:
        entry.flawId === "wrist_snap_timing_early" ? 100 : 330,
      guideHandPresence: entry.flawId === "guide_hand_late" ? 0.84 : 0.48,
      releaseHeight: 0.81,
    },
    coaching: {
      flawId: entry.flawId,
      summary: `${entry.flawLabel}. Keep the next session focused on one repeatable adjustment.`,
      drill: {
        ...drill,
        sourceUrl: "",
        sourceTitle: "Echo mock coaching baseline",
      },
      references: [],
    },
    created_at: entry.createdAt,
  });
});

/** Newest-first baseline used only for the progress demo. */
export const MOCK_PROGRESS_SESSIONS = chronological.toReversed();

export function isMockProgressSession(session: EchoSession): boolean {
  return session.id.startsWith(MOCK_ID_PREFIX);
}

/** Keep the baseline fixed while real saves continue after it chronologically. */
export function mergeProgressSessions(
  userSessions: EchoSession[],
): EchoSession[] {
  const merged = new Map<string, EchoSession>();

  for (const session of userSessions) merged.set(session.id, session);
  for (const session of MOCK_PROGRESS_SESSIONS) {
    if (!merged.has(session.id)) merged.set(session.id, session);
  }

  return [...merged.values()].toSorted(
    (left, right) =>
      new Date(right.created_at).getTime() -
      new Date(left.created_at).getTime(),
  );
}
