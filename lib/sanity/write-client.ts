import "server-only";

import { createClient } from "next-sanity";
import { SANITY_API_VERSION, SANITY_DATASET, SANITY_PROJECT_ID } from "./config";

let writeClient: ReturnType<typeof createClient> | null = null;

export function getSanityWriteClient(): ReturnType<typeof createClient> {
  if (writeClient) return writeClient;

  const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_WRITE_TOKEN;
  if (!token) throw new Error("SANITY_WRITE_TOKEN_MISSING");

  writeClient = createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    useCdn: false,
    token,
  });

  return writeClient;
}
