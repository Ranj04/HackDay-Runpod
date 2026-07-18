import { CaptureStage } from "./capture-stage";
import { parseSport } from "@/lib/sports";

export default async function CapturePage({
  searchParams,
}: {
  searchParams: Promise<{
    sport?: string | string[];
    mode?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const sport = parseSport(params.sport);
  const mode = params.mode === "upload" ? "upload" : "record";

  return (
    <main className="w-full flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <CaptureStage initialMode={mode} sport={sport} />
    </main>
  );
}
