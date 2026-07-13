"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, LoaderCircle, Upload } from "lucide-react";

import { CaptureView } from "@/components/capture/CaptureView";
import { VideoUpload } from "@/components/capture/VideoUpload";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { clearCapture, saveCapture } from "@/lib/capture-store";
import type { ShotCapture } from "@/lib/contracts";
import { SPORTS, sportHref, type SportId } from "@/lib/sports";

type CaptureMode = "record" | "upload";

export function CaptureStage({
  sport,
  initialMode = "record",
}: {
  sport: SportId;
  initialMode?: CaptureMode;
}) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const [mode, setMode] = useState<CaptureMode>(initialMode);
  const movement = SPORTS[sport].movement;
  const resultsHref = sportHref("/results", sport);

  // A real recorded shot: stash it and let /results analyze + render it.
  function handleCapture(capture: ShotCapture, clip?: Blob) {
    setNavigating(true);
    saveCapture(capture, clip, sport);
    router.push(resultsHref);
  }

  // Camera fallback: clear any stored shot so /results renders the sample.
  function analyzeSample() {
    setNavigating(true);
    clearCapture();
    router.push(resultsHref);
  }

  // While routing, unmount the camera so it can't auto-start another countdown.
  if (navigating) {
    return (
      <div className="mx-auto grid min-h-[34rem] w-full max-w-[100rem] place-items-center rounded-xl border border-border bg-card text-muted-foreground">
        <p className="flex items-center gap-2 text-sm" aria-live="polite">
          <LoaderCircle className="size-5 animate-spin" /> Analyzing your {movement}…
        </p>
      </div>
    );
  }

  const sourceControl = (
    <TabsList
      aria-label="Video source"
      className="mb-4 grid h-12 w-full grid-cols-2 rounded-lg border border-border bg-background p-1 lg:absolute lg:right-6 lg:top-6 lg:z-10 lg:mb-0 lg:w-[18rem]"
    >
      <TabsTrigger
        className="h-full rounded-md px-3 data-active:border-primary/70 data-active:bg-primary/10 data-active:text-foreground"
        value="record"
      >
        <Camera data-icon="inline-start" />
        Record
      </TabsTrigger>
      <TabsTrigger
        className="h-full rounded-md px-3 data-active:border-primary/70 data-active:bg-primary/10 data-active:text-foreground"
        value="upload"
      >
        <Upload data-icon="inline-start" />
        Upload video
      </TabsTrigger>
    </TabsList>
  );

  return (
    <Tabs
      className="mx-auto block w-full max-w-[100rem]"
      onValueChange={(value) => setMode(value as CaptureMode)}
      value={mode}
    >
      {sourceControl}
      <TabsContent className="m-0" value="record">
        <CaptureView
          onCapture={handleCapture}
          onUseSample={analyzeSample}
          sourceControl={<div aria-hidden="true" className="hidden h-12 lg:block" />}
          sport={sport}
        />
      </TabsContent>
      <TabsContent className="m-0" value="upload">
        <VideoUpload
          onCapture={handleCapture}
          onUseSample={analyzeSample}
          sourceControl={<div aria-hidden="true" className="hidden h-12 lg:block" />}
          sport={sport}
        />
      </TabsContent>
    </Tabs>
  );
}
