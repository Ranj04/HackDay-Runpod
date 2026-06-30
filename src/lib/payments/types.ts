import { z } from "zod";

export const BattlePlayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(40),
  score: z.number().min(0).max(100),
  passportId: z.string().min(1),
  spendingLimit: z.number().positive().max(100),
});

export const BattleRequestSchema = z
  .object({
    players: z.tuple([BattlePlayerSchema, BattlePlayerSchema]),
    stake: z.number().positive().max(10),
  })
  .superRefine((battle, context) => {
    if (battle.players[0].id === battle.players[1].id) {
      context.addIssue({
        code: "custom",
        message: "Battle players must be distinct.",
        path: ["players"],
      });
    }
    battle.players.forEach((player, index) => {
      if (player.spendingLimit < battle.stake) {
        context.addIssue({
          code: "custom",
          message: `${player.name}'s spending limit is below the stake.`,
          path: ["players", index, "spendingLimit"],
        });
      }
    });
  });

export const KiteTermsSchema = z.object({
  scheme: z.string(),
  network: z.literal("kite-testnet"),
  maxAmountRequired: z.string(),
  asset: z.string(),
  payTo: z.string(),
  merchantName: z.string().optional(),
});

export const SettlementReceiptSchema = z.object({
  id: z.string(),
  status: z.literal("simulated"),
  network: z.literal("kite-testnet"),
  winnerId: z.string(),
  winnerName: z.string(),
  amount: z.number().positive(),
  txHash: z.null(),
  createdAt: z.string(),
  termsVerified: z.boolean(),
  facilitator: z.literal("https://facilitator.pieverse.io"),
  reason: z.string(),
});

export type BattleRequest = z.infer<typeof BattleRequestSchema>;
export type SettlementReceipt = z.infer<typeof SettlementReceiptSchema>;
export type KiteTerms = z.infer<typeof KiteTermsSchema>;
