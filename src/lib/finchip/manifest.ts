import { z } from "zod";

import manifestJson from "./ghost-shot-coach/chip.json";

export const FinChipManifestSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+_finchip$/),
  standard: z.enum(["ERC1155", "ERC721"]),
  metadataURI: z.url(),
  contentHash: z.string().regex(/^0x[a-f0-9]{64}$/),
  sourceUrl: z.url(),
  category: z.string().min(1),
  licenseType: z.string().min(1),
  feeModel: z.number().int().nonnegative(),
  licensePrice: z.string().regex(/^\d+(\.\d+)?$/),
  maxSupply: z.number().int().nonnegative(),
  royaltyBPS: z.number().int().min(0).max(10_000),
  imageURI: z.string(),
  usageLimit: z.number().int().nonnegative(),
});

export const finChipManifest = FinChipManifestSchema.parse(manifestJson);
export type FinChipManifest = z.infer<typeof FinChipManifestSchema>;
