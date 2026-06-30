// You.com retrieval: turn a flaw into one concrete corrective drill with a real
// source. Server-only (uses YOUDOTCOM_API_KEY). Throws on failure so the caller
// can fall back to curated content.
import type { Drill, Flaw } from "../contracts";
import { buildQuery } from "./queries";

const YOUCOM_SEARCH_URL = "https://api.you.com/v1/search";

interface YouWebResult {
  url: string;
  title?: string;
  description?: string;
  snippets?: string[];
}

export function hasYouComKey(): boolean {
  return Boolean(process.env.YOUDOTCOM_API_KEY);
}

const GOOD_DOMAINS = ["breakthroughbasketball", "basketballhq", "youtube", "stack.com", "usab", "hoopsking", "pro-training", "shotmechanics"];
const BAD_DOMAINS = ["reddit", "quora", "facebook", "tiktok", "x.com", "twitter", "pinterest"];

/** Prefer coaching/instructional results over forum threads. */
function scoreResult(r: YouWebResult): number {
  const hay = `${r.title ?? ""} ${r.description ?? ""}`.toLowerCase();
  const url = r.url.toLowerCase();
  let s = 0;
  if (hay.includes("drill")) s += 2;
  if (hay.includes("how to") || hay.includes("fix")) s += 1;
  if (hay.includes("form") || hay.includes("shooting") || hay.includes("technique")) s += 1;
  if (GOOD_DOMAINS.some((d) => url.includes(d))) s += 3;
  if (BAD_DOMAINS.some((d) => url.includes(d))) s -= 3;
  return s;
}

function cleanTitle(title: string | undefined, url: string): string {
  if (!title) return url;
  // Strip "r/Foo on Reddit: " style prefixes and trailing ellipses.
  return title
    .replace(/^r\/[^:]+on Reddit:\s*/i, "")
    .replace(/\s*\.\.\.$/, "")
    .trim();
}

function stepsFromSnippets(snippets: string[] | undefined): string[] {
  if (!snippets) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const snip of snippets) {
    for (const piece of snip.split(/(?<=[.!?])\s+/)) {
      const s = piece.replace(/\s+/g, " ").trim();
      if (s.length >= 30 && s.length <= 180 && !seen.has(s)) {
        seen.add(s);
        out.push(s);
        if (out.length >= 4) return out;
      }
    }
  }
  return out;
}

export async function retrieveDrill(flaw: Flaw): Promise<Drill> {
  const query = buildQuery(flaw);
  const res = await fetch(`${YOUCOM_SEARCH_URL}?query=${encodeURIComponent(query)}`, {
    headers: { "X-API-Key": process.env.YOUDOTCOM_API_KEY ?? "" },
  });
  if (!res.ok) throw new Error(`You.com search failed: ${res.status}`);
  const data = (await res.json()) as { results?: { web?: YouWebResult[] } };
  const web = data.results?.web ?? [];
  if (web.length === 0) throw new Error("You.com returned no results");

  const best = [...web].sort((a, b) => scoreResult(b) - scoreResult(a))[0];
  const steps = stepsFromSnippets(best.snippets);
  return {
    title: cleanTitle(best.title, best.url),
    steps: steps.length ? steps : ["Open the linked breakdown and mirror the cue it shows for this fix."],
    sourceUrl: best.url,
    sourceTitle: cleanTitle(best.title, best.url),
  };
}
