"use client";
// Minimal form-vs-echo: a faint blue IDEAL skeleton, your crisp bone skeleton,
// and a basketball in the shooting hand through release — auto-playing a smooth,
// frame-interpolated loop so it reads as a person actually shooting.
import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, ScanLine } from "lucide-react";

import { detectShootingSide } from "@/lib/analysis";
import { alignToReference } from "@/lib/analysis/align";
import { GOOD_FORM_FRAMES } from "@/lib/analysis/reference";
import { isVisible } from "@/lib/vision/visibility";
import type { AnalysisResult, PoseFrame, ShotCapture } from "@/lib/contracts";
import {
  AthletePoseOverlay,
  type AthleteJoint,
  type AthletePose,
} from "./AthleteFilmRoom";
import { AnimatedAthleteScene } from "./AnimatedAthleteScene";
import {
  interpolateAthleteMotion,
  type AthleteMotion,
} from "./athlete-motion";
import {
  drawBackdrop,
  drawBall,
  drawFlawMarker,
  drawEchoLines,
  drawPlayer,
  drawVignette,
  flawConnectionKeys,
  jointsForFlaw,
  torsoLengthPx,
} from "./skeleton";

export interface EchoOverlayProps {
  result: AnalysisResult;
  width?: number;
  height?: number;
  className?: string;
  /** Canvas only, with a compact play/pause control (e.g. embedded previews). */
  compact?: boolean;
  /** Render the basketball film-room scene beneath the live canvas. */
  scene?: boolean;
  /** Lock the static 3D scene to its calibrated release pose. */
  releaseScan?: boolean;
}

const HOLD_MS = 650;

const BASKETBALL_OBSERVED_POSE: AthletePose = {
  head: [986, 254],
  leftShoulder: [930, 326],
  rightShoulder: [980, 335],
  leftElbow: [862, 283],
  rightElbow: [925, 270],
  leftWrist: [830, 185],
  rightWrist: [884, 190],
  leftHip: [905, 505],
  rightHip: [955, 503],
  leftKnee: [882, 612],
  rightKnee: [934, 615],
  leftAnkle: [875, 732],
  rightAnkle: [945, 731],
};

const BASKETBALL_REFERENCE_POSE: AthletePose = {
  head: [994, 259],
  leftShoulder: [938, 320],
  rightShoulder: [987, 329],
  leftElbow: [869, 269],
  rightElbow: [933, 258],
  leftWrist: [821, 158],
  rightWrist: [891, 174],
  leftHip: [913, 500],
  rightHip: [965, 497],
  leftKnee: [889, 607],
  rightKnee: [941, 608],
  leftAnkle: [881, 729],
  rightAnkle: [951, 727],
};

const BASKETBALL_FIXTURE_JOINTS: Record<AthleteJoint, string> = {
  head: "nose",
  leftShoulder: "left_shoulder",
  rightShoulder: "right_shoulder",
  leftElbow: "left_elbow",
  rightElbow: "right_elbow",
  leftWrist: "left_wrist",
  rightWrist: "right_wrist",
  leftHip: "left_hip",
  rightHip: "right_hip",
  leftKnee: "left_knee",
  rightKnee: "right_knee",
  leftAnkle: "left_ankle",
  rightAnkle: "right_ankle",
};

const BASKETBALL_RELEASE_FIXTURE_INDEX = 18;
const BASKETBALL_FIXTURE_SCALE = 700;

function poseFromBasketballFixture(
  frameIndex: number,
  releasePose: AthletePose,
): AthletePose {
  const frame = GOOD_FORM_FRAMES[frameIndex];
  const release = GOOD_FORM_FRAMES[BASKETBALL_RELEASE_FIXTURE_INDEX];
  if (!frame || !release) return releasePose;

  return Object.fromEntries(
    (Object.keys(BASKETBALL_FIXTURE_JOINTS) as AthleteJoint[]).map((joint) => {
      const fixtureName = BASKETBALL_FIXTURE_JOINTS[joint];
      const point = frame.keypoints.find((keypoint) => keypoint.name === fixtureName);
      const releasePoint = release.keypoints.find(
        (keypoint) => keypoint.name === fixtureName,
      );
      const anchor = releasePose[joint];
      if (!point || !releasePoint) return [joint, anchor];
      return [
        joint,
        [
          anchor[0] + (point.x - releasePoint.x) * BASKETBALL_FIXTURE_SCALE,
          anchor[1] + (point.y - releasePoint.y) * BASKETBALL_FIXTURE_SCALE,
        ] as const,
      ];
    }),
  ) as AthletePose;
}

const BASKETBALL_FIXTURE_KEYFRAMES = [
  [0, 0],
  [4, 0.151],
  [7, 0.264],
  [11, 0.416],
  [15, 0.567],
  [18, 0.68],
  [22, 0.796],
  [29, 1],
] as const;

const BASKETBALL_MOTION: AthleteMotion = {
  id: "basketball-shot",
  durationMs: 2100,
  holdMs: HOLD_MS,
  checkpoint: 0.68,
  keyframes: BASKETBALL_FIXTURE_KEYFRAMES.map(([frameIndex, at]) => ({
    at,
    observedPose: poseFromBasketballFixture(
      frameIndex,
      BASKETBALL_OBSERVED_POSE,
    ),
    referencePose: poseFromBasketballFixture(
      frameIndex,
      BASKETBALL_REFERENCE_POSE,
    ),
  })),
};

function remapMotionProgress(
  progress: number,
  sourceCheckpoint: number,
  targetCheckpoint: number,
) {
  if (progress <= sourceCheckpoint) {
    return sourceCheckpoint > 0
      ? (progress / sourceCheckpoint) * targetCheckpoint
      : targetCheckpoint;
  }

  return sourceCheckpoint < 1
    ? targetCheckpoint +
        ((progress - sourceCheckpoint) / (1 - sourceCheckpoint)) *
          (1 - targetCheckpoint)
    : targetCheckpoint;
}

export function BasketballScene({
  pose = BASKETBALL_OBSERVED_POSE,
  progress = BASKETBALL_MOTION.checkpoint,
  releasePose = BASKETBALL_OBSERVED_POSE,
}: {
  pose?: AthletePose;
  progress?: number;
  releasePose?: AthletePose;
}) {
  return (
    <AnimatedAthleteScene
      checkpoint={BASKETBALL_MOTION.checkpoint}
      pose={pose}
      progress={progress}
      releasePose={releasePose}
      sport="basketball"
    />
  );
}

// Draw the echo from the clean hand-authored exemplar. The active SCORING
// reference is the real-Curry clip (kept for the flaw bands), but that's a noisy
// broadcast three-quarter extraction (top-heavy, ~1.1 legs/torso) that looks
// distorted as a side-on stick figure — so the visual "ideal" uses good-form,
// which has human proportions. Display-only: scoring is untouched.
const GOOD_FORM_CAPTURE: ShotCapture = {
  id: "good-form-echo",
  frames: GOOD_FORM_FRAMES,
  fps: 30,
  view: "side",
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const SPEED = 0.85;

/** Linear-interpolate two pose frames (by landmark name) for smooth motion. */
function lerpFrame(a: PoseFrame, b: PoseFrame, t: number): PoseFrame {
  if (a === b) return a;
  const bm = new Map(b.keypoints.map((k) => [k.name, k]));
  return {
    t: a.t + (b.t - a.t) * t,
    keypoints: a.keypoints.map((ka) => {
      const kb = bm.get(ka.name);
      if (!kb) return ka;
      return { name: ka.name, x: ka.x + (kb.x - ka.x) * t, y: ka.y + (kb.y - ka.y) * t, z: ka.z, score: Math.min(ka.score, kb.score) };
    }),
  };
}

export function EchoOverlay({
  result,
  width = 440,
  height = 560,
  className,
  compact = false,
  scene = true,
  releaseScan = false,
}: EchoOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frames = result.capture.frames;
  const total = frames.length;
  const fps = Math.max(1, result.capture.fps);
  const releaseIndex =
    total > 0 ? Math.min(result.metrics.releaseFrameIndex ?? 0, total - 1) : 0;
  // Echo track for DISPLAY: align the clean good-form exemplar onto the user
  // (release-matched + hip-centered + torso-scaled), same as result.echoRef but
  // sourced from good-form instead of the noisy Curry scoring reference.
  const echoFrames = useMemo(
    () => alignToReference(result.capture, GOOD_FORM_CAPTURE, releaseIndex),
    [result.capture, releaseIndex],
  );

  const side = useMemo(() => detectShootingSide(result.capture), [result.capture]);
  const flawJoint = useMemo(() => jointsForFlaw(result.topFlaw.metric, side)[0], [result.topFlaw.metric, side]);
  const flawKeys = useMemo(() => (flawJoint ? flawConnectionKeys(flawJoint) : new Set<string>()), [flawJoint]);
  const shootWrist = `${side}_wrist`;

  // End playback on the follow-through apex (highest shooting wrist just after
  // release) + a short hold — never on trailing frames (post-shot landing/
  // relaxing or noisy tracking), which is what made the loop settle on a jumbled
  // "ending" pose. The apex is searched only within a short post-release window
  // so a later arm-raise while walking off can't be mistaken for the apex.
  const playEnd = useMemo(() => {
    if (total === 0) return 0;
    const searchEnd = Math.min(total - 1, releaseIndex + Math.round(0.8 * fps));
    let apexIdx = releaseIndex;
    let apexY = Infinity;
    for (let i = releaseIndex; i <= searchEnd; i++) {
      const k = frames[i].keypoints.find((p) => p.name === shootWrist);
      if (k && k.y < apexY) {
        apexY = k.y;
        apexIdx = i;
      }
    }
    return Math.min(total - 1, apexIdx + Math.round(0.15 * fps));
  }, [frames, total, releaseIndex, fps, shootWrist]);

  const [playing, setPlaying] = useState(() => !releaseScan);
  const [index, setIndex] = useState(0);
  const [seekVersion, setSeekVersion] = useState(0);
  const posRef = useRef(0); // float frame position

  // Reduced motion starts at the release checkpoint without autoplay. A user
  // can still explicitly press Play; the preference only changes the default.
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let scheduledFrame = 0;

    const applyPreference = (reduced: boolean) => {
      cancelAnimationFrame(scheduledFrame);
      scheduledFrame = requestAnimationFrame(() => {
        const nextIndex = reduced || releaseScan ? releaseIndex : 0;
        posRef.current = nextIndex;
        setIndex(nextIndex);
        setPlaying(!reduced && !releaseScan);
        setSeekVersion((version) => version + 1);
      });
    };
    const handleChange = (event: MediaQueryListEvent) => {
      applyPreference(event.matches);
    };

    applyPreference(preference.matches);
    preference.addEventListener("change", handleChange);
    return () => {
      cancelAnimationFrame(scheduledFrame);
      preference.removeEventListener("change", handleChange);
    };
  }, [releaseIndex, releaseScan, result.capture.id, total]);

  // On the plain analysis stage, separate the two figures for clarity. Over the
  // rendered athlete, align both tracks directly to the body like a form scan.
  const sideBySide = !scene && echoFrames.length > 0;

  // Stable fit transform (centers + scales) from all visible poses, accounting
  // for the echo's horizontal shift so both figures fit and stay centered.
  const fit = useMemo(() => {
    if (scene) {
      return { s: 1, cx: width / 2, cy: height / 2, echoShift: 0 };
    }

    const bbox = (arr: PoseFrame[]) => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const f of arr) {
        for (const k of f.keypoints) {
          if (!isVisible(k)) continue;
          if (k.x < minX) minX = k.x;
          if (k.x > maxX) maxX = k.x;
          if (k.y < minY) minY = k.y;
          if (k.y > maxY) maxY = k.y;
        }
      }
      return { minX, minY, maxX, maxY };
    };
    const u = bbox(frames);
    if (!Number.isFinite(u.minX)) return { s: 1, cx: width / 2, cy: height / 2, echoShift: 0 };

    const e = echoFrames.length ? bbox(echoFrames) : null;
    const hasEcho = e !== null && Number.isFinite(e.minX);
    const GAP = 0.1; // normalized gap between the two figures
    // Shift the echo so its left edge clears the player's right edge + a gap.
    const echoShift = sideBySide && hasEcho ? u.maxX + GAP - e!.minX : 0;

    const minX = Math.min(u.minX, hasEcho ? e!.minX + echoShift : Infinity);
    const maxX = Math.max(u.maxX, hasEcho ? e!.maxX + echoShift : -Infinity);
    const minY = Math.min(u.minY, hasEcho ? e!.minY : Infinity);
    const maxY = Math.max(u.maxY, hasEcho ? e!.maxY : -Infinity);
    const bwPx = Math.max(1, (maxX - minX) * width);
    const bhPx = Math.max(1, (maxY - minY) * height);
    const widthFactor = sideBySide ? 0.86 : 0.7;
    const floor = sideBySide ? 0.5 : 0.9; // let two figures shrink to fit
    const s = Math.max(floor, Math.min(2.8, Math.min((width * widthFactor) / bwPx, (height * 0.82) / bhPx)));
    return { s, cx: ((minX + maxX) / 2) * width, cy: ((minY + maxY) / 2) * height, echoShift };
  }, [
    frames,
    echoFrames,
    width,
    height,
    scene,
    sideBySide,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [width, height]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    if (total === 0) {
      ctx.clearRect(0, 0, width, height);
      if (!scene) drawBackdrop(ctx, width, height);
      drawVignette(ctx, width, height);
      return;
    }
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    let holding = 0;
    const start = last;
    let lastIdx = -1;

    const frameAt = (arr: PoseFrame[], pos: number): PoseFrame | null => {
      if (arr.length === 0) return null;
      const clamped = Math.max(0, Math.min(pos, arr.length - 1));
      const a = Math.floor(clamped);
      const b = Math.min(a + 1, arr.length - 1);
      const fa = arr[a];
      const fb = arr[b];
      if (!fa) return fb ?? null;
      if (!fb) return fa;
      if (a === b) return fa;
      return lerpFrame(fa, fb, clamped - a);
    };

    // Ball tracks the shooting wrist through release, then drops away.
    const ballAt = (pos: number, userFrame: PoseFrame): { x: number; y: number } | null => {
      if (pos > releaseIndex) return null;
      const k = userFrame.keypoints.find((p) => p.name === shootWrist && isVisible(p));
      return k ? { x: k.x, y: k.y } : null;
    };

    const draw = (pos: number, now: number) => {
      ctx.clearRect(0, 0, width, height);
      if (scene) {
        drawVignette(ctx, width, height);
        return;
      }
      drawBackdrop(ctx, width, height);
      const intro = reduced ? 1 : easeOutCubic(Math.min(1, (now - start) / 600));
      const user = frameAt(frames, pos);
      if (!user) {
        drawVignette(ctx, width, height);
        return;
      }
      const echoFrame = echoFrames.length ? frameAt(echoFrames, pos) : null;

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(fit.s, fit.s);
      ctx.translate(-fit.cx, -fit.cy);
      if (echoFrame) {
        ctx.save();
        if (fit.echoShift) ctx.translate(fit.echoShift * width, 0);
        drawEchoLines(ctx, echoFrame, width, height, intro);
        ctx.restore();
      }
      drawPlayer(ctx, user, width, height, flawKeys);
      if (!scene) {
        const ballR = Math.max(7, torsoLengthPx(user, width, height) * 0.17);
        const ball = ballAt(pos, user);
        if (ball) drawBall(ctx, ball.x * width, ball.y * height, ballR);
      }
      if (flawJoint && pos >= releaseIndex - 1) {
        const pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(now / 420);
        drawFlawMarker(ctx, user, width, height, flawJoint, pulse);
      }
      ctx.restore();
      drawVignette(ctx, width, height);
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(100, now - last);
      last = now;
      if (document.hidden) return;
      if (total > 0 && posRef.current > playEnd) {
        posRef.current = playEnd;
      }
      if (posRef.current >= playEnd) {
        holding += dt;
        if (holding >= HOLD_MS) {
          posRef.current = 0;
          holding = 0;
        }
      } else {
        posRef.current = Math.min(
          playEnd,
          posRef.current + (dt / 1000) * fps * SPEED,
        );
      }
      const idx = Math.round(posRef.current);
      if (idx !== lastIdx) {
        lastIdx = idx;
        setIndex(idx);
      }
      draw(posRef.current, now);
    };
    if (!playing) {
      raf = requestAnimationFrame((now) => {
        draw(posRef.current, now);
      });
      return () => cancelAnimationFrame(raf);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result, frames, echoFrames, total, fps, releaseIndex, playEnd, flawKeys, flawJoint, shootWrist, fit, width, height, scene, playing, seekVersion]);

  const releasePct = playEnd > 0 ? (Math.min(releaseIndex, playEnd) / playEnd) * 100 : 0;
  const posPct = playEnd > 0 ? (Math.min(index, playEnd) / playEnd) * 100 : 0;
  const captureProgress = posPct / 100;
  const captureReleaseProgress = releasePct / 100;
  const motionProgress = releaseScan
    ? BASKETBALL_MOTION.checkpoint
    : remapMotionProgress(
        captureProgress,
        captureReleaseProgress,
        BASKETBALL_MOTION.checkpoint,
      );
  const { observedPose, referencePose } = interpolateAthleteMotion(
    BASKETBALL_MOTION,
    motionProgress,
  );
  const checkpointDistance = Math.abs(
    motionProgress - BASKETBALL_MOTION.checkpoint,
  );
  const checkpointStrength = releaseScan
    ? 1
    : Math.max(0, 1 - checkpointDistance / 0.18);
  const phaseLabel =
    motionProgress < 0.22
      ? "Dip"
      : motionProgress < 0.56
        ? "Set"
        : motionProgress < 0.84
          ? "Release"
          : "Follow-through";
  const elapsed = `${(index / fps).toFixed(2).padStart(5, "0")}`;

  const scrub = (value: number) => {
    const next = (Math.max(0, Math.min(100, value)) / 100) * playEnd;
    posRef.current = next;
    setIndex(Math.round(next));
    setPlaying(false);
    setSeekVersion((version) => version + 1);
  };

  return (
    <div className={className} style={compact ? undefined : { width }}>
      <div
        className={
          compact
            ? "relative h-full w-full overflow-hidden"
            : "overflow-hidden rounded-md border border-border bg-[var(--ink)]"
        }
        style={
          compact
            ? undefined
            : { width }
        }
      >
        <div
          className={compact ? "relative h-full w-full" : "relative"}
          style={compact ? undefined : { width, height }}
        >
          {scene ? (
            <BasketballScene
              pose={observedPose}
              progress={motionProgress}
              releasePose={BASKETBALL_OBSERVED_POSE}
            />
          ) : null}
          <canvas
            ref={canvasRef}
            className="relative z-10 block"
            style={compact ? { width: "100%", height: "100%" } : undefined}
          />
          {scene ? (
            <AthletePoseOverlay
              focusJoint="rightElbow"
              focusOpacity={checkpointStrength}
              observedPose={observedPose}
              opacity={releaseScan ? 1 : 0.68 + checkpointStrength * 0.32}
              presentation={releaseScan ? "release-scan" : "comparison"}
              referencePose={referencePose}
            />
          ) : null}
          {compact && !releaseScan ? (
            <button
              aria-label={
                playing
                  ? "Pause basketball shooting animation"
                  : "Play basketball shooting animation"
              }
              className="absolute bottom-4 left-4 z-30 grid size-11 place-items-center rounded-sm border border-[var(--muted-ink)] bg-black/70 text-[var(--bone)] backdrop-blur-[2px] transition hover:border-[var(--blue)] hover:text-[var(--blue-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setPlaying((current) => !current)}
              type="button"
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
          ) : null}
          {!compact && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 p-4 sm:p-6">
              <div className="border-l-2 border-accent-brand pl-3 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-foreground">
                <span className="block text-muted-foreground">Film room 01</span>
                Side view
              </div>
              <div className="grid gap-2 bg-black/30 px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.12em] sm:px-4">
                {releaseScan ? (
                  <>
                    <span className="flex items-center gap-3 text-foreground">
                      <span className="h-px w-8 bg-foreground" /> Tracked pose
                    </span>
                    <span className="flex items-center gap-3 text-primary">
                      <span className="h-px w-8 bg-primary" /> Reference arm
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-3 text-foreground">
                      <span className="h-px w-8 bg-foreground" /> You
                    </span>
                    <span className="flex items-center gap-3 text-primary">
                      <span className="h-px w-8 bg-primary" /> Reference
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
          {!compact && (releaseScan || Math.abs(index - releaseIndex) <= 1) && (
            <span className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 border border-accent-brand bg-background/90 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-accent-brand sm:bottom-6">
              {releaseScan ? "Release pose calibrated" : "Release checkpoint"}
            </span>
          )}
        </div>

        {!compact && releaseScan ? (
          <div
            aria-label="Calibrated basketball release scan"
            className="border-t border-border bg-background px-4 py-4 sm:px-6"
          >
            <div className="flex min-h-12 items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-sm border border-primary/60 text-primary">
                <ScanLine aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <span className="block font-mono text-[0.62rem] uppercase tracking-[0.14em] text-primary">
                  Release scan
                </span>
                <span className="block truncate text-sm text-muted-foreground">
                  Pose locked to the rendered athlete
                </span>
              </div>
              <span className="ml-auto hidden shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground sm:block">
                12 joints tracked
              </span>
            </div>
          </div>
        ) : null}

        {!compact && !releaseScan ? (
          <div className="border-t border-border bg-background px-4 py-4 sm:px-6">
            <div className="flex items-center gap-4 sm:gap-6">
              <button
                aria-label={
                  playing
                    ? "Pause basketball shooting animation"
                    : "Play basketball shooting animation"
                }
                className="grid size-12 shrink-0 place-items-center rounded-sm border border-muted-foreground text-foreground transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setPlaying((current) => !current)}
                type="button"
              >
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              <span className="hidden min-w-20 font-mono text-xs tracking-[0.1em] text-muted-foreground sm:block">
                00:{elapsed}
              </span>
              <div className="relative h-12 min-w-0 flex-1">
                <div className="absolute inset-x-0 top-2 h-px bg-muted-foreground/70" />
                <div
                  className="absolute left-0 top-2 h-0.5 bg-accent-brand"
                  style={{ width: `${posPct}%` }}
                />
                <span
                  aria-hidden="true"
                  className="absolute top-2 size-3 -translate-x-1/2 -translate-y-1/2 bg-accent-brand"
                  style={{ left: `${posPct}%` }}
                />
                <input
                  aria-label="Scrub basketball shooting animation"
                  aria-valuetext={`${phaseLabel}, ${Number(elapsed).toFixed(1)} seconds`}
                  className="echo-scrubber absolute inset-x-0 top-0 h-5 w-full cursor-pointer"
                  max="100"
                  min="0"
                  onChange={(event) => scrub(Number(event.currentTarget.value))}
                  type="range"
                  value={posPct}
                />
                <div className="pointer-events-none absolute inset-x-0 top-5 font-mono text-[0.58rem] uppercase tracking-[0.08em] text-muted-foreground sm:text-[0.65rem]">
                  <span className="absolute left-0">Dip</span>
                  <span
                    className="absolute -translate-x-1/2 text-foreground"
                    style={{ left: `${releasePct}%` }}
                  >
                    Release
                  </span>
                  <span className="absolute right-0 hidden sm:block">Follow-through</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
