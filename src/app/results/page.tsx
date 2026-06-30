import { ResultsClient } from "./results-client";

export default function ResultsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 lg:py-14">
      <div className="mb-8">
        <p className="eyebrow">Analysis complete</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          Your shot, decoded.
        </h1>
      </div>
      <ResultsClient />
    </main>
  );
}
