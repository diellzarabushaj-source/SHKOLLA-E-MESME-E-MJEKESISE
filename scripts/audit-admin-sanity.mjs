import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const checks = [];
const EXPECTED_PROJECT = "u5d5zn7n";
const EXPECTED_DATASET = "schoolv2";

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!existsSync(absolute)) {
    failures.push(`${relativePath} mungon.`);
    return "";
  }
  return readFileSync(absolute, "utf8");
}

function requireAll(label, content, values) {
  for (const value of values) {
    if (!content.includes(value)) failures.push(`${label}: mungon ${JSON.stringify(value)}.`);
  }
  checks.push(label);
}

const packageJson = JSON.parse(read("package.json") || "{}");
const nextConfig = read("next.config.mjs");
const writeClient = read("lib/sanity/write-client.ts");
const aligner = read("scripts/align-sanity-v2.mjs");
const generatedPortal = read("app/SchoolLearningPortal.tsx");
const adminIdentity = read("lib/admin/server.ts");
const adminEditor = read("app/LessonAdminEditor.tsx");
const adminHardening = read("scripts/harden-admin-editor.mjs");
const adminRoute = read("app/api/admin/lessons/[lessonId]/route.ts");
const page = read("app/page.tsx");
const buildWorkflow = read(".github/workflows/build.yml");
const browserWorkflow = read(".github/workflows/deep-navigation.yml");

requireAll("Canonical Sanity project", nextConfig, [
  `process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "${EXPECTED_PROJECT}"`,
  `process.env.NEXT_PUBLIC_SANITY_DATASET_V2 || "${EXPECTED_DATASET}"`,
]);
requireAll("Canonical Sanity write client", writeClient, [
  `process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "${EXPECTED_PROJECT}"`,
  `process.env.NEXT_PUBLIC_SANITY_DATASET_V2 || "${EXPECTED_DATASET}"`,
  "useCdn: false",
  "SANITY_API_WRITE_TOKEN",
]);
requireAll("Generated Sanity compatibility", aligner, [
  "sanity-v2-contract-v2",
  '"gradeNumber": coalesce(gradeNumber, order)',
  '"shortDescription": coalesce(shortDescription, description)',
  '"summary": coalesce(summary, description)',
  "defined(audio.asset)",
  "freshClient.fetch<Lesson | null>",
]);
requireAll("Generated portal result", generatedPortal, [
  "sanity-v2-contract-v2",
  '"gradeNumber": coalesce(gradeNumber, order)',
  "defined(audio.asset)",
  "freshClient.fetch<Lesson | null>",
]);

const prepare = String(packageJson.scripts?.["prepare:portal"] || "");
const buildIndex = prepare.indexOf("build-schoolv2-portal-v2.mjs");
const alignIndex = prepare.indexOf("align-sanity-v2.mjs");
const hardenIndex = prepare.indexOf("harden-navigation-v3.mjs");
if (buildIndex < 0 || alignIndex <= buildIndex || hardenIndex <= alignIndex) {
  failures.push("prepare:portal duhet ta gjenerojë portalin, ta harmonizojë me Sanity V2 dhe pastaj ta forcojë navigimin.");
}
if (!String(packageJson.scripts?.["audit:app"] || "").includes("audit:admin-sanity")) {
  failures.push("audit:app nuk e përfshin auditimin admin/Sanity.");
}
checks.push("Build pipeline order");

requireAll("Single administrator identity", adminIdentity, [
  'export const ADMIN_EMAIL = "diellorrabushaj4@gmail.com"',
  'const ADMIN_PROVIDER = "google"',
  "user.emailVerified === true",
  "providers.length === 1",
  "await hasGoogleOnlyAccount(user.id)",
]);
requireAll("Admin rendering boundary", page, [
  "isCurrentUserAdmin",
  "isAdmin={isAdmin}",
  "isAuthenticated={Boolean(user?.id)}",
]);
requireAll("Admin editor synchronization", adminEditor, [
  "readLatestFromSanity",
  'cache: "no-store"',
  "Rifresko nga Sanity",
  "Ruaj në Sanity",
  "revision: currentLesson._rev",
  "onSaved(result.lesson)",
  "sanitizePastedHtml",
  "editorToPortable",
]);
requireAll("Admin loss prevention", adminHardening, [
  "beforeunload",
  "confirmLinkNavigation",
  "Të anulohen ndryshimet e paruajtura?",
  "INVALID_EMBEDDED_CONTENT",
]);
requireAll("Admin API consistency", adminRoute, [
  "await requireAdminUser()",
  "isSameOriginRequest(request)",
  '{ perspective: "published" }',
  "current._rev !== revision",
  ".ifRevisionId(revision)",
  "sanitizeBody(payload.body",
  "const lesson = await readLesson(lessonId)",
  'const noStoreHeaders = { "Cache-Control": "no-store" }',
]);

for (const [label, workflow] of [["Build workflow", buildWorkflow], ["Browser workflow", browserWorkflow]]) {
  requireAll(label, workflow, [
    `NEXT_PUBLIC_SANITY_PROJECT_ID: ${EXPECTED_PROJECT}`,
    `NEXT_PUBLIC_SANITY_DATASET_V2: ${EXPECTED_DATASET}`,
  ]);
}

console.log("Admin and Sanity synchronization audit");
console.log(`- ${checks.length} audit groups checked`);
console.log(`- Project: ${EXPECTED_PROJECT}`);
console.log(`- Dataset: ${EXPECTED_DATASET}`);

if (failures.length) {
  console.error("\nAdmin and Sanity synchronization audit failed:");
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Admin and Sanity synchronization audit passed.");
