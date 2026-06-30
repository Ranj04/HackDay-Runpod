import { ShotCaptureSchema, type ShotCapture } from "@/lib/contracts";
import sampleShot from "../../fixtures/sample-shot.json";

export const mockShotCapture: ShotCapture =
  ShotCaptureSchema.parse(sampleShot);
