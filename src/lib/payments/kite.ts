import {
  BattleRequestSchema,
  KiteTermsSchema,
  SettlementReceiptSchema,
  type BattleRequest,
  type KiteTerms,
  type SettlementReceipt,
} from "./types";

const KITE_CHALLENGE_URL =
  "https://x402.dev.gokite.ai/api/weather?location=San%20Francisco";
const FACILITATOR_URL = "https://facilitator.pieverse.io" as const;

export async function probeKiteTestnet(): Promise<KiteTerms | null> {
  try {
    const response = await fetch(KITE_CHALLENGE_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (response.status !== 402) {
      return null;
    }

    const payload = (await response.json()) as { accepts?: unknown[] };
    return KiteTermsSchema.parse(payload.accepts?.[0]);
  } catch {
    return null;
  }
}

export function simulateSettlement(
  input: BattleRequest,
  termsVerified: boolean,
): SettlementReceipt {
  const battle = BattleRequestSchema.parse(input);
  const [first, second] = battle.players;

  if (first.score === second.score) {
    throw new Error("A tied battle cannot settle a winner.");
  }

  const winner = first.score > second.score ? first : second;

  return SettlementReceiptSchema.parse({
    id: crypto.randomUUID(),
    status: "simulated",
    network: "kite-testnet",
    winnerId: winner.id,
    winnerName: winner.name,
    amount: battle.stake * 2,
    txHash: null,
    createdAt: new Date().toISOString(),
    termsVerified,
    facilitator: FACILITATOR_URL,
    reason:
      "No funded, passkey-approved Kite Passport spending session is configured. No on-chain transaction was submitted.",
  });
}
