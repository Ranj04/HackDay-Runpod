// PERSON A (works on main) — overlay component surface. See OWNERSHIP.md.
export { EchoOverlay, type EchoOverlayProps } from "./EchoOverlay";
export { HeroShowcase } from "./HeroShowcase";
export { BaseballShowcase } from "./BaseballShowcase";
export { FootballShowcase } from "./FootballShowcase";
export { INK, SURFACE, BONE, ECHO, SIGNAL, MUTED } from "./palette";
export {
  drawBackdrop,
  drawVignette,
  drawEchoLines,
  drawPlayer,
  drawBall,
  drawFlawMarker,
  torsoLengthPx,
  flawConnectionKeys,
  jointsForFlaw,
  resolvableConnections,
  POSE_CONNECTIONS_BY_NAME,
  JOINT_NAMES,
} from "./skeleton";
