import "server-only";

import { createClient } from "next-sanity";
import { SANITY_API_VERSION, SANITY_DATASET, SANITY_PROJECT_ID } from "./config";

let readClient: ReturnType<typeof createClient> | null = null;

export function getSanityReadClient(): ReturnType<typeof createClient> {
  if (readClient) return readClient;

  readClient = createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    useCdn: false,
    perspective: "published",
  });

  return readClient;
}
