// PERSON A (works on main) — overlay component surface. See OWNERSHIP.md.
export { GhostOverlay, type GhostOverlayProps } from "./GhostOverlay";
export { HeroShowcase } from "./HeroShowcase";
export { INK, SURFACE, BONE, GHOST, SIGNAL, MUTED } from "./palette";
export {
  drawBackdrop,
  drawVignette,
  drawGhostLines,
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
