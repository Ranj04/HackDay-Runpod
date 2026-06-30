"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  CircleDollarSign,
  LoaderCircle,
  ShieldCheck,
  Swords,
  Trophy,
  WalletCards,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AnalysisResult } from "@/lib/contracts";
import { mockShotCapture } from "@/lib/core";
import {
  analyzeBattleShot,
  SettlementReceiptSchema,
  type SettlementReceipt,
} from "@/lib/payments";
import { cn } from "@/lib/utils";

interface DemoPlayer {
  id: "player-a" | "player-b";
  name: string;
  passportId: string;
  spendingLimit: number;
  analysis?: AnalysisResult;
}

const STAKE = 1;

export function BattleArena() {
  const [players, setPlayers] = useState<[DemoPlayer, DemoPlayer]>([
    {
      id: "player-a",
      name: "Player One",
      passportId: "ghost-agent-a-demo",
      spendingLimit: 2,
    },
    {
      id: "player-b",
      name: "Player Two",
      passportId: "ghost-agent-b-demo",
      spendingLimit: 2,
    },
  ]);
  const [analyzing, setAnalyzing] = useState<string>();
  const [settling, setSettling] = useState(false);
  const [receipt, setReceipt] = useState<SettlementReceipt>();
  const [termsVerified, setTermsVerified] = useState(false);
  const [error, setError] = useState<string>();

  const ready = players.every((player) => player.analysis);
  const provisionalWinner = useMemo(() => {
    if (!players[0].analysis || !players[1].analysis) return undefined;
    if (players[0].analysis.score === players[1].analysis.score) return undefined;
    return players[0].analysis.score > players[1].analysis.score
      ? players[0]
      : players[1];
  }, [players]);

  async function analyzePlayer(index: 0 | 1) {
    const player = players[index];
    setAnalyzing(player.id);
    setReceipt(undefined);
    setError(undefined);

    const analysis = await analyzeBattleShot({
      ...mockShotCapture,
      id: `battle-shot-${index === 0 ? "a" : "b"}`,
    });

    setPlayers((current) => {
      const next = [...current] as [DemoPlayer, DemoPlayer];
      next[index] = { ...next[index], analysis };
      return next;
    });
    setAnalyzing(undefined);
  }

  function updatePlayer(
    index: 0 | 1,
    field: "name" | "spendingLimit",
    value: string,
  ) {
    setPlayers((current) => {
      const next = [...current] as [DemoPlayer, DemoPlayer];
      next[index] = {
        ...next[index],
        [field]: field === "spendingLimit" ? Number(value) : value,
      };
      return next;
    });
    setReceipt(undefined);
  }

  async function settle() {
    if (!ready) return;

    setSettling(true);
    setError(undefined);

    try {
      const response = await fetch("/api/kite/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stake: STAKE,
          players: players.map((player) => ({
            id: player.id,
            name: player.name,
            passportId: player.passportId,
            spendingLimit: player.spendingLimit,
            score: player.analysis?.score,
          })),
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        receipt?: unknown;
        kite?: { challenge?: unknown };
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Settlement failed.");
      }

      setReceipt(SettlementReceiptSchema.parse(payload.receipt));
      setTermsVerified(Boolean(payload.kite?.challenge));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Settlement failed.");
    } finally {
      setSettling(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#ff6a1a]/30 bg-[#ff6a1a]/10 p-4 text-sm leading-6 text-[#ffd2b3]">
        <strong>Settlement mode: labeled simulation.</strong> Kite Passport
        requires a funded wallet and passkey-approved spending session. Neither
        is configured here, so no transaction will be submitted and no tx hash
        will be shown.
      </div>

      <section className="grid gap-5 lg:grid-cols-[1fr_auto_1fr]">
        <PlayerCard
          analyzing={analyzing === "player-a"}
          index={0}
          onAnalyze={() => analyzePlayer(0)}
          onChange={updatePlayer}
          player={players[0]}
        />
        <div className="grid place-items-center">
          <span className="grid size-12 place-items-center rounded-full bg-[#101a2b] text-[#2e86ff]">
            <Swords className="size-5" />
          </span>
        </div>
        <PlayerCard
          analyzing={analyzing === "player-b"}
          index={1}
          onAnalyze={() => analyzePlayer(1)}
          onChange={updatePlayer}
          player={players[1]}
        />
      </section>

      <Card className="border-0 bg-[#101a2b] text-white ring-white/10">
        <CardContent className="grid gap-6 p-2 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#2e86ff] text-[#f4f1e8]">
                kite-testnet
              </Badge>
              <Badge
                variant="outline"
                className="border-white/15 text-white/70"
              >
                {STAKE} test token each
              </Badge>
            </div>
            <h2 className="mt-4 text-2xl font-semibold">
              {provisionalWinner
                ? `${provisionalWinner.name} leads`
                : "Analyze both shots to settle"}
            </h2>
            <p className="mt-1 text-sm text-white/50">
              Both sample captures run through the same mock AnalyzeShot
              function. Real capture replaces it at core integration.
            </p>
          </div>
          <Button
            className="h-11 bg-[#2e86ff] px-5 text-[#f4f1e8] hover:bg-[#5aa0ff]"
            disabled={!ready || settling}
            onClick={settle}
          >
            {settling ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <WalletCards />
            )}
            Settle demo battle
          </Button>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-xl bg-[#ff3b30]/10 p-4 text-sm text-[#ff9a8a]">
          {error}
        </p>
      )}

      {receipt && (
        <Card className="border-0 ring-2 ring-[#2e86ff]">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <Badge className="border border-[#ff6a1a]/30 bg-[#ff6a1a]/15 text-[#ff9a5a]">
                SIMULATED — NO ON-CHAIN TX
              </Badge>
              <span className="text-xs text-muted-foreground">
                Receipt {receipt.id.slice(0, 8)}
              </span>
            </div>
            <CardTitle className="mt-4 flex items-center gap-2 text-3xl">
              <Trophy className="text-[#5aa0ff]" />
              {receipt.winnerName} wins
            </CardTitle>
            <CardDescription>
              {receipt.amount} demo test tokens allocated to the winner in this
              simulation.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
            <ReceiptCheck
              icon={<ShieldCheck />}
              label="Spending limits"
              value="Enforced"
            />
            <ReceiptCheck
              icon={<CircleDollarSign />}
              label="Kite x402 terms"
              value={termsVerified ? "Live challenge verified" : "Probe unavailable"}
            />
            <ReceiptCheck
              icon={<CheckCircle2 />}
              label="Transaction hash"
              value="None — simulated"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PlayerCard({
  player,
  index,
  analyzing,
  onAnalyze,
  onChange,
}: {
  player: DemoPlayer;
  index: 0 | 1;
  analyzing: boolean;
  onAnalyze: () => void;
  onChange: (
    index: 0 | 1,
    field: "name" | "spendingLimit",
    value: string,
  ) => void;
}) {
  return (
    <Card className="border-0 ring-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge variant="secondary">Player {index + 1}</Badge>
          <Bot className="size-5 text-[#5aa0ff]" />
        </div>
        <label className="mt-3">
          <span className="sr-only">Player name</span>
          <input
            className="w-full bg-transparent text-2xl font-semibold outline-none"
            maxLength={40}
            onChange={(event) => onChange(index, "name", event.target.value)}
            value={player.name}
          />
        </label>
        <CardDescription className="font-mono text-xs">
          Passport: {player.passportId}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <label className="block text-xs text-muted-foreground">
          Agent spending limit (test tokens)
          <input
            className="mt-1.5 h-10 w-full rounded-lg border bg-[#101a2b] px-3 text-base text-foreground outline-none focus:border-[#2e86ff]"
            max={100}
            min={0.1}
            onChange={(event) =>
              onChange(index, "spendingLimit", event.target.value)
            }
            step={0.1}
            type="number"
            value={player.spendingLimit}
          />
        </label>
        <div
          className={cn(
            "mt-5 grid min-h-32 place-items-center rounded-xl border border-dashed",
            player.analysis && "border-[#5aa0ff] bg-[#0e1420]",
          )}
        >
          {player.analysis ? (
            <div className="text-center">
              <strong className="block text-5xl font-semibold tabular-nums">
                {player.analysis.score}
              </strong>
              <span className="text-xs text-muted-foreground">form score</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              Sample shot not analyzed
            </span>
          )}
        </div>
        <Button
          className="mt-4 h-10 w-full"
          disabled={analyzing}
          onClick={onAnalyze}
          variant="outline"
        >
          {analyzing && <LoaderCircle className="animate-spin" />}
          {player.analysis ? "Re-analyze sample" : "Analyze sample shot"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ReceiptCheck({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[#0e1420] p-4">
      <span className="text-[#5aa0ff] [&>svg]:size-5">{icon}</span>
      <div>
        <span className="block text-xs text-muted-foreground">{label}</span>
        <strong className="font-medium">{value}</strong>
      </div>
    </div>
  );
}
