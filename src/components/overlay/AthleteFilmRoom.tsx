import type { StaticImageData } from "next/image";
import Image from "next/image";
import { Activity } from "lucide-react";

export type AthleteJoint =
  | "head"
  | "leftShoulder"
  | "rightShoulder"
  | "leftElbow"
  | "rightElbow"
  | "leftWrist"
  | "rightWrist"
  | "leftHip"
  | "rightHip"
  | "leftKnee"
  | "rightKnee"
  | "leftAnkle"
  | "rightAnkle";

export type AthletePose = Record<AthleteJoint, readonly [number, number]>;

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
  image: StaticImageData;
  imageDescription: string;
  observed: number;
  observedPose: AthletePose;
  reference: number;
  referencePose: AthletePose;
  score: number;
  scoreLabel: string;
  stageLabel: string;
  timeline: TimelineConfig;
  viewLabel: string;
}

function PoseSkeleton({
  pose,
  reference = false,
}: {
  pose: AthletePose;
  reference?: boolean;
}) {
  const color = reference ? "var(--blue)" : "var(--bone)";
  const shoulderCenter = [
    (pose.leftShoulder[0] + pose.rightShoulder[0]) / 2,
    (pose.leftShoulder[1] + pose.rightShoulder[1]) / 2,
  ] as const;

  return (
    <g
      fill="none"
      opacity={reference ? 0.78 : 0.96}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={reference ? 3.5 : 4.5}
      style={{ filter: `drop-shadow(0 0 ${reference ? 6 : 3}px ${color})` }}
      vectorEffect="non-scaling-stroke"
    >
      <line
        x1={pose.head[0]}
        x2={shoulderCenter[0]}
        y1={pose.head[1] + 28}
        y2={shoulderCenter[1]}
      />
      {CONNECTIONS.map(([start, end]) => (
        <line
          key={`${start}-${end}`}
          x1={pose[start][0]}
          x2={pose[end][0]}
          y1={pose[start][1]}
          y2={pose[end][1]}
        />
      ))}
      <circle cx={pose.head[0]} cy={pose.head[1]} r="30" />
      {(Object.keys(pose) as AthleteJoint[])
        .filter((joint) => joint !== "head")
        .map((joint) => (
          <circle
            fill={color}
            key={joint}
            r={reference ? 5.5 : 6.5}
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
  referencePose,
}: {
  className?: string;
  focusJoint: AthleteJoint;
  observedPose: AthletePose;
  referencePose: AthletePose;
}) {
  const focus = observedPose[focusJoint];

  return (
    <svg
      aria-hidden="true"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1672 941"
    >
      <PoseSkeleton pose={referencePose} reference />
      <PoseSkeleton pose={observedPose} />
      <circle
        cx={focus[0]}
        cy={focus[1]}
        fill="none"
        r="38"
        stroke="var(--orange)"
        strokeDasharray="8 8"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function AthleteFilmRoom({
  ariaLabel,
  compact = false,
  cue,
  focusJoint,
  image,
  imageDescription,
  observed,
  observedPose,
  reference,
  referencePose,
  score,
  scoreLabel,
  stageLabel,
  timeline,
  viewLabel,
}: AthleteFilmRoomProps) {
  const checkpoint = Math.max(0, Math.min(100, timeline.checkpointPercent));
  const sizes = compact
    ? "(max-width: 640px) calc(100vw - 2.5rem), (max-width: 1536px) calc(100vw - 4rem), 1472px"
    : "(max-width: 1024px) calc(100vw - 2.5rem), (max-width: 1536px) 65vw, 980px";

  return (
    <section
      aria-label={ariaLabel}
      className="overflow-hidden rounded-md border border-border bg-[var(--ink)]"
    >
      <span className="sr-only">
        {imageDescription} Observed separation {observed} degrees, reference {reference}
        degrees, {scoreLabel.toLowerCase()} {score} out of 100. Coaching cue: {cue}.
      </span>

      <div
        className={
          compact
            ? "relative min-h-[22rem] overflow-hidden sm:min-h-[29rem]"
            : "relative min-h-[24rem] overflow-hidden sm:min-h-[31rem]"
        }
      >
        <Image
          alt=""
          className="object-cover"
          fill
          placeholder="blur"
          preload
          sizes={sizes}
          src={image}
        />

        <AthletePoseOverlay
          focusJoint={focusJoint}
          observedPose={observedPose}
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

      <div className="border-t border-border bg-[var(--ink)] px-5 py-4 sm:px-7">
        <div className="relative h-12">
          <div className="absolute inset-x-0 top-2 h-px bg-[var(--muted-ink)]/70" />
          <div
            className="absolute left-0 top-2 h-0.5 bg-accent-brand"
            style={{ width: `${checkpoint}%` }}
          />
          <span
            aria-hidden="true"
            className="absolute top-2 size-3 -translate-x-1/2 -translate-y-1/2 bg-accent-brand"
            style={{ left: `${checkpoint}%` }}
          />
          <div className="absolute inset-x-0 top-5 font-mono text-[0.58rem] uppercase tracking-[0.07em] text-[var(--muted-ink)] sm:text-[0.65rem] sm:tracking-[0.08em]">
            <span className="absolute left-0">{timeline.start}</span>
            <span
              className="absolute -translate-x-1/2 text-[var(--bone)]"
              style={{ left: `${checkpoint}%` }}
            >
              {timeline.checkpoint}
            </span>
            <span className="absolute right-0">{timeline.end}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
