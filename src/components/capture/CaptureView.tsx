"use client";
// Webcam view with a live MediaPipe pose skeleton drawn on an overlay canvas.
// Recording buffers PoseFrames; stopping assembles a contract-valid ShotCapture
// and hands it back via onCapture.
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { PoseLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import { Camera, ScanLine, Square, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BONE } from "@/components/overlay/palette";
import { useCamera } from "@/lib/vision/useCamera";
import { createPoseLandmarker } from "@/lib/vision/poseLandmarker";
import { landmarksToKeypoints } from "@/lib/vision/landmarks";
import { buildCapture } from "@/lib/vision/buildCapture";
import { isVisible, isVisibleForFraming } from "@/lib/vision/visibility";
import { detectRelease, detectShootingSide } from "@/lib/analysis/detectRelease";
import type { PoseFrame, ShotCapture } from "@/lib/contracts";
import type { SportId } from "@/lib/sports";
import { cn } from "@/lib/utils";

export interface CaptureViewProps {
  onCapture?: (capture: ShotCapture, clip?: Blob) => void;
  className?: string;
  /** Cap the stored frame rate (default 20fps); `0` keeps every buffered frame. */
  targetFps?: number;
  /** Decimal places for normalized coords (default 4); `null` keeps full precision. */
  precision?: number | null;
  sport?: SportId;
  sourceControl?: ReactNode;
  onUseSample?: () => void;
}

const POSE_CONNECTIONS = PoseLandmarker.POSE_CONNECTIONS as { start: number; end: number }[];

// Hands-free auto-record: hold a good frame briefly, count down, then record a
// fixed window so you never have to reach the keyboard from across the room.
const READY_HOLD_MS = 700;
const COUNTDOWN_S = 3;
const RECORD_MS = 5000; // hard cap / fallback if the shot is never detected

// Auto-stop as soon as the shot is done, so trailing movement (walking away,
// relaxing) never gets recorded and corrupts the form-vs-echo ending. We watch
// the highest wrist: it rises through release to an apex, holds the follow-
// through, then drops. Once it has clearly risen and then come back down past
// the apex for a short dwell, the shot is over — stop and analyze.
const MIN_RECORD_MS = 900; // never auto-stop before a shot could plausibly finish
const ARM_RISE = 0.12; // wrist must rise this far (normalized) to count as a real shot
const DESCEND_MARGIN = 0.1; // drop this far below the apex => follow-through ending
const FOLLOW_DWELL_MS = 350; // hold past the apex before calling the shot done
const FOLLOW_THROUGH_MS = 600; // keep this much after release when trimming the tail

/**
 * Trim buffered frames so the capture ends on the follow-through, dropping any
 * trailing movement after the shot. Keeps the whole lead-up (dip drives knee
 * flexion) and cuts only the tail at release + a short follow-through window.
 */
function trimToFollowThrough(raw: PoseFrame[]): PoseFrame[] {
  if (raw.length < 6) return raw;
  const tmp: ShotCapture = { id: "live", frames: raw, fps: 30, view: "side" };
  const releaseIdx = detectRelease(tmp, detectShootingSide(tmp));
  const releaseT = raw[releaseIdx]?.t ?? raw[raw.length - 1].t;
  const trimmed = raw.filter((f) => f.t <= releaseT + FOLLOW_THROUGH_MS);
  return trimmed.length >= 4 ? trimmed : raw;
}

/** Draw the live preview skeleton — gated: only confidently-seen joints/bones. */
function drawGatedPreview(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], w: number, h: number): void {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(242, 240, 233, 0.9)";
  ctx.lineWidth = 3;
  ctx.shadowColor = "rgba(242, 240, 233, 0.35)";
  ctx.shadowBlur = 4;
  for (const c of POSE_CONNECTIONS) {
    const a = landmarks[c.start];
    const b = landmarks[c.end];
    if (a && b && isVisible(a) && isVisible(b)) {
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = BONE;
  for (const p of landmarks) {
    if (isVisible(p)) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// MediaPipe Pose landmark indices.
const LM = {
  lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16,
  lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28,
};

/** Side-on framing gate — tuned for laptop demos (closer than "ten feet back").
 *  Torso: both hips + at least one shoulder. Arm: one full chain. Leg: hip→knee;
 *  ankle optional when the knee is low (feet often clip before MediaPipe sees them). */
function isCapturable(landmarks: NormalizedLandmark[]): boolean {
  const v = (i: number) => Boolean(landmarks[i] && isVisibleForFraming(landmarks[i]));

  const torso = v(LM.lHip) && v(LM.rHip) && (v(LM.lShoulder) || v(LM.rShoulder));
  const arm =
    (v(LM.lShoulder) && v(LM.lElbow) && v(LM.lWrist)) ||
    (v(LM.rShoulder) && v(LM.rElbow) && v(LM.rWrist));

  const legOk = (hip: number, knee: number, ankle: number) => {
    if (!v(hip) || !v(knee)) return false;
    if (v(ankle)) return true;
    const kneeLm = landmarks[knee];
    return kneeLm.y >= 0.5;
  };
  const leg =
    legOk(LM.lHip, LM.lKnee, LM.lAnkle) || legOk(LM.rHip, LM.rKnee, LM.rAnkle);

  return torso && arm && leg;
}

export function CaptureView({
  onCapture,
  className,
  targetFps,
  precision,
  sport = "basketball",
  sourceControl,
  onUseSample,
}: CaptureViewProps) {
  const titleId = useId();
  const { videoRef, stream, error, start, stop } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const recordingRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const bufferRef = useRef<PoseFrame[]>([]);
  const recordStartRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);

  // Live shot-completion detection state (reset at each record start).
  const shotBaseYRef = useRef(Infinity); // wrist height at the set position
  const apexYRef = useRef(Infinity); // highest wrist seen (smallest y)
  const apexTRef = useRef(0); // when the apex happened (ms into recording)
  const shotArmedRef = useRef(false); // a real rise has been seen
  const finishRecordingRef = useRef<() => void>(() => {}); // stable handle for the loop

  const [ready, setReady] = useState(false);
  const [capturable, setCapturable] = useState(false);
  const capturableRef = useRef(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "countdown" | "recording">(
    "idle",
  );
  const [count, setCount] = useState(COUNTDOWN_S);

  // Initialize camera + pose model once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await start();
        const lm = await createPoseLandmarker();
        if (cancelled) return;
        landmarkerRef.current = lm;
        setReady(true);
      } catch (e) {
        setInitError(e instanceof Error ? e.message : "Failed to initialize pose tracking");
      }
    })();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
      stop();
    };
    // start/stop are stable from useCamera; run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drive the detection loop once ready. Defined locally so it can recurse via
  // requestAnimationFrame without a self-referential useCallback.
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      rafRef.current = raf;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const lm = landmarkerRef.current;
      if (!video || !canvas || !lm || video.readyState < 2) return;
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const nowMs = performance.now();
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        const result = lm.detectForVideo(video, nowMs);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const landmarks = result.landmarks?.[0] as NormalizedLandmark[] | undefined;
        const cap = landmarks ? isCapturable(landmarks) : false;
        if (cap !== capturableRef.current) {
          capturableRef.current = cap;
          setCapturable(cap);
          if (!cap) {
            setPhase((current) =>
              current === "countdown" ? "idle" : current,
            );
          }
        }
        if (landmarks) {
          drawGatedPreview(ctx, landmarks, canvas.width, canvas.height);
          if (recordingRef.current) {
            const tRec = nowMs - recordStartRef.current;
            bufferRef.current.push({
              t: tRec,
              keypoints: landmarksToKeypoints(landmarks),
            });

            // Track the highest wrist to detect when the shot is finished.
            const lw = landmarks[LM.lWrist];
            const rw = landmarks[LM.rWrist];
            const ly = lw && isVisible(lw) ? lw.y : Infinity;
            const ry = rw && isVisible(rw) ? rw.y : Infinity;
            const wristY = Math.min(ly, ry); // smaller y = higher hand
            if (Number.isFinite(wristY)) {
              if (!Number.isFinite(shotBaseYRef.current)) shotBaseYRef.current = wristY;
              if (wristY < apexYRef.current) {
                apexYRef.current = wristY;
                apexTRef.current = tRec;
              }
              if (!shotArmedRef.current && shotBaseYRef.current - apexYRef.current >= ARM_RISE) {
                shotArmedRef.current = true; // a genuine upward shot motion happened
              }
              const descended = wristY - apexYRef.current >= DESCEND_MARGIN;
              const dwelled = tRec - apexTRef.current >= FOLLOW_DWELL_MS;
              if (shotArmedRef.current && tRec >= MIN_RECORD_MS && descended && dwelled) {
                finishRecordingRef.current(); // shot done — stop and analyze now
              }
            }
          }
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ready, videoRef]);

  // Keep the latest onCapture/build options without retriggering the recording
  // effect (finishRecording must stay referentially stable).
  const onCaptureRef = useRef(onCapture);
  const buildOptsRef = useRef({ targetFps, precision, sport });
  useEffect(() => {
    onCaptureRef.current = onCapture;
    buildOptsRef.current = { targetFps, precision, sport };
  }, [onCapture, targetFps, precision, sport]);

  const finishRecording = useCallback(() => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    // Trim trailing movement so the capture ends on the follow-through.
    const sourceFrames =
      buildOptsRef.current.sport === "basketball"
        ? trimToFollowThrough(bufferRef.current)
        : bufferRef.current;
    const capture = buildCapture(sourceFrames, {
      view: "side",
      targetFps: buildOptsRef.current.targetFps,
      precision: buildOptsRef.current.precision,
    });
    setPhase("idle");
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      recorder.onstop = () => {
        const clip = new Blob(videoChunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });
        onCaptureRef.current?.(capture, clip.size > 0 ? clip : undefined);
      };
      recorder.stop();
      return;
    }
    onCaptureRef.current?.(capture);
  }, []);

  // Keep a stable handle so the detection loop can auto-stop without depending on
  // the callback identity (finishRecording is already referentially stable).
  useEffect(() => {
    finishRecordingRef.current = finishRecording;
  }, [finishRecording]);

  // Once the framing is good, hold briefly then start the countdown.
  useEffect(() => {
    if (!ready || phase !== "idle" || !capturable) return;
    const hold = setTimeout(() => {
      setCount(COUNTDOWN_S);
      setPhase("countdown");
    }, READY_HOLD_MS);
    return () => clearTimeout(hold);
  }, [ready, phase, capturable]);

  // Tick the countdown, then flip into recording.
  useEffect(() => {
    if (phase !== "countdown") return;
    let n = COUNTDOWN_S;
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(id);
        setPhase("recording");
      } else {
        setCount(n);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Record a fixed window, then auto-stop and analyze.
  useEffect(() => {
    if (phase !== "recording") return;
    bufferRef.current = [];
    recordStartRef.current = performance.now();
    recordingRef.current = true;
    videoChunksRef.current = [];
    // Reset shot-completion detection for this take.
    shotBaseYRef.current = Infinity;
    apexYRef.current = Infinity;
    apexTRef.current = 0;
    shotArmedRef.current = false;

    if (stream && typeof MediaRecorder !== "undefined") {
      const preferredTypes = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4",
      ];
      const mimeType = preferredTypes.find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 1_200_000,
      });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) videoChunksRef.current.push(event.data);
      };
      recorderRef.current = recorder;
      recorder.start(250);
    }

    const id = setTimeout(finishRecording, RECORD_MS);
    return () => {
      clearTimeout(id);
    };
  }, [phase, finishRecording, stream]);

  // Manual override: jump straight into recording, or stop early.
  const handleButton = useCallback(() => {
    if (recordingRef.current) {
      finishRecording();
    } else if (capturableRef.current) {
      setPhase("recording");
    }
  }, [finishRecording]);

  const recording = phase === "recording";
  const recordDisabled = !ready || (!recording && !capturable);
  const movement = sport === "baseball" ? "pitch" : "shot";
  const cameraStatus = recording
    ? "Recording"
    : phase === "countdown"
      ? "Starting"
      : ready && capturable
        ? "Ready"
        : ready
          ? "Frame check"
          : "Camera setup";

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "grid min-h-[34rem] overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:grid-cols-[minmax(0,1fr)_21rem]",
        className,
      )}
    >
      <div className="relative min-h-[22rem] overflow-hidden bg-black sm:min-h-[30rem] lg:min-h-[42rem]">
        {/* Mirror both layers so the selfie view and skeleton stay aligned. */}
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full -scale-x-100 object-contain"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100" />

        {recording && (
          <span className="absolute left-4 top-4 flex items-center gap-2 rounded-md border border-white/15 bg-black/75 px-3 py-2 font-mono text-xs font-medium tracking-[0.16em] text-white">
            <span className="size-2 animate-pulse rounded-full bg-destructive" />
            REC
          </span>
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

        {phase === "countdown" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/30">
            <div className="text-center">
              <span className="block font-heading text-8xl font-semibold leading-none text-white drop-shadow-[0_0_24px_rgba(0,0,0,0.7)] sm:text-9xl">
                {count}
              </span>
              <span className="mt-2 block text-sm font-medium text-white/80">
                Get ready to {sport === "baseball" ? "pitch" : "shoot"}…
              </span>
            </div>
          </div>
        )}
      </div>

      <aside className="flex min-w-0 flex-col border-t border-border p-5 sm:p-6 lg:border-l lg:border-t-0">
        {sourceControl}

        <div className="mt-7">
          <p
            aria-live="polite"
            className={cn(
              "font-mono text-xs font-semibold uppercase tracking-[0.16em]",
              ready && capturable ? "text-success" : "text-muted-foreground",
            )}
          >
            {cameraStatus}
          </p>
          <h1
            className="mt-3 text-4xl font-semibold uppercase leading-[0.92] tracking-[-0.045em] sm:text-5xl lg:text-4xl"
            id={titleId}
          >
            Show us your {movement}.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {sport === "baseball"
              ? "Record a side-view pitch. Echo tracks your delivery from leg lift through release."
              : "Record a side-view shot. Echo tracks your mechanics from dip through release."}
          </p>
        </div>

        <div className="mt-6 border-y border-border">
          <div className="flex items-center gap-3 py-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted text-foreground">
              <UserRound className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium">Get side-on</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                About an arm&apos;s length from the screen
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-t border-border py-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted text-foreground">
              <ScanLine className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium">Keep your full motion in frame</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                {sport === "baseball"
                  ? "Include your hips, glove and stride"
                  : "Include your hips, knees and shooting arm"}
              </p>
            </div>
          </div>
        </div>

        {(error || initError) && (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {error ?? initError}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-6">
          <Button
            className="h-12 w-full rounded-lg bg-accent-brand px-5 text-accent-brand-foreground hover:bg-accent-brand/90"
            disabled={recordDisabled}
            onClick={handleButton}
            size="lg"
          >
            {recording ? (
              <Square data-icon="inline-start" />
            ) : (
              <Camera data-icon="inline-start" />
            )}
            {recording
              ? "Stop and analyze"
              : phase === "countdown"
                ? "Starting…"
                : "Start recording"}
          </Button>

          {!ready && !initError ? (
            <p className="text-center text-xs text-muted-foreground">
              Starting camera…
            </p>
          ) : null}
          {ready && phase === "idle" && capturable ? (
            <p className="text-center text-xs text-muted-foreground">
              Good frame — recording starts automatically
            </p>
          ) : null}
          {ready && phase === "idle" && !capturable ? (
            <p className="text-center text-xs text-muted-foreground">
              Step fully into frame to begin
            </p>
          ) : null}

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
