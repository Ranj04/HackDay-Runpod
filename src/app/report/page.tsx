import { ReportClient } from "./report-client";

export default function ReportPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 lg:py-14">
      <div className="mb-8">
        <p className="eyebrow">Fan-out report</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          Worst reps, ranked.
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Every clip scored in parallel on Runpod Flash GPU workers, ranked
          worst-first — each flaw paired with a cited drill retrieved from
          InsForge pgvector.
        </p>
      </div>
      <ReportClient />
    </main>
  );
}
