"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import {
  FileVideo,
  LoaderCircle,
  ScanLine,
  Upload,
  UserRound,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ShotCapture } from "@/lib/contracts";
import { SPORTS, type SportId } from "@/lib/sports";

const MAX_FILE_BYTES = 7_000_000;
const MAX_ANALYSIS_SECONDS = 8;

const UPLOAD_DESCRIPTION: Record<SportId, string> = {
  basketball:
    "Upload a side-view shot. Echo tracks your mechanics from dip through release.",
  baseball:
    "Upload a side-view pitch. Echo tracks your delivery from leg lift through release.",
  football:
    "Upload a throwing-side quarterback pass. Echo tracks your sequence from set through foot plant and release.",
};

function isVideoFile(file: File): boolean {
  return (
    file.type.startsWith("video/") ||
    /\.(mp4|m4v|mov|webm)$/i.test(file.name)
  );
}

export interface VideoUploadProps {
  onCapture: (capture: ShotCapture, clip: Blob) => void;
  sport: SportId;
  sourceControl?: ReactNode;
  onUseSample?: () => void;
}

export function VideoUpload({
  onCapture,
  sport,
  sourceControl,
  onUseSample,
}: VideoUploadProps) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const movement = SPORTS[sport].movement;

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
      className="grid min-h-[34rem] overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:grid-cols-[minmax(0,1fr)_21rem]"
    >
      <div className="capture-grid relative grid min-h-[22rem] place-items-center overflow-hidden bg-black sm:min-h-[30rem] lg:min-h-[42rem]">
        {previewUrl ? (
          <video
            aria-label={`Selected ${movement} preview`}
            className="absolute inset-0 h-full w-full object-contain"
            controls
            playsInline
            preload="metadata"
            src={previewUrl}
          />
        ) : (
          <div className="relative z-10 max-w-sm px-8 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-lg border border-white/20 bg-black/40 text-white">
              <FileVideo className="size-6" />
            </span>
            <p className="mt-5 font-heading text-3xl font-semibold uppercase tracking-[-0.035em] text-white">
              Load your {movement} film
            </p>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Keep your full body visible in a steady side view. Echo analyzes
              the first eight seconds.
            </p>
          </div>
        )}

        <span
          aria-hidden="true"
          className="absolute left-4 top-4 size-5 border-l-2 border-t-2 border-white/75"
        />
        <span
          aria-hidden="true"
          className="absolute right-4 top-4 size-5 border-r-2 border-t-2 border-white/75"
        />
        <span
          aria-hidden="true"
          className="absolute bottom-4 left-4 size-5 border-b-2 border-l-2 border-white/75"
        />
        <span
          aria-hidden="true"
          className="absolute bottom-4 right-4 size-5 border-b-2 border-r-2 border-white/75"
        />
      </div>

      <aside className="flex min-w-0 flex-col border-t border-border p-5 sm:p-6 lg:border-l lg:border-t-0">
        {sourceControl}

        <div className="mt-7">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {file ? "File ready" : "Existing video"}
          </p>
          <h1
            className="mt-3 text-4xl font-semibold uppercase leading-[0.92] tracking-[-0.045em] sm:text-5xl lg:text-4xl"
            id={`${inputId}-title`}
          >
            Show us your {movement}.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {UPLOAD_DESCRIPTION[sport]}
          </p>
        </div>

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
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-muted p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-background text-primary">
              <FileVideo className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {(file.size / 1_000_000).toFixed(1)} MB · first 00:08
              </p>
            </div>
            <Button
              aria-label="Remove selected video"
              className="size-11 shrink-0"
              disabled={processing}
              onClick={() => updateFile(null)}
              size="icon"
              variant="ghost"
            >
              <X />
            </Button>
          </div>
        ) : (
          <div className="mt-6 border-y border-border">
            <div className="flex items-center gap-3 py-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted text-foreground">
                <UserRound className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">Use a side view</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Keep the camera steady and level
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-border py-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted text-foreground">
                <ScanLine className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">Keep your full motion visible</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  MP4, MOV, M4V, or WebM · up to 7 MB
                </p>
              </div>
            </div>
          </div>
        )}

        {processing ? (
          <div className="mt-5" aria-live="polite">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <LoaderCircle className="size-3.5 animate-spin" />
                Tracking your {movement}…
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
        ) : null}

        {error ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-auto flex flex-col gap-2 pt-6">
          {file ? (
            <>
              <Button
                className="h-12 w-full rounded-lg bg-accent-brand px-5 text-accent-brand-foreground hover:bg-accent-brand/90"
                disabled={processing}
                onClick={analyzeUpload}
                size="lg"
              >
                {processing ? (
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                ) : (
                  <Upload data-icon="inline-start" />
                )}
                {processing ? "Processing…" : `Upload & analyze ${movement}`}
              </Button>
              <label
                className="flex h-11 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition hover:bg-muted"
                htmlFor={inputId}
              >
                Replace video
              </label>
            </>
          ) : (
            <label
              className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent-brand px-5 text-sm font-medium text-accent-brand-foreground transition hover:bg-accent-brand/90"
              htmlFor={inputId}
            >
              <Upload className="size-4" />
              Choose video
            </label>
          )}

          {onUseSample ? (
            <Button className="h-11 w-full" onClick={onUseSample} variant="link">
              Use sample {movement}
            </Button>
          ) : null}
        </div>
      </aside>
    </section>
  );
}
