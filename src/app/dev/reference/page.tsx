"use client";
// Dev harness for turning a clip into a reference "echo" JSON. Drop a side-on
// shooting clip (a coaching-channel slow-mo breakdown works well), optionally
// trim to just the shot, extract pose frames, and download a file you can drop
// into fixtures/reference/generated/ and point reference.ts at.
//
// Not linked from the app — visit /dev/reference directly. Runs entirely client
// side (MediaPipe WASM), so no clip ever leaves the browser.
import { useState } from "react";

import { extractCaptureFromVideo } from "@/lib/vision";
import type { ShotCapture } from "@/lib/contracts";

export default function ReferenceBuilderPage() {
  const [file, setFile] = useState<File | null>(null);
  const [startSec, setStartSec] = useState("");
  const [endSec, setEndSec] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [capture, setCapture] = useState<ShotCapture | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setCapture(null);
    setProgress(0);
    try {
      const result = await extractCaptureFromVideo(file, {
        id: file.name.replace(/\.[^.]+$/, ""),
        startSec: startSec ? Number(startSec) : undefined,
        endSec: endSec ? Number(endSec) : undefined,
        onProgress: setProgress,
      });
      setCapture(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!capture) return;
    const blob = new Blob([JSON.stringify(capture.frames, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${capture.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto w-full max-w-xl space-y-6 px-5 py-14">
      <header className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Reference builder</p>
        <h1 className="text-2xl font-semibold">Clip → reference echo</h1>
        <p className="text-sm text-muted-foreground">
          Side-on shooting clip in, <code>PoseFrame[]</code> JSON out. Download it into{" "}
          <code>fixtures/reference/generated/</code>.
        </p>
      </header>

      <div className="space-y-4 rounded-lg border p-5">
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Start (s)
            <input
              type="number"
              step="0.1"
              value={startSec}
              onChange={(e) => setStartSec(e.target.value)}
              placeholder="clip start"
              className="mt-1 block w-full rounded border px-2 py-1"
            />
          </label>
          <label className="text-sm">
            End (s)
            <input
              type="number"
              step="0.1"
              value={endSec}
              onChange={(e) => setEndSec(e.target.value)}
              placeholder="clip end"
              className="mt-1 block w-full rounded border px-2 py-1"
            />
          </label>
        </div>
        <button
          onClick={run}
          disabled={!file || busy}
          className="w-full rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {busy ? `Extracting… ${Math.round(progress * 100)}%` : "Extract pose frames"}
        </button>
      </div>

      {error && (
        <p className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {capture && (
        <div className="space-y-3 rounded-lg border p-5">
          <p className="text-sm">
            <strong>{capture.frames.length}</strong> frames · ~{capture.fps} fps · view{" "}
            <code>{capture.view}</code>
          </p>
          <button
            onClick={download}
            className="w-full rounded border px-4 py-2 text-sm font-medium"
          >
            Download {capture.id}.json
          </button>
          <p className="text-xs text-muted-foreground">
            Then drop it in <code>fixtures/reference/generated/</code> and import it from{" "}
            <code>src/lib/analysis/reference.ts</code> (re-tune flaw bands afterward).
          </p>
        </div>
      )}
    </main>
  );
}
