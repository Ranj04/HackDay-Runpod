import { z } from "zod";

import {
  BattleRequestSchema,
  probeKiteTestnet,
  simulateSettlement,
} from "@/lib/payments";

export async function POST(request: Request) {
  try {
    const battle = BattleRequestSchema.parse(await request.json());
    const terms = await probeKiteTestnet();
    const receipt = simulateSettlement(battle, Boolean(terms));

    return Response.json({
      receipt,
      kite: {
        identityMode: "demo-passport",
        spendingLimitsEnforced: true,
        challenge: terms,
      },
    });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message
        : error instanceof Error
          ? error.message
          : "Settlement failed.";

    return Response.json({ error: message }, { status: 400 });
  }
}
