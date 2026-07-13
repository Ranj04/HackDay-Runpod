"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FileVideo, LoaderCircle, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ShotCapture } from "@/lib/contracts";
import type { SportId } from "@/lib/sports";

const MAX_FILE_BYTES = 7_000_000;
const MAX_ANALYSIS_SECONDS = 8;

function isVideoFile(file: File): boolean {
  return (
    file.type.startsWith("video/") ||
    /\.(mp4|m4v|mov|webm)$/i.test(file.name)
  );
}

export interface VideoUploadProps {
  onCapture: (capture: ShotCapture, clip: Blob) => void;
  sport: SportId;
}

export function VideoUpload({ onCapture, sport }: VideoUploadProps) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const movement = sport === "baseball" ? "pitch" : "shot";

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  function updateFile(nextFile: File | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextUrl = nextFile ? URL.createObjectURL(nextFile) : null;
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
    setFile(nextFile);
  }

  function selectFile(selected: File | undefined) {
    setError(null);
    setProgress(0);
    if (!selected) return;
    if (!isVideoFile(selected)) {
      updateFile(null);
      setError("Choose an MP4, MOV, M4V, or WebM video.");
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      updateFile(null);
      setError(
        `That video is ${(selected.size / 1_000_000).toFixed(1)} MB. Choose one under 7 MB.`,
      );
      return;
    }
    updateFile(selected);
  }

  async function analyzeUpload() {
    if (!file || processing) return;
    setProcessing(true);
    setError(null);
    setProgress(0);
    try {
      // Keep MediaPipe and its WASM out of the initial capture-page bundle until
      // the user actually asks to process an uploaded clip.
      const { extractCaptureFromVideo } = await import(
        "@/lib/vision/extractFromVideo"
      );
      const capture = await extractCaptureFromVideo(file, {
        endSec: MAX_ANALYSIS_SECONDS,
        precision: 4,
        sampleFps: 20,
        targetFps: 20,
        view: "side",
        onProgress: setProgress,
      });
      onCapture(capture, file);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : `Could not process that ${movement}.`,
      );
      setProcessing(false);
    }
  }

  return (
    <section
      aria-labelledby={`${inputId}-title`}
      className="overflow-hidden rounded-[2rem] border border-border bg-card"
    >
      <div className="grid min-h-[31rem] lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative grid min-h-80 place-items-center overflow-hidden bg-black">
          {previewUrl ? (
            <video
              aria-label={`Selected ${movement} preview`}
              className="h-full max-h-[34rem] w-full object-contain"
              controls
              playsInline
              preload="metadata"
              src={previewUrl}
            />
          ) : (
            <div className="max-w-sm px-8 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                <FileVideo className="size-7" />
              </span>
              <h2
                className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white"
                id={`${inputId}-title`}
              >
                Upload a side-view {movement}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Keep the full body visible. Echo analyzes the first eight seconds
                and verifies the pose sequence with RunPod Flash.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Existing video
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
            Choose your best angle.
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            MP4, MOV, M4V, or WebM · up to 7 MB. A short clip keeps pose tracking
            accurate and upload time low.
          </p>

          <input
            accept="video/mp4,video/quicktime,video/x-m4v,video/webm"
            className="sr-only"
            disabled={processing}
            id={inputId}
            onChange={(event) => {
              selectFile(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
            type="file"
          />

          {file ? (
            <div className="mt-6 rounded-2xl border border-border bg-muted p-4">
              <div className="flex items-start gap-3">
                <FileVideo className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(file.size / 1_000_000).toFixed(1)} MB
                  </p>
                </div>
                <button
                  aria-label="Remove selected video"
                  className="rounded-full p-1 text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground disabled:opacity-40"
                  disabled={processing}
                  onClick={() => updateFile(null)}
                  type="button"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          ) : (
            <label
              className="mt-6 flex cursor-pointer items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:bg-foreground/90"
              htmlFor={inputId}
            >
              <Upload className="size-4" /> Choose video
            </label>
          )}

          {processing && (
            <div className="mt-5" aria-live="polite">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <LoaderCircle className="size-3.5 animate-spin" /> Tracking your
                  {` ${movement}`}…
                </span>
                <span className="font-mono">{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${Math.max(3, progress * 100)}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {file && (
            <div className="mt-5 flex flex-wrap gap-3">
              <Button disabled={processing} onClick={analyzeUpload}>
                {processing ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {processing ? "Processing…" : `Upload & analyze ${movement}`}
              </Button>
              <label
                className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-border bg-transparent px-4 text-sm font-medium transition hover:bg-muted"
                htmlFor={inputId}
              >
                Replace
              </label>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
