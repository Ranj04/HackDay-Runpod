"use client";
// getUserMedia hook: owns the webcam stream and a <video> ref, with start/stop
// and an error message. Cleans the stream up on unmount.
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseCamera {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

export function useCamera(): UseCamera {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        // Taller 4:3-ish frame fits more vertical FOV on laptop webcams (better
        // for full-body side-on than default 16:9). Pose still runs fast at 640×480.
        video: {
          facingMode: "user",
          width: { ideal: 640, max: 960 },
          height: { ideal: 480, max: 720 },
          aspectRatio: { ideal: 4 / 3 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      // Widest FOV when the device exposes zoom (common on phone; some laptops too).
      const track = s.getVideoTracks()[0];
      const caps = track.getCapabilities?.() as MediaTrackCapabilities & {
        zoom?: { min?: number; max?: number };
      };
      if (caps?.zoom?.min != null) {
        try {
          await track.applyConstraints({
            advanced: [{ zoom: caps.zoom.min }],
          } as unknown as MediaTrackConstraints);
        } catch {
          // unsupported zoom constraint — keep default
        }
      }

      streamRef.current = s;
      setStream(s);
      setError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
    } catch (e) {
      // play() rejects with AbortError when the stream is torn down mid-init
      // (e.g. React's dev double-mount) — that's benign, not a camera failure.
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Could not access the camera");
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  return { videoRef, stream, error, start, stop };
}
