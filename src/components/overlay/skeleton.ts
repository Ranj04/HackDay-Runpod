// Canvas drawing for the form-vs-ghost signature, keyed by landmark NAME so it
// works for a live 33-point MediaPipe capture and the 13-name fixtures.
//
// Design: minimal "motion-capture at night." A faint blue IDEAL skeleton, your
// crisp bone-white skeleton, and a basketball in the shooting hand through release.
// The motion (smooth auto-loop) + the ball is what reads as "a person shooting".
import type { JointMetrics, PoseFrame } from "@/lib/contracts";
import { isVisible } from "@/lib/vision/visibility";
import { BONE, GHOST, GHOST_RGB, INK, SIGNAL } from "./palette";

export const POSE_CONNECTIONS_BY_NAME: [string, string][] = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

export const JOINT_NAMES: string[] = Array.from(new Set<string>(["nose", ...POSE_CONNECTIONS_BY_NAME.flat()]));

export function jointsForFlaw(metric: keyof JointMetrics | string, side: "left" | "right"): string[] {
  const guide = side === "right" ? "left" : "right";
  switch (metric) {
    case "releaseElbowAngle":
      return [`${side}_elbow`];
    case "kneeFlexionAtDip":
      return [`${side}_knee`];
    case "wristSnapTiming":
    case "releaseHeight":
      return [`${side}_wrist`];
    case "guideHandPresence":
      return [`${guide}_wrist`];
    default:
      return [];
  }
}

export function flawConnectionKeys(joint: string): Set<string> {
  const keys = new Set<string>();
  for (const [a, b] of POSE_CONNECTIONS_BY_NAME) {
    if (a === joint || b === joint) keys.add(`${a}|${b}`);
  }
  return keys;
}

interface PxPoint {
  x: number;
  y: number;
}

function pxMap(frame: PoseFrame, w: number, h: number): Map<string, PxPoint> {
  const m = new Map<string, PxPoint>();
  for (const k of frame.keypoints) {
    if (isVisible(k)) m.set(k.name, { x: k.x * w, y: k.y * h });
  }
  return m;
}

function midpoint(a?: PxPoint, b?: PxPoint): PxPoint | undefined {
  if (!a || !b) return undefined;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function pxDist(a: PxPoint, b: PxPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function torsoScale(map: Map<string, PxPoint>, w: number, h: number): number {
  const sc = midpoint(map.get("left_shoulder"), map.get("right_shoulder"));
  const hc = midpoint(map.get("left_hip"), map.get("right_hip"));
  return sc && hc ? pxDist(sc, hc) : Math.min(w, h) * 0.18;
}

/** Torso length (px) for the current frame — used to size the ball/markers. */
export function torsoLengthPx(frame: PoseFrame, w: number, h: number): number {
  return torsoScale(pxMap(frame, w, h), w, h);
}

export function resolvableConnections(frame: PoseFrame): number {
  const map = new Map(frame.keypoints.map((k) => [k.name, k]));
  return POSE_CONNECTIONS_BY_NAME.filter(([a, b]) => map.has(a) && map.has(b)).length;
}

function strokeSkeleton(ctx: CanvasRenderingContext2D, map: Map<string, PxPoint>, flawKeys?: Set<string>, flawColor?: string, baseColor?: string): void {
  for (const [a, b] of POSE_CONNECTIONS_BY_NAME) {
    const pa = map.get(a);
    const pb = map.get(b);
    if (!pa || !pb) continue;
    if (flawKeys?.has(`${a}|${b}`) && flawColor) ctx.strokeStyle = flawColor;
    else if (baseColor) ctx.strokeStyle = baseColor;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }
}

/** Dark mocap stage: blue-black radial + a very faint floor glow. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.4, Math.min(w, h) * 0.05, w * 0.5, h * 0.55, Math.max(w, h) * 0.85);
  g.addColorStop(0, "#0E1830");
  g.addColorStop(0.55, "#0A101E");
  g.addColorStop(1, INK);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const floor = ctx.createRadialGradient(w * 0.5, h * 0.93, 4, w * 0.5, h * 0.93, w * 0.45);
  floor.addColorStop(0, `rgba(${GHOST_RGB}, 0.08)`);
  floor.addColorStop(1, `rgba(${GHOST_RGB}, 0)`);
  ctx.fillStyle = floor;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);
}

export function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const v = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.42, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
  v.addColorStop(0, "rgba(8,12,20,0)");
  v.addColorStop(1, "rgba(8,12,20,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** The IDEAL: a faint, thin blue reference skeleton behind you. `alpha` eases it in. */
export function drawGhostLines(ctx: CanvasRenderingContext2D, frame: PoseFrame, w: number, h: number, alpha = 1): void {
  const map = pxMap(frame, w, h);
  const T = torsoScale(map, w, h);
  ctx.save();
  // Faint, thin, headless echo — a reference, not a competing figure.
  ctx.globalAlpha = 0.32 * alpha;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = GHOST;
  ctx.shadowColor = GHOST;
  ctx.shadowBlur = 6;
  ctx.lineWidth = Math.max(1.5, Math.min(3, T * 0.03));
  strokeSkeleton(ctx, map, undefined, undefined, GHOST);
  ctx.restore();
}

/** YOU: a crisp bone-white skeleton with joint nodes. Bones touching the flaw
 *  joint render in orange. */
export function drawPlayer(ctx: CanvasRenderingContext2D, frame: PoseFrame, w: number, h: number, flawKeys: Set<string>): void {
  const map = pxMap(frame, w, h);
  const T = torsoScale(map, w, h);
  const lw = Math.max(2.5, Math.min(5, T * 0.05));
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = lw;
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 4;
  strokeSkeleton(ctx, map, flawKeys, SIGNAL, BONE);

  ctx.shadowBlur = 0;
  ctx.fillStyle = BONE;
  for (const name of JOINT_NAMES) {
    const k = map.get(name);
    if (k) {
      ctx.beginPath();
      ctx.arc(k.x, k.y, Math.max(2.5, T * 0.028), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const nose = map.get("nose");
  if (nose) {
    ctx.strokeStyle = BONE;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(nose.x, nose.y, Math.max(8, T * 0.16), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** A clean basketball: warm sphere + a couple of seam lines. (x,y,r in px.) */
export function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.save();
  ctx.translate(x, y);
  const g = ctx.createRadialGradient(-r * 0.32, -r * 0.32, r * 0.18, 0, 0, r);
  g.addColorStop(0, "#FBDCAE");
  g.addColorStop(1, "#E07A2C");
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = r * 0.7;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(40,20,8,0.45)";
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.42, r, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Minimal pulsing orange ring on the flawed joint. */
export function drawFlawMarker(ctx: CanvasRenderingContext2D, frame: PoseFrame, w: number, h: number, joint: string, pulse: number): void {
  const map = pxMap(frame, w, h);
  const T = torsoScale(map, w, h);
  const j = map.get(joint);
  if (!j) return;
  ctx.save();
  ctx.strokeStyle = SIGNAL;
  ctx.shadowColor = SIGNAL;
  ctx.shadowBlur = 8 + pulse * 6;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(j.x, j.y, Math.max(8, T * 0.11) * (1 + pulse * 0.1), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
