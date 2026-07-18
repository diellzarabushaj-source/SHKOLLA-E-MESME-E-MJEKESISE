import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const checks = [];
const EXPECTED_SANITY_PROJECT = "u5d5zn7n";
const EXPECTED_SANITY_DATASET = "schoolv2";

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!existsSync(absolute)) {
    failures.push(`${relativePath} mungon.`);
    return "";
  }
  return readFileSync(absolute, "utf8");
}

function requireText(label, content, expected) {
  for (const value of Array.isArray(expected) ? expected : [expected]) {
    if (!content.includes(value)) failures.push(`${label}: mungon kontrolli ${JSON.stringify(value)}.`);
  }
  checks.push(label);
}

function fallbackFor(content, variable) {
  const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return content.match(new RegExp(`${escaped}[^\\n]*?\\|\\|\\s*["']([^"']+)["']`))?.[1] || null;
}

const packageJson = JSON.parse(read("package.json") || "{}");
const nextConfig = read("next.config.mjs");
const writeClient = read("lib/sanity/write-client.ts");
const generatedPortal = read("app/SchoolLearningPortal.tsx");
const sanityAligner = read("scripts/align-sanity-v2.mjs");
const richMarks = read("scripts/add-rich-text-marks.mjs");
const adminHardening = read("scripts/harden-admin-editor.mjs");
const adminIdentity = read("lib/admin/server.ts");
const adminEditor = read("app/LessonAdminEditor.tsx");
const adminRoute = read("app/api/admin/lessons/[lessonId]/route.ts");
const themeToggle = read("app/ThemeToggle.tsx");
const authControls = read("app/AuthControls.tsx");
const layout = read("app/layout.tsx");
const manifestSource = read("app/manifest.ts");
const pwaRegistrar = read("app/PwaRegistrar.tsx");
const progressClient = read("lib/progress/client.ts");
const serviceWorker = read("public/sw.js");

const projectIds = [
  fallbackFor(nextConfig, "NEXT_PUBLIC_SANITY_PROJECT_ID"),
  fallbackFor(writeClient, "NEXT_PUBLIC_SANITY_PROJECT_ID"),
].filter(Boolean);
const datasets = [
  fallbackFor(nextConfig, "NEXT_PUBLIC_SANITY_DATASET_V2"),
  fallbackFor(writeClient, "NEXT_PUBLIC_SANITY_DATASET_V2"),
].filter(Boolean);

if (projectIds.length !== 2 || new Set(projectIds).size !== 1 || projectIds[0] !== EXPECTED_SANITY_PROJECT) {
  failures.push(`Sanity project ID nuk përputhet me projektin V2: ${JSON.stringify(projectIds)}.`);
}
if (datasets.length !== 2 || new Set(datasets).size !== 1 || datasets[0] !== EXPECTED_SANITY_DATASET) {
  failures.push(`Sanity dataset nuk është unik në konfigurim: ${JSON.stringify(datasets)}.`);
}
if (!nextConfig.includes("process.env.NEXT_PUBLIC_SANITY_PROJECT_ID")) {
  failures.push("next.config duhet ta respektojë Sanity project ID nga environment-i i deployment-it.");
}
requireText("Sanity V2 schema alignment", sanityAligner, [
  `"${EXPECTED_SANITY_PROJECT}"`,
  '"gradeNumber": coalesce(gradeNumber, order)',
  '"shortDescription": coalesce(shortDescription, description)',
  '"summary": coalesce(summary, description)',
  "defined(audio.asset)",
  "freshClient.fetch<Lesson | null>",
]);
requireText("Effective generated portal", generatedPortal, [
  "sanity-v2-contract-v2",
  '"gradeNumber": coalesce(gradeNumber, order)',
  "defined(audio.asset)",
  "freshClient.fetch<Lesson | null>",
]);
checks.push("Sanity read/write configuration");

requireText("Admin identity", adminIdentity, [
  'export const ADMIN_EMAIL = "diellorrabushaj4@gmail.com"',
  'const ADMIN_PROVIDER = "google"',
  "user.emailVerified === true",
  "providers.length === 1",
  "await hasGoogleOnlyAccount(user.id)",
]);
requireText("Admin route protection", adminRoute, [
  "await requireAdminUser()",
  "isSameOriginRequest(request)",
  'request.headers.get("x-forwarded-host")',
  'request.headers.get("x-forwarded-proto")',
  "current._rev !== revision",
  "requiredImmutableKeys",
  "preservedImmutableKeys",
  "INVALID_EMBEDDED_CONTENT",
  'href.startsWith("//")',
  'const noStoreHeaders = { "Cache-Control": "no-store" }',
]);
requireText("Single rich-text editor", adminEditor, [
  "contentEditable",
  "Rifresko nga Sanity",
  "Ruaj në Sanity",
  "sanitizePastedHtml",
  'runCommand(event, "bold")',
  'runCommand(event, "italic")',
  'runCommand(event, "hiliteColor"',
  'runCommand(event, "insertUnorderedList")',
  'runCommand(event, "insertOrderedList")',
]);
if (adminEditor.includes("<textarea")) failures.push("Admin editor është kthyer përsëri në editor me shumë textarea/box-e.");
requireText("Admin editor loss prevention", adminHardening, [
  "admin-editor-safety-v1",
  "beforeunload",
  "confirmLinkNavigation",
  "usedBlockKeys",
  "INVALID_EMBEDDED_CONTENT",
  'target.closest("a[href]")',
]);
requireText("Safe Portable Text rendering", richMarks, [
  "safePortableHref",
  'href.startsWith("//")',
  '["http:", "https:", "mailto:"]',
  'rel: "noreferrer noopener"',
]);
requireText("Theme and logout isolation", themeToggle, ['type="button"', "localStorage.setItem"]);
requireText("Logout action", authControls, ['type="submit"', "signOutAction"]);
requireText("Root UI mounting", layout, ['<ThemeToggle />', '<NavigationSafety />', 'import "./theme-hitbox-fix.css"']);
requireText("Safe PWA registration", pwaRegistrar, [
  "const nextRegistration = await navigator.serviceWorker.register",
  "if (disposed || !nextRegistration) return",
  'typeof nextRegistration.update === "function"',
  "nextRegistration.update().catch",
  'process.env.NODE_ENV !== "production"',
]);
if (/await\s+registration\.update\(\)/.test(pwaRegistrar)) {
  failures.push("PWA registrar nuk duhet të thërrasë update() pa verifikuar objektin e regjistrimit.");
}
requireText("Session-safe progress identity", progressClient, [
  "export function clearProgressUserCache",
  "getSignedInUser(forceRefresh = false)",
  'denied.error === "PROGRESS_USER_MISMATCH"',
  "clearProgressUserCache();",
  "response = await sendProgressRequest(body, true)",
  'credentials: "same-origin"',
]);
if (/value \? 5 \* 60_000 : 30_000/.test(progressClient)) {
  failures.push("Identiteti bosh i progresit nuk duhet të ruhet 30 sekonda pas kyçjes ose regjistrimit.");
}
requireText("Private PWA handling", serviceWorker, [
  'const PRIVATE_PATHS = ["/api/", "/auth/", "/progress"]',
  "networkFirstNavigation(request)",
  'url.hostname.endsWith("api.sanity.io")',
  'credentials: "omit"',
]);
requireText("PWA manifest", manifestSource, [
  'start_url: "/"', 'scope: "/"', 'display: "standalone"', 'src: "/icon.svg"', 'url: "/#klasat"', 'url: "/progress"',
]);

for (const requiredFile of ["app/manifest.ts", "public/sw.js", "public/icon.svg"]) {
  if (!existsSync(path.join(root, requiredFile))) failures.push(`${requiredFile} mungon.`);
}

const scripts = packageJson.scripts || {};
const preparePortal = String(scripts["prepare:portal"] || "");
if (!preparePortal.includes("align-sanity-v2.mjs")) failures.push("prepare:portal nuk e harmonizon portalin me schema-n Sanity V2.");
if (!preparePortal.includes("add-rich-text-marks.mjs")) failures.push("prepare:portal nuk gjeneron rich-text marks.");
if (!preparePortal.includes("harden-admin-editor.mjs")) failures.push("prepare:portal nuk aplikon mbrojtjet e editorit të adminit.");
if (!String(scripts["audit:app"] || "").includes("audit:smoothness")) failures.push("audit:app nuk e përfshin auditimin e smoothness-it.");
checks.push("Package scripts");

console.log("Full application smoothness audit");
console.log(`- ${checks.length} audit groups checked`);
console.log(`- Sanity project: ${projectIds[0] || "unknown"}`);
console.log(`- Sanity dataset: ${datasets[0] || "unknown"}`);

if (failures.length) {
  console.error("\nFull application smoothness audit failed:");
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Full application smoothness audit passed.");
