import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { analyzeBaseballPitch } from "@/lib/analysis/baseball";
import {
  applyCaptureScorePolicy,
  LIVE_CAMERA_SCORE_CAP,
  UPLOADED_VIDEO_SCORE_FLOOR,
} from "@/lib/analysis/scorePolicy";
import { explainStrongScore } from "@/lib/analysis/strengths";
import {
  baseballSampleAnalysis,
  baseballSampleCoaching,
} from "@/lib/baseball-sample";
import { ResultsView } from "@/components/results/results-view";
import { loadLocalSessions, saveLocalSession } from "@/lib/db/sessions";
import { footballSampleAnalysis } from "@/lib/football-sample";
import {
  mergeProgressSessions,
  MOCK_PROGRESS_SESSIONS,
} from "@/lib/progress/mock-sessions";
import { mockShotCapture } from "@/lib/sample-shot";

test("basketball source policy preserves measured scores inside its bounds", () => {
  const measured = { ...baseballSampleAnalysis, score: 42 };

  const camera = applyCaptureScorePolicy(measured, "camera");
  const upload = applyCaptureScorePolicy(measured, "upload");

  assert.equal(camera.score, 42);
  assert.equal(upload.score, UPLOADED_VIDEO_SCORE_FLOOR);
  assert.deepEqual(camera.metrics, measured.metrics);
  assert.deepEqual(upload.metrics, measured.metrics);
});

test("basketball source policy caps high live scores and preserves high uploads", () => {
  const measured = { ...baseballSampleAnalysis, score: 95 };

  assert.equal(
    applyCaptureScorePolicy(measured, "camera").score,
    LIVE_CAMERA_SCORE_CAP,
  );
  assert.equal(applyCaptureScorePolicy(measured, "upload").score, 95);
});

test("score 80 hides strengths while score 81 shows strengths; both keep the drill", () => {
  const score80 = renderToStaticMarkup(
    <ResultsView
      analysis={{ ...baseballSampleAnalysis, score: 80 }}
      coaching={baseballSampleCoaching}
      showSaveAction={false}
    />,
  );
  const score81 = renderToStaticMarkup(
    <ResultsView
      analysis={{ ...baseballSampleAnalysis, score: 81 }}
      coaching={baseballSampleCoaching}
      showSaveAction={false}
    />,
  );

  assert.doesNotMatch(score80, /Why this score is strong/);
  assert.match(score80, /Priority fix/);
  assert.match(score80, /Corrective drill/);
  assert.match(score81, /Why this score is strong/);
  assert.match(score81, /What you&#x27;re doing well/);
  assert.match(score81, /Corrective drill/);
});

test("football strengths use throwing language rather than baseball language", () => {
  const strengths = explainStrongScore({
    ...footballSampleAnalysis,
    score: 81,
  });
  const copy = strengths
    .map((strength) => `${strength.title} ${strength.detail}`)
    .join(" ");

  assert.equal(strengths.length, 3);
  assert.match(copy, /throw/i);
  assert.doesNotMatch(copy, /pitch|bullpen/i);
});

test("baseball analysis remains capped at 18", () => {
  const result = analyzeBaseballPitch(mockShotCapture);
  assert.ok(result.score <= 18);
});

test("progress always includes exactly ten unique mock sessions", () => {
  const baseline = mergeProgressSessions([]);
  assert.equal(MOCK_PROGRESS_SESSIONS.length, 10);
  assert.equal(baseline.length, 10);
  assert.equal(new Set(baseline.map((session) => session.id)).size, 10);

  const realSession = {
    ...baseline[0],
    id: "real-session",
    created_at: new Date().toISOString(),
  };
  const withRealSession = mergeProgressSessions([realSession]);
  assert.equal(withRealSession.length, 11);
  assert.ok(withRealSession.some((session) => session.id === "real-session"));
});

test("signed-out saves write a valid basketball result to browser storage", async () => {
  const storage = new MemoryStorage();
  const previousWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage },
  });

  try {
    const session = await saveLocalSession(
      { ...baseballSampleAnalysis, score: 70 },
      baseballSampleCoaching,
    );
    const sessions = loadLocalSessions();

    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].id, session.id);
    assert.equal(sessions[0].score, 70);
  } finally {
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: previousWindow,
      });
    }
  }
});

class MemoryStorage implements Storage {
  #values = new Map<string, string>();

  get length() {
    return this.#values.size;
  }

  clear() {
    this.#values.clear();
  }

  getItem(key: string) {
    return this.#values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.#values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.#values.delete(key);
  }

  setItem(key: string, value: string) {
    this.#values.set(key, value);
  }
}
