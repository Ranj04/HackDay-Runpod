/**
 * One-off: confirm the "best shot" echo overlay is populated from the active
 * (Curry) reference end-to-end. Run: npx tsx src/lib/__verify__/checkEcho.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ShotCaptureSchema } from "../contracts";
import { analyzeShot } from "../analysis";
import { REFERENCE_CAPTURE } from "../analysis/reference";

async function main() {
  const sample = ShotCaptureSchema.parse(
    JSON.parse(readFileSync(join(process.cwd(), "fixtures/sample-shot.json"), "utf8")),
  );
  const result = await analyzeShot(sample);
  const echo = result.echoRef ?? [];
  console.log(`active reference: ${REFERENCE_CAPTURE.id} (${REFERENCE_CAPTURE.frames.length} frames)`);
  console.log(`echoRef frames projected onto user: ${echo.length}`);
  console.log(`score: ${result.score} | topFlaw: ${result.topFlaw.id}`);
  console.log(echo.length > 0 ? "✓ echo overlay populated" : "✗ echo overlay EMPTY");
  process.exit(echo.length > 0 ? 0 : 1);
}

main();
