// PERSON A (works on main) — analysis module public surface. See OWNERSHIP.md.
//
// Integration surface: analyzeShot is the contract entry point Person B consumes.
// detectShootingSide is exposed for the ghost overlay's flaw-joint highlighting.
export { analyzeShot } from "./analyzeShot";
export { detectShootingSide, type Side } from "./detectRelease";
