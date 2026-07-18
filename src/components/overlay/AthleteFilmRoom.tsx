import { Activity, Pause, Play } from "lucide-react";

import {
  AnimatedAthleteScene,
  type AnimatedSport,
} from "./AnimatedAthleteScene";
import {
  interpolateAthleteMotion,
  type AthleteJoint,
  type AthleteMotion,
  type AthletePose,
  useAthleteMotionPlayback,
} from "./athlete-motion";

export type { AthleteJoint, AthletePose } from "./athlete-motion";

const CONNECTIONS: readonly (readonly [AthleteJoint, AthleteJoint])[] = [
  ["leftShoulder", "rightShoulder"],
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftWrist"],
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightWrist"],
  ["leftShoulder", "leftHip"],
  ["rightShoulder", "rightHip"],
  ["leftHip", "rightHip"],
  ["leftHip", "leftKnee"],
  ["leftKnee", "leftAnkle"],
  ["rightHip", "rightKnee"],
  ["rightKnee", "rightAnkle"],
];

const SHOOTING_ARM_CONNECTIONS: readonly (
  readonly [AthleteJoint, AthleteJoint]
)[] = [
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightWrist"],
];

interface TimelineConfig {
  start: string;
  checkpoint: string;
  end: string;
  checkpointPercent: number;
}

export interface AthleteFilmRoomProps {
  ariaLabel: string;
  compact?: boolean;
  cue: string;
  focusJoint: AthleteJoint;
  imageDescription: string;
  motion: AthleteMotion;
  observed: number;
  reference: number;
  score: number;
  scoreLabel: string;
  stageLabel: string;
  sport: AnimatedSport;
  timeline: TimelineConfig;
  viewLabel: string;
}

function PoseSkeleton({
  detail = "full",
  pose,
  quiet = false,
  reference = false,
}: {
  detail?: "full" | "shooting-arm";
  pose: AthletePose;
  quiet?: boolean;
  reference?: boolean;
}) {
  const color = reference ? "var(--blue)" : "var(--bone)";
  const connections =
    detail === "shooting-arm" ? SHOOTING_ARM_CONNECTIONS : CONNECTIONS;
  const joints: AthleteJoint[] =
    detail === "shooting-arm"
      ? ["rightShoulder", "rightElbow", "rightWrist"]
      : (Object.keys(pose) as AthleteJoint[]).filter(
          (joint) => joint !== "head",
        );
  const shoulderCenter = [
    (pose.leftShoulder[0] + pose.rightShoulder[0]) / 2,
    (pose.leftShoulder[1] + pose.rightShoulder[1]) / 2,
  ] as const;

  return (
    <g
      fill="none"
      opacity={quiet ? (reference ? 0.38 : 0.78) : reference ? 0.78 : 0.96}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={quiet ? (reference ? 2.5 : 3) : reference ? 3.5 : 4.5}
      style={
        quiet
          ? undefined
          : { filter: `drop-shadow(0 0 ${reference ? 6 : 3}px ${color})` }
      }
      vectorEffect="non-scaling-stroke"
    >
      {detail === "full" ? (
        <line
          x1={pose.head[0]}
          x2={shoulderCenter[0]}
          y1={pose.head[1] + (quiet ? 24 : 28)}
          y2={shoulderCenter[1]}
        />
      ) : null}
      {connections.map(([start, end]) => (
        <line
          key={`${start}-${end}`}
          x1={pose[start][0]}
          x2={pose[end][0]}
          y1={pose[start][1]}
          y2={pose[end][1]}
        />
      ))}
      {detail === "full" ? (
        <circle cx={pose.head[0]} cy={pose.head[1]} r={quiet ? 24 : 30} />
      ) : null}
      {joints.map((joint) => (
        <circle
          fill={color}
          key={joint}
          r={quiet ? (reference ? 3.5 : 4.5) : reference ? 5.5 : 6.5}
          stroke="none"
          cx={pose[joint][0]}
          cy={pose[joint][1]}
        />
      ))}
    </g>
  );
}

export function AthletePoseOverlay({
  className = "pointer-events-none absolute inset-0 z-10 h-full w-full",
  focusJoint,
  observedPose,
  opacity = 1,
  presentation = "comparison",
  referencePose,
  focusOpacity = 1,
}: {
  className?: string;
  focusJoint: AthleteJoint;
  observedPose: AthletePose;
  opacity?: number;
  presentation?: "comparison" | "release-scan";
  referencePose: AthletePose;
  focusOpacity?: number;
}) {
  const focus = observedPose[focusJoint];
  const releaseScan = presentation === "release-scan";

  return (
    <svg
      aria-hidden="true"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity }}
      viewBox="0 0 1672 941"
    >
      <PoseSkeleton
        detail={releaseScan ? "shooting-arm" : "full"}
        pose={referencePose}
        quiet={releaseScan}
        reference
      />
      <PoseSkeleton pose={observedPose} quiet={releaseScan} />
      {releaseScan ? null : (
        <circle
          cx={focus[0]}
          cy={focus[1]}
          fill="none"
          opacity={focusOpacity}
          r="38"
          stroke="var(--orange)"
          strokeDasharray="8 8"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

export function AthleteFilmRoom({
  ariaLabel,
  compact = false,
  cue,
  focusJoint,
  imageDescription,
  motion,
  observed,
  reference,
  score,
  scoreLabel,
  stageLabel,
  sport,
  timeline,
  viewLabel,
}: AthleteFilmRoomProps) {
  const { playing, progress, scrub, toggle } = useAthleteMotionPlayback(motion);
  const { observedPose, referencePose } = interpolateAthleteMotion(
    motion,
    progress,
  );
  const releasePose = interpolateAthleteMotion(
    motion,
    motion.checkpoint,
  ).observedPose;
  const checkpoint = Math.max(0, Math.min(100, timeline.checkpointPercent));
  const checkpointProgress = checkpoint / 100;
  const checkpointDistance = Math.abs(progress - checkpointProgress);
  const checkpointStrength = Math.max(0, 1 - checkpointDistance / 0.18);
  const overlayOpacity = 0.68 + checkpointStrength * 0.32;
  const focusOpacity = checkpointStrength;
  const phaseLabel =
    progress < checkpointProgress / 2
      ? timeline.start
      : progress < (checkpointProgress + 1) / 2
        ? timeline.checkpoint
        : timeline.end;
  const elapsed = (progress * motion.durationMs) / 1000;
  return (
    <section
      aria-label={ariaLabel}
      className="overflow-hidden rounded-md border border-border bg-[var(--ink)]"
    >
      <span className="sr-only">
        {imageDescription} Observed separation {observed} degrees, reference {reference}
        {" "}degrees, {scoreLabel.toLowerCase()} {score} out of 100. Coaching cue: {cue}.
      </span>

      <div
        className={
          compact
            ? "relative min-h-[22rem] overflow-hidden sm:min-h-[29rem]"
            : "relative min-h-[24rem] overflow-hidden sm:min-h-[31rem]"
        }
      >
        <AnimatedAthleteScene
          checkpoint={motion.checkpoint}
          pose={observedPose}
          progress={progress}
          releasePose={releasePose}
          sport={sport}
        />

        <AthletePoseOverlay
          focusJoint={focusJoint}
          focusOpacity={focusOpacity}
          observedPose={observedPose}
          opacity={overlayOpacity}
          referencePose={referencePose}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-4 sm:p-6">
          <div className="border-l-2 border-accent-brand bg-black/45 py-1 pl-3 pr-2 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--bone)] backdrop-blur-[2px] sm:text-[0.65rem] sm:tracking-[0.14em]">
            <span className="block text-[var(--muted-ink)]">{stageLabel}</span>
            {viewLabel}
          </div>
          <div className="grid shrink-0 gap-2 bg-black/60 px-3 py-2 font-mono text-[0.56rem] uppercase tracking-[0.08em] backdrop-blur-[2px] sm:px-4 sm:text-[0.62rem] sm:tracking-[0.12em]">
            <span className="flex items-center justify-between gap-3 text-[var(--bone)]">
              <span className="flex items-center gap-2">
                <span className="h-px w-5 bg-[var(--bone)] sm:w-8" /> You
              </span>
              <span>{observed}°</span>
            </span>
            <span className="flex items-center justify-between gap-3 text-[var(--blue-soft)]">
              <span className="flex items-center gap-2">
                <span className="h-px w-5 bg-[var(--blue)] sm:w-8" /> Reference
              </span>
              <span>{reference}°</span>
            </span>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 z-20 flex max-w-[calc(100%-7.5rem)] items-center gap-2 border border-accent-brand bg-black/75 px-2.5 py-2 backdrop-blur-[2px] sm:bottom-6 sm:left-6 sm:max-w-none sm:gap-3 sm:px-3">
          <Activity aria-hidden="true" className="size-4 shrink-0 text-accent-brand" />
          <span className="truncate font-mono text-[0.58rem] uppercase tracking-[0.1em] text-[var(--bone)] sm:text-[0.62rem] sm:tracking-[0.12em]">
            {cue}
          </span>
        </div>
        <span className="absolute bottom-4 right-4 z-20 bg-black/65 px-2 py-1 font-mono text-[0.64rem] text-[var(--muted-ink)] backdrop-blur-[2px] sm:bottom-6 sm:right-6 sm:text-xs">
          {scoreLabel} {score}/100
        </span>
      </div>

      <div className="border-t border-border bg-[var(--ink)] px-4 py-4 sm:px-6">
        <div
          aria-label={`${ariaLabel} playback controls`}
          className="flex items-center gap-4 sm:gap-6"
          role="group"
        >
          <button
            aria-label={`${playing ? "Pause" : "Play"} ${ariaLabel.toLowerCase()} animation`}
            className="grid size-11 shrink-0 place-items-center rounded-sm border border-[var(--muted-ink)] text-[var(--bone)] transition hover:border-[var(--blue)] hover:text-[var(--blue-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={toggle}
            type="button"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <span className="hidden min-w-20 font-mono text-xs tracking-[0.08em] text-[var(--muted-ink)] sm:block">
            00:{elapsed.toFixed(2).padStart(5, "0")}
          </span>
          <div className="relative h-12 min-w-0 flex-1">
            <div className="absolute inset-x-0 top-2 h-px bg-[var(--muted-ink)]/70" />
            <div
              className="absolute left-0 top-2 h-0.5 bg-accent-brand"
              style={{ width: `${progress * 100}%` }}
            />
            <span
              aria-hidden="true"
              className="absolute top-2 size-3 -translate-x-1/2 -translate-y-1/2 bg-accent-brand"
              style={{ left: `${progress * 100}%` }}
            />
            <input
              aria-label={`Scrub ${ariaLabel.toLowerCase()} animation`}
              aria-valuetext={`${phaseLabel}, ${elapsed.toFixed(1)} seconds`}
              className="echo-scrubber absolute inset-x-0 top-0 h-5 w-full cursor-pointer"
              max="100"
              min="0"
              onChange={(event) => scrub(Number(event.currentTarget.value) / 100)}
              step="1"
              type="range"
              value={progress * 100}
            />
            <div className="pointer-events-none absolute inset-x-0 top-5 font-mono text-[0.58rem] uppercase tracking-[0.07em] text-[var(--muted-ink)] sm:text-[0.65rem] sm:tracking-[0.08em]">
              <span className="absolute left-0">{timeline.start}</span>
              <span
                className="absolute -translate-x-1/2 text-[var(--bone)]"
                style={{ left: `${checkpoint}%` }}
              >
                {timeline.checkpoint}
              </span>
              <span className="absolute right-0 hidden sm:block">{timeline.end}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
