// Tavily retrieval: 1-2 supporting technique/biomechanics sources for the flaw.
// You.com gives the drill; Tavily gives the "why/sources". Server-only.
import type { Flaw, Reference } from "../contracts";
import { buildQuery } from "./queries";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

interface TavilyResult {
  title?: string;
  url?: string;
}

export function hasTavilyKey(): boolean {
  return Boolean(process.env.TAVILY_API_KEY);
}

export async function retrieveSources(flaw: Flaw): Promise<Reference[]> {
  const res = await fetch(TAVILY_SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: buildQuery(flaw),
      max_results: 2,
      search_depth: "basic",
    }),
  });
  if (!res.ok) throw new Error(`Tavily search failed: ${res.status}`);
  const data = (await res.json()) as { results?: TavilyResult[] };
  const refs = (data.results ?? [])
    .filter((r): r is Required<TavilyResult> => Boolean(r.url && r.title))
    .slice(0, 2)
    .map((r) => ({ title: r.title, url: r.url }));
  if (refs.length === 0) throw new Error("Tavily returned no usable sources");
  return refs;
}
