import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const requiredFiles = [
  "chip.json",
  "metadata.json",
  "input.schema.json",
  "output.schema.json",
  "SKILL.md",
  "DESCRIPTION.md",
];

await Promise.all(requiredFiles.map((file) => access(join(root, file))));

const manifest = JSON.parse(await readFile(join(root, "chip.json"), "utf8"));
const metadata = JSON.parse(
  await readFile(join(root, "metadata.json"), "utf8"),
);
const inputSchema = JSON.parse(
  await readFile(join(root, "input.schema.json"), "utf8"),
);
const outputSchema = JSON.parse(
  await readFile(join(root, "output.schema.json"), "utf8"),
);
const skill = await readFile(join(root, "SKILL.md"));

assert(manifest.standard === "ERC1155", "standard must be ERC1155");
assert(
  /^[a-z0-9-]+_finchip$/.test(manifest.slug),
  "slug must end in _finchip",
);
assert(/^0x[a-f0-9]{64}$/.test(manifest.contentHash), "invalid contentHash");
assert(new URL(manifest.metadataURI), "metadataURI must be a URL");
assert(new URL(manifest.sourceUrl), "sourceUrl must be a URL");
assert(manifest.licenseType === "MIT", "license type mismatch");
assert(metadata.capability === "coachFlaw", "capability must be coachFlaw");
assert(inputSchema.properties?.direction, "input schema is incomplete");
assert(outputSchema.properties?.drill, "output schema is incomplete");

const digest = `0x${createHash("sha256").update(skill).digest("hex")}`;
assert(digest === manifest.contentHash, "SKILL.md content hash mismatch");

console.log(
  `FinChip package valid: ${manifest.slug} (${manifest.standard}, ${requiredFiles.length} files)`,
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
