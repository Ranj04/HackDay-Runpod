// Nebius Token Factory generation: write the personalized coaching note from the
// retrieved drill + sources + the flaw's actual numbers, using an OpenAI-compatible
// hosted open model. The note must stay grounded in what was retrieved.
import type { Drill, Flaw, Reference } from "../contracts";

const DEFAULT_BASE_URL = "https://api.tokenfactory.nebius.com/v1/";
// Must be a model the configured Nebius endpoint actually serves — the old
// Qwen2.5-32B id 404s on Token Factory. Llama-3.3-70B is available and follows
// the "use only these numbers" grounding instruction cleanly.
const DEFAULT_MODEL = "meta-llama/Llama-3.3-70B-Instruct";

export function hasNebiusKey(): boolean {
  return Boolean(process.env.NEBIUS_API_KEY);
}

export function nebiusInfo(): { model: string; endpoint: string } {
  return {
    model: process.env.NEBIUS_MODEL ?? DEFAULT_MODEL,
    endpoint: process.env.NEBIUS_BASE_URL ?? DEFAULT_BASE_URL,
  };
}

interface GenerateArgs {
  flaw: Flaw;
  drill: Drill;
  references: Reference[];
}

function metricLine(flaw: Flaw): string {
  return `Measured ${flaw.metric} = ${flaw.observed} vs reference ${flaw.reference} (${flaw.direction.replace("_", " ")}).`;
}

/** Live generation via Nebius. Throws on failure so the caller can fall back. */
export async function generateCoachingNote({ flaw, drill, references }: GenerateArgs): Promise<string> {
  const { model, endpoint } = nebiusInfo();
  // Lazy import so the OpenAI SDK only loads on the live path (keeps it out of
  // any client bundle that imports coachFlaw in curated mode).
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.NEBIUS_API_KEY, baseURL: endpoint });

  const sources = references.map((r) => `- ${r.title}: ${r.url}`).join("\n");
  const system =
    "You are a basketball shooting coach. Write a short, encouraging coaching note (3-4 sentences). " +
    "Ground everything in the provided drill and sources and the player's measured numbers. " +
    "Do NOT introduce facts, drills, or claims that are not in the provided material.";
  const user =
    `Flaw: ${flaw.label}\n${metricLine(flaw)}\n\n` +
    `Drill (from You.com): ${drill.title}\nSteps:\n${drill.steps.map((s) => `- ${s}`).join("\n")}\n\n` +
    `Supporting sources (from Tavily):\n${sources}\n\n` +
    "Write the note now. Reference the measured numbers and point the player at the drill.";

  const res = await client.chat.completions.create({
    model,
    temperature: 0.4,
    max_tokens: 280,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const text = res.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("Nebius returned an empty completion");
  return text;
}

/**
 * Deterministic, grounded fallback note (no model call). Cites the actual numbers
 * and the curated drill — used when Nebius isn't configured.
 */
export function templateSummary(flaw: Flaw, drill: Drill): string {
  return (
    `${metricLine(flaw)} That reads as "${flaw.label.toLowerCase()}". ` +
    `Work the "${drill.title}" drill: ${drill.steps[0]} ` +
    `Groove it until the number drifts back toward the reference.`
  );
}
