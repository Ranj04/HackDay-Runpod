import { CaptureStage } from "./capture-stage";
import { parseSport } from "@/lib/sports";

export default async function CapturePage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string | string[] }>;
}) {
  const sport = parseSport((await searchParams).sport);
  const isBaseball = sport === "baseball";

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 lg:py-14">
      <div className="mb-8 max-w-2xl">
        <p className="eyebrow">New analysis</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          {isBaseball ? "Show us your pitch." : "Show us your shot."}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          {isBaseball
            ? "Record or upload a side-view pitch. Echo tracks the delivery through foot strike and compares your sequence with a reference."
            : "Record or upload a side-view shot. Echo tracks your mechanics from dip to release, then compares them with a temporally aligned reference."}
        </p>
      </div>
      <CaptureStage sport={sport} />
    </main>
  );
}
