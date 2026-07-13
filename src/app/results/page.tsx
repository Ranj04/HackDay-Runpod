import { ResultsClient } from "./results-client";
import { parseSport, SPORTS } from "@/lib/sports";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string | string[] }>;
}) {
  const sport = parseSport((await searchParams).sport);

  return (
    <main className="mx-auto w-full max-w-[90rem] flex-1 px-5 py-8 sm:px-8 lg:py-12">
      <div className="mb-6 border-b border-border pb-6 sm:mb-8 sm:pb-8">
        <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-6xl lg:text-7xl">
          Your {SPORTS[sport].movement}, compared.
        </h1>
      </div>
      <ResultsClient sport={sport} />
    </main>
  );
}
