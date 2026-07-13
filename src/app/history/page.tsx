import { HistoryDashboard } from "./history-dashboard";
import { parseSport } from "@/lib/sports";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string | string[] }>;
}) {
  const sport = parseSport((await searchParams).sport);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8 lg:py-12">
      <HistoryDashboard sport={sport} />
    </main>
  );
}
