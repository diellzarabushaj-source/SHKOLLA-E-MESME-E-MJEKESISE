≠rá^—f•ñÿ¶{~Ïy 'v√Æ∂õ≠import "server-only";

import { createClient } from "next-sanity";

let writeClient: ReturnType<typeof createClient> | null = null;

export function getSanityWriteClient(): ReturnType<typeof createClient> {
  if (writeClient) return writeClient;

  const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_WRITE_TOKEN;
  if (!token) throw new Error("SANITY_WRITE_TOKEN_MISSING");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET_V2;
  if (!projectId || !dataset) throw new Error("SANITY_WRITE_TARGET_MISSING");

  writeClient = createClient({
    projectId,
    dataset,
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-07-17",
    useCdn: false,
    token,
  });

  return writeClient;
}
