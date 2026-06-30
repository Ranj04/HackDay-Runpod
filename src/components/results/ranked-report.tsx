import { ArrowUpRight, Cpu, Database, Server, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CoachedRep, CoachedReport, RankCost } from "@/lib/sample-report";
import { cn } from "@/lib/utils";

const FLAW_LABELS: Record<string, string> = {
  elbow_flare: "Elbow flaring out",
  shallow_dip: "Shallow leg dip",
  wrist_snap: "Wrist snap timing off",
  guide_hand: "Guide hand interfering",
  low_release: "Release point too low",
  none: "Clean rep",
  error: "Pose failed",
};

function flawLabel(id: string): string {
  return FLAW_LABELS[id] ?? id.replace(/_/g, " ");
}

function scoreTone(score: number): string {
  if (score >= 75) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-accent-brand-strong";
}

export function RankedReport({ report }: { report: CoachedReport }) {
  const byId = new Map(report.reps.map((r) => [r.rep_id, r]));
  const ordered = report.worst
    .map((id) => byId.get(id))
    .filter((r): r is CoachedRep => Boolean(r));
  // Any reps missing from `worst` (shouldn't happen) trail the list.
  for (const r of report.reps) if (!report.worst.includes(r.rep_id)) ordered.push(r);

  return (
    <div className="space-y-6">
      {report.cost ? <CostPanel cost={report.cost} /> : null}

      <ol className="space-y-3">
        {ordered.map((rep, i) => (
          <RepCard key={rep.rep_id} rep={rep} rank={i + 1} total={ordered.length} />
        ))}
      </ol>
    </div>
  );
}

function RepCard({ rep, rank, total }: { rep: CoachedRep; rank: number; total: number }) {
  const isWorst = rank === 1;
  const isClean = rep.flaw_label === "none";
  const isBest = rank === total && rep.flaw_label === "none";

  return (
    <Card
      className={cn(
        "border-border bg-card",
        isWorst && "border-accent-brand/40 shadow-[0_0_24px_color-mix(in_oklab,var(--accent-brand),transparent_88%)]",
      )}
    >
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
        <div className="flex w-full items-center gap-4 sm:w-44 sm:flex-col sm:items-start">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              #{rank}
            </span>
            <span className="font-mono text-sm text-foreground">{rep.rep_id}</span>
            {isWorst ? (
              <Badge className="border-accent-brand/50 bg-accent-brand/15 text-accent-brand-strong">
                Worst
              </Badge>
            ) : null}
            {isBest ? (
              <Badge className="border-success/40 bg-success/10 text-success">
                <Trophy className="mr-1 size-3" /> Best
              </Badge>
            ) : null}
          </div>
          <div>
            <span className={cn("font-mono text-3xl font-semibold", scoreTone(rep.score))}>
              {Math.round(rep.score)}
            </span>
            <span className="ml-1 text-xs text-muted-foreground">/100</span>
          </div>
          <Badge
            className={cn(
              "border-border bg-muted text-foreground",
              !isClean && "border-accent-brand/30 text-accent-brand-strong",
            )}
          >
            {flawLabel(rep.flaw_label)}
          </Badge>
        </div>

        <div className="flex-1">
          {rep.coaching ? (
            <Drill coaching={rep.coaching} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {isClean
                ? "No priority fix — keep grooving this rep."
                : "Pose could not be scored for this clip."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Drill({ coaching }: { coaching: NonNullable<CoachedRep["coaching"]> }) {
  const sources = [
    ...(coaching.drill.sourceUrl
      ? [{ title: coaching.drill.sourceTitle || coaching.drill.title, url: coaching.drill.sourceUrl }]
      : []),
    ...coaching.references,
  ].filter((s) => s.url);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{coaching.drill.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {coaching.summary}
        </p>
      </div>
      {coaching.drill.steps.length ? (
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground/90">
          {coaching.drill.steps.slice(0, 4).map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      ) : null}
      {sources.length ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {sources.map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary transition hover:bg-primary/20"
            >
              {s.title.length > 48 ? s.title.slice(0, 48) + "…" : s.title}
              <ArrowUpRight className="size-3" />
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CostPanel({ cost }: { cost: RankCost }) {
  const stats: { icon: typeof Cpu; label: string; value: string }[] = [
    { icon: Server, label: "GPU-seconds", value: fmt(cost.gpu_seconds) },
    { icon: Cpu, label: "CPU-seconds", value: fmt(cost.cpu_seconds) },
    { icon: Server, label: "Workers", value: fmt(cost.workers) },
    { icon: Database, label: "Bright Data reqs", value: fmt(cost.brightdata_requests) },
    { icon: Database, label: "InsForge rows", value: fmt(cost.insforge_rows) },
  ];
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex flex-wrap gap-x-8 gap-y-3 p-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <s.icon className="size-4 text-primary" />
            <span className="font-mono text-sm text-foreground">{s.value}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function fmt(n: number | undefined): string {
  return n === undefined ? "—" : String(n);
}
