import { CalendarDays, Cloud, HardDrive, Repeat2, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GhostSession, PersistenceMode } from "@/lib/db";

export function ProgressView({
  sessions,
  mode,
}: {
  sessions: GhostSession[];
  mode: PersistenceMode;
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
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Progress history</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Your form, over time.
          </h1>
        </div>
        <Badge className="h-7 gap-1.5 bg-[#101a2b] text-foreground ring-1 ring-white/10">
          {mode === "insforge" ? (
            <Cloud className="size-3.5 text-[#5aa0ff]" />
          ) : (
            <HardDrive className="size-3.5 text-[#5aa0ff]" />
          )}
          {mode === "insforge" ? "InsForge synced" : "Local demo mode"}
        </Badge>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat
          icon={<CalendarDays />}
          label="Sessions"
          value={String(sessions.length)}
        />
        <Stat
          icon={<TrendingUp />}
          label="Score change"
          value={`${scoreDelta >= 0 ? "+" : ""}${scoreDelta}`}
        />
        <Stat
          icon={<Repeat2 />}
          label="Most recurring"
          value={recurring ? `${recurring[1].count} of ${recent.length}` : "—"}
          detail={recurring?.[1].label}
        />
      </section>

      <Card className="border-0 ring-white/10">
        <CardHeader>
          <CardTitle className="text-xl">Score over time</CardTitle>
          <CardDescription>
            Each point is one completed shot analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScoreChart sessions={sessions} />
        </CardContent>
      </Card>

      <Card className="border-0 ring-white/10">
        <CardHeader>
          <CardTitle className="text-xl">Recent sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.map((session) => (
            <article
              className="grid items-center gap-3 rounded-xl border bg-[#101a2b] p-4 sm:grid-cols-[auto_1fr_auto]"
              key={session.id}
            >
              <strong className="text-3xl tabular-nums">{session.score}</strong>
              <div>
                <h2 className="font-medium">{session.top_flaw_label}</h2>
                <p className="text-xs text-muted-foreground">
                  {session.coaching.drill.title}
                </p>
              </div>
              <time className="text-xs text-muted-foreground">
                {new Intl.DateTimeFormat("en", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(session.created_at))}
              </time>
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
function Stat({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card className="border-0 ring-white/10">
      <CardContent className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#11233e] text-[#1e6fe0] [&>svg]:size-4">
          {icon}
        </span>
        <div className="min-w-0">
          <span className="text-xs text-muted-foreground">{label}</span>
          <strong className="block text-2xl font-semibold">{value}</strong>
          {detail && (
            <span className="block truncate text-xs text-muted-foreground">
              {detail}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreChart({ sessions }: { sessions: GhostSession[] }) {
  const chronological = [...sessions].reverse();
  const points = chronological
    .map((session, index) => {
      const x =
        chronological.length === 1
          ? 300
          : 30 + (index / (chronological.length - 1)) * 540;
      const y = 180 - (session.score / 100) * 150;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="overflow-hidden rounded-xl bg-[#101a2b] p-3 sm:p-5">
      <svg
        aria-label="Score over time chart"
        className="h-auto w-full"
        role="img"
        viewBox="0 0 600 200"
      >
        {[30, 80, 130, 180].map((y) => (
          <line
            key={y}
            stroke="rgba(255,255,255,.1)"
            strokeWidth="1"
            x1="25"
            x2="575"
            y1={y}
            y2={y}
          />
        ))}
        <polyline
          fill="none"
          points={points}
          stroke="#2e86ff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="5"
        />
        {chronological.map((session, index) => {
          const [x, y] = points.split(" ")[index].split(",");
          return (
            <g key={session.id}>
              <circle cx={x} cy={y} fill="#101a2b" r="7" stroke="#2e86ff" strokeWidth="4" />
              <text
                fill="white"
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
