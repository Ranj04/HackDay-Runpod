"use client";
// Standalone proof of the vision + coaching core: record -> analyze -> coach ->
// ghost overlay, with no dependency on app routing or the platform half. Person B
// owns src/app; this component lets the core be demoed/verified on its own.
//
// Note: coachFlaw runs in curated mode here (client, no keys). For live You.com/
// Tavily/Nebius coaching, the integrated app calls coachFlaw from a server route.
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CaptureView } from "./CaptureView";
import { GhostOverlay } from "@/components/overlay";
import { analyzeShot, detectShootingSide } from "@/lib/analysis";
import { coachFlaw, lastCoachSource } from "@/lib/coach";
import type { AnalysisResult, CoachingResult, ShotCapture } from "@/lib/contracts";

export function CoreDemo({ className }: { className?: string }) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [coaching, setCoaching] = useState<CoachingResult | null>(null);
  const [source, setSource] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function handleCapture(capture: ShotCapture) {
    setBusy(true);
    setCoaching(null);
    try {
      const analysis = await analyzeShot(capture);
      setResult(analysis);
      // Highlighting uses the shooting side; surfaced here for parity with overlay.
      void detectShootingSide(capture);
      const coachingResult = await coachFlaw(analysis.topFlaw);
      setCoaching(coachingResult);
      setSource(lastCoachSource());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1 · Record your shot</CardTitle>
          </CardHeader>
          <CardContent>
            <CaptureView onCapture={handleCapture} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>2 · Your form vs the ghost</CardTitle>
            {result && (
              <Badge variant={result.topFlaw.severity === "high" ? "destructive" : "secondary"}>
                Score {result.score}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {busy && <p className="text-sm text-muted-foreground">Analyzing your shot…</p>}
            {!busy && !result && (
              <p className="text-sm text-muted-foreground">Record a shot to see your skeleton against the reference.</p>
            )}
            {result && <GhostOverlay result={result} width={420} height={520} />}
          </CardContent>
        </Card>
      </div>

      {coaching && result && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>3 · Fix it: {result.topFlaw.label}</CardTitle>
            <Badge variant="outline">coaching: {source}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">{coaching.drill.title}</h4>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                {coaching.drill.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
            <p className="text-sm">{coaching.summary}</p>
            <div className="text-sm">
              <span className="text-muted-foreground">Sources: </span>
              {coaching.references.map((ref, i) => (
                <span key={ref.url}>
                  {i > 0 && ", "}
                  <a className="underline" href={ref.url} target="_blank" rel="noreferrer">
                    {ref.title}
                  </a>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
