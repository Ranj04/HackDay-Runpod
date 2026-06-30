// PERSON A (works on main) — coach module public surface. See OWNERSHIP.md.
//
// Integration surface: coachFlaw is the contract entry point Person B consumes
// (server-side — reads API keys from the environment). lastCoachSource/nebiusInfo
// are read-only diagnostics for the demo's transparency badge.
export { coachFlaw, lastCoachSource, type CoachSource } from "./coachFlaw";
export { nebiusInfo } from "./nebius";
