import { readFileSync } from "node:fs";

// Guards the first-paint contract: the portal tree must be read on the server,
// handed to the client component, and the browser must never be the only place
// that knows how to load it.

const failures = [];

function read(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    failures.push(`Mungon skedari ${path}.`);
    return "";
  }
}

function requireText(label, source, markers) {
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${label}: mungon "${marker}".`);
  }
}

function refuseText(label, source, markers) {
  for (const marker of markers) {
    if (source.includes(marker)) failures.push(`${label}: nuk duhet të përmbajë "${marker}".`);
  }
}

const portal = read("app/SchoolLearningPortal.tsx");
const homePage = read("app/page.tsx");
const serverPortal = read("lib/sanity/portal.ts");
const sharedQuery = read("lib/sanity/portal-query.ts");
const installer = read("scripts/optimize-portal-first-paint.mjs");

requireText("Portali i gjeneruar", portal, [
  "// portal-first-paint-v1",
  "initialGrades?: unknown;",
  "useState<Grade[]>(() => seededGrades || [])",
  "useState(() => !seededGrades)",
  "void fetchPortal(!seededGrades);",
  "function sanityImageUrl(",
  "sanityImageUrl(url, 1200)",
  "sanityImageUrl(card.image?.asset?.url, 900)",
  "sanityImageUrl(imageUrl, 1200)",
]);

// The published-content contract stays in force: browser reads are never cached.
requireText("Portali i gjeneruar", portal, ["useCdn: false"]);

refuseText("Portali i gjeneruar", portal, [
  "const [grades, setGrades] = useState<Grade[]>([]);",
  "const [loading, setLoading] = useState(true);",
]);

requireText("Faqja kryesore", homePage, [
  'import { fetchPortalGrades } from "@/lib/sanity/portal";',
  "fetchPortalGrades()",
  "initialGrades={initialGrades}",
  "Promise.all",
]);

requireText("Leximi i portalit në server", serverPortal, [
  'import "server-only";',
  "getSanityReadClient()",
  "PORTAL_QUERY",
  'perspective: "published"',
  "return null;",
]);

requireText("Query e përbashkët", sharedQuery, [
  "export const PORTAL_QUERY",
  '_type == "grade"',
  '"subjects":',
  '"chapters":',
  '"lessons":',
]);

requireText("Instaluesi", installer, ["portal-first-paint-v1", "sanityImageUrl", "seededGrades"]);

// The server prefetch is only equivalent to the browser refresh while the two
// queries are identical, so compare them instead of trusting the generator.
const portalQueryLiteral = portal.match(/const portalQuery = `\n([\s\S]*?)\n`;\n/);
const sharedQueryLiteral = sharedQuery.match(/export const PORTAL_QUERY = `\n([\s\S]*?)\n`;\n/);
if (!portalQueryLiteral) failures.push("Portali i gjeneruar: nuk u gjet literali portalQuery.");
if (!sharedQueryLiteral) failures.push("Query e përbashkët: nuk u gjet literali PORTAL_QUERY.");
if (portalQueryLiteral && sharedQueryLiteral && portalQueryLiteral[1] !== sharedQueryLiteral[1]) {
  failures.push("PORTAL_QUERY nuk përputhet me portalQuery të portalit të gjeneruar.");
}

if (failures.length) {
  console.error("Auditimi i first paint dështoi:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("Portali dorëzohet i renderuar nga serveri me foto Sanity me përmasa të sakta.");
