import "server-only";

import { getSanityReadClient } from "./read-client";
import { PORTAL_QUERY } from "./portal-query";

/**
 * The portal tree is rendered by a client component that owns its own Sanity
 * types. The server only has to hand over the already published JSON, so the
 * payload stays structurally typed here and is narrowed inside the portal.
 */
export type PortalGrades = Array<Record<string, unknown>>;

function hasPortalContent(grades: PortalGrades): boolean {
  return grades.some((grade) => {
    const subjects = grade.subjects;
    return Array.isArray(subjects) && subjects.length > 0;
  });
}

/**
 * Reads the portal tree on the server so the first paint already contains the
 * grade, subject and chapter cards instead of a loading spinner. Reads stay
 * uncached (`useCdn: false`) to keep the published-content contract intact —
 * the client keeps its live Sanity subscription for later updates.
 *
 * Returns null on any failure so the page still renders and the client falls
 * back to its own fetch instead of the request turning into a 500.
 */
export async function fetchPortalGrades(): Promise<PortalGrades | null> {
  try {
    const grades = await getSanityReadClient().fetch<PortalGrades>(
      PORTAL_QUERY,
      {},
      { perspective: "published" },
    );
    if (!Array.isArray(grades) || !hasPortalContent(grades)) return null;
    return grades;
  } catch (error) {
    console.error("Portal server prefetch failed", error);
    return null;
  }
}
