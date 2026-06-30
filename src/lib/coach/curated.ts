// Curated, demo-safe coaching content per flaw, used when live retrieval keys
// aren't configured or a live call fails. These drills/sources are real coaching
// references (not fabricated), so the demo always returns something defensible.
// When keys are present, live You.com/Tavily/Nebius output supersedes this.
import type { Drill, Flaw, Reference } from "../contracts";

interface CuratedEntry {
  drill: Drill;
  references: Reference[];
}

const CURATED: Record<string, CuratedEntry> = {
  elbow_flare: {
    drill: {
      title: "Wall form-shooting for elbow alignment",
      steps: [
        "Stand an arm's length from a wall, ball in your shooting pocket.",
        "Set so your shooting elbow is stacked under the ball, not winging out.",
        "Shoot straight up into the wall; the ball should come straight back to you.",
        "Do 3 sets of 10, checking the elbow stays under the ball each rep.",
      ],
      sourceUrl: "https://www.breakthroughbasketball.com/fundamentals/shooting.html",
      sourceTitle: "Breakthrough Basketball — Shooting Fundamentals",
    },
    references: [
      { title: "Breakthrough Basketball — Shooting Fundamentals", url: "https://www.breakthroughbasketball.com/fundamentals/shooting.html" },
    ],
  },
  shallow_dip: {
    drill: {
      title: "Dip-and-rise for leg-driven power",
      steps: [
        "Start in an athletic stance, knees soft.",
        "On the catch, dip into a deeper knee bend before you rise.",
        "Drive up through your legs so the shot's power comes from the floor.",
        "3 sets of 10, exaggerating the dip until it feels natural.",
      ],
      sourceUrl: "https://www.breakthroughbasketball.com/fundamentals/shooting.html",
      sourceTitle: "Breakthrough Basketball — Shooting Fundamentals",
    },
    references: [
      { title: "Breakthrough Basketball — Shooting Fundamentals", url: "https://www.breakthroughbasketball.com/fundamentals/shooting.html" },
    ],
  },
  wrist_snap: {
    drill: {
      title: "Follow-through hold for wrist snap",
      steps: [
        "Shoot close to the basket, focusing only on the finish.",
        "Snap the wrist down and hold the follow-through until the ball lands.",
        "Fingers should point at the rim, relaxed 'gooseneck' wrist.",
        "Make 25 with a held follow-through before stepping back.",
      ],
      sourceUrl: "https://www.breakthroughbasketball.com/fundamentals/shooting.html",
      sourceTitle: "Breakthrough Basketball — Shooting Fundamentals",
    },
    references: [
      { title: "Breakthrough Basketball — Shooting Fundamentals", url: "https://www.breakthroughbasketball.com/fundamentals/shooting.html" },
    ],
  },
  guide_hand: {
    drill: {
      title: "One-hand form shooting (guide hand off)",
      steps: [
        "Shoot close to the rim using only your shooting hand.",
        "Rest the guide hand behind your back so it can't push the ball.",
        "Feel the ball roll off your index/middle finger straight.",
        "Make 25 one-handed, then reintroduce the guide hand as a passenger only.",
      ],
      sourceUrl: "https://www.breakthroughbasketball.com/fundamentals/shooting.html",
      sourceTitle: "Breakthrough Basketball — Shooting Fundamentals",
    },
    references: [
      { title: "Breakthrough Basketball — Shooting Fundamentals", url: "https://www.breakthroughbasketball.com/fundamentals/shooting.html" },
    ],
  },
  low_release: {
    drill: {
      title: "Raise the set point",
      steps: [
        "Catch and bring the ball to a set point at forehead height or above.",
        "Avoid dropping the ball back down before you rise into the shot.",
        "Shoot from the higher pocket; keep the path short and up.",
        "3 sets of 10 reps from the higher set point.",
      ],
      sourceUrl: "https://www.breakthroughbasketball.com/fundamentals/shooting.html",
      sourceTitle: "Breakthrough Basketball — Shooting Fundamentals",
    },
    references: [
      { title: "Breakthrough Basketball — Shooting Fundamentals", url: "https://www.breakthroughbasketball.com/fundamentals/shooting.html" },
    ],
  },
};

const GENERIC: CuratedEntry = {
  drill: {
    title: "Form-shooting reset",
    steps: [
      "Shoot close to the basket, slow and deliberate.",
      "Fix one thing at a time, checking it every rep.",
      "Build back out only once the motion feels repeatable.",
    ],
    sourceUrl: "https://www.breakthroughbasketball.com/fundamentals/shooting.html",
    sourceTitle: "Breakthrough Basketball — Shooting Fundamentals",
  },
  references: [
    { title: "Breakthrough Basketball — Shooting Fundamentals", url: "https://www.breakthroughbasketball.com/fundamentals/shooting.html" },
  ],
};

export function curatedFor(flaw: Flaw): CuratedEntry {
  return CURATED[flaw.id] ?? GENERIC;
}
