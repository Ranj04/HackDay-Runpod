import { CalendarDays, Cloud, HardDrive, Repeat2, TrendingUp } from "lucide-react";

import type { EchoSession, PersistenceMode } from "@/lib/db";

const sessionDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function ProgressView({
  sessions,
  mode,
  accountConnected = false,
}: {
  sessions: EchoSession[];
  mode: PersistenceMode;
  accountConnected?: boolean;
}) {
  const recent = sessions.slice(0, 6);
  const flawCounts = recent.reduce<Record<string, { label: string; count: number }>>(
    (counts, session) => {
      const current = counts[session.top_flaw_id];
      counts[session.top_flaw_id] = {
        label: session.top_flaw_label,
        count: (current?.count ?? 0) + 1,
      };
      return counts;
    },
    {},
  );
  const recurring = Object.entries(flawCounts).sort(
    ([, left], [, right]) => right.count - left.count,
  )[0];
  const scoreDelta =
    sessions.length > 1
      ? Math.round(sessions[0].score - sessions[sessions.length - 1].score)
      : 0;

  return (
    <div>
      <header className="flex flex-col justify-between gap-5 pb-10 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-5xl font-semibold tracking-[-0.055em] sm:text-6xl">
            Progress
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Your form, over time.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {mode === "supabase" ? (
            <Cloud className="size-3.5 text-primary" />
          ) : (
            <HardDrive className="size-3.5 text-primary" />
          )}
          {accountConnected
            ? "Progress synced"
            : mode === "supabase"
              ? "Progress history"
              : "Saved on this device"}
          <span aria-hidden="true">·</span>
          {sessions.length} sessions
        </div>
      </header>

      <section
        aria-label="Progress summary"
        className="grid border-y border-border sm:grid-cols-3"
      >
        <Stat
          icon={<CalendarDays />}
          label="Sessions"
          value={String(sessions.length)}
          className="border-b border-border sm:border-b-0 sm:border-r"
        />
        <Stat
          icon={<TrendingUp />}
          label="Score change"
          value={`${scoreDelta >= 0 ? "+" : ""}${scoreDelta}`}
          className="border-b border-border sm:border-b-0 sm:border-r"
        />
        <Stat
          icon={<Repeat2 />}
          label="Most recurring"
          value={recurring ? `${recurring[1].count} of ${recent.length}` : "—"}
          detail={recurring?.[1].label}
        />
      </section>

      <section
        aria-labelledby="score-history-heading"
        className="border-b border-border py-10 sm:py-12"
      >
        <div className="mb-8 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <h2
            id="score-history-heading"
            className="text-2xl font-semibold tracking-[-0.025em]"
          >
            Score over time
          </h2>
          <p className="text-sm text-muted-foreground">
            Each point is one completed shot analysis.
          </p>
        </div>
        <ScoreChart sessions={sessions} />
      </section>

      <section
        aria-labelledby="recent-sessions-heading"
        className="py-10 sm:py-12"
      >
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2
            id="recent-sessions-heading"
            className="text-2xl font-semibold tracking-[-0.025em]"
          >
            Recent sessions
          </h2>
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {sessions.length} total
          </span>
        </div>
        <div className="border-b border-border">
          {sessions.map((session) => (
            <article
              className="grid items-center gap-4 border-t border-border py-5 sm:grid-cols-[5rem_1fr_auto] sm:gap-6"
              key={session.id}
            >
              <div>
                <strong className="data block text-3xl font-semibold text-primary">
                  {session.score}
                </strong>
                <span className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
                  Score
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="font-medium">{session.top_flaw_label}</h3>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {session.coaching.drill.title}
                </p>
              </div>
              <time
                className="col-start-2 text-xs text-muted-foreground sm:col-start-auto sm:text-right"
                dateTime={session.created_at}
              >
                {sessionDateFormatter.format(new Date(session.created_at))}
              </time>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
function Stat({
  icon,
  label,
  value,
  detail,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-32 items-start gap-4 px-1 py-6 sm:px-5 ${className ?? ""}`}
    >
      <span className="mt-1 shrink-0 text-primary [&>svg]:size-4">{icon}</span>
      <div className="min-w-0">
        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <strong className="data mt-2 block text-3xl font-semibold">{value}</strong>
        {detail ? (
          <span className="mt-1 block truncate text-xs text-muted-foreground">
            {detail}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ScoreChart({ sessions }: { sessions: EchoSession[] }) {
  const chronological = [...sessions].reverse();
  const chartWidth = Math.max(600, 60 + (chronological.length - 1) * 70);
  const chartPoints = chronological.map((session, index) => ({
    session,
    x: chronological.length === 1 ? chartWidth / 2 : 30 + index * 70,
    y: 180 - (session.score / 100) * 150,
  }));
  const points = chartPoints.map(({ x, y }) => `${x},${y}`).join(" ");

  return (
    <div className="overflow-x-auto border-l border-border py-2 pl-2 sm:pl-5">
      <svg
        aria-label="Score over time chart"
        className="h-auto w-full"
        role="img"
        style={{ minWidth: `${chartWidth}px` }}
        viewBox={`0 0 ${chartWidth} 200`}
      >
        {[30, 80, 130, 180].map((y) => (
          <line
            key={y}
            stroke="var(--border)"
            strokeWidth="1"
            x1="25"
            x2={chartWidth - 25}
            y1={y}
            y2={y}
          />
        ))}
        <polyline
          fill="none"
          points={points}
          stroke="var(--chart-1)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        {chartPoints.map(({ session, x, y }) => {
          return (
            <g key={session.id}>
              <circle
                cx={x}
                cy={y}
                fill="var(--background)"
                r="6"
                stroke="var(--chart-1)"
                strokeWidth="4"
              />
              <text
                fill="var(--foreground)"
                fontSize="12"
                textAnchor="middle"
                x={x}
                y={Number(y) - 14}
              >
                {session.score}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
