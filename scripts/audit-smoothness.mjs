import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const checks = [];

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!existsSync(absolute)) {
    failures.push(`${relativePath} mungon.`);
    return "";
  }
  return readFileSync(absolute, "utf8");
}

function requireText(label, content, expected) {
  const values = Array.isArray(expected) ? expected : [expected];
  for (const value of values) {
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
const portalBuilder = read("scripts/build-schoolv2-portal-v2.mjs");
const richMarks = read("scripts/add-rich-text-marks.mjs");
const adminHardening = read("scripts/harden-admin-editor.mjs");
const adminIdentity = read("lib/admin/server.ts");
const adminEditor = read("app/LessonAdminEditor.tsx");
const adminRoute = read("app/api/admin/lessons/[lessonId]/route.ts");
const themeToggle = read("app/ThemeToggle.tsx");
const authControls = read("app/AuthControls.tsx");
const layout = read("app/layout.tsx");
const manifestSource = read("app/manifest.ts");
const serviceWorker = read("public/sw.js");

const projectIds = [
  fallbackFor(nextConfig, "NEXT_PUBLIC_SANITY_PROJECT_ID"),
  fallbackFor(writeClient, "NEXT_PUBLIC_SANITY_PROJECT_ID"),
  fallbackFor(portalBuilder, "NEXT_PUBLIC_SANITY_PROJECT_ID"),
].filter(Boolean);
const datasets = [
  fallbackFor(nextConfig, "NEXT_PUBLIC_SANITY_DATASET_V2"),
  fallbackFor(writeClient, "NEXT_PUBLIC_SANITY_DATASET_V2"),
  fallbackFor(portalBuilder, "NEXT_PUBLIC_SANITY_DATASET_V2"),
].filter(Boolean);

if (projectIds.length !== 3 || new Set(projectIds).size !== 1) {
  failures.push(`Sanity project ID nuk është unik në konfigurim: ${JSON.stringify(projectIds)}.`);
}
if (datasets.length !== 3 || new Set(datasets).size !== 1) {
  failures.push(`Sanity dataset nuk është unik në konfigurim: ${JSON.stringify(datasets)}.`);
}
if (!nextConfig.includes("process.env.NEXT_PUBLIC_SANITY_PROJECT_ID")) {
  failures.push("next.config duhet ta respektojë Sanity project ID nga environment-i i deployment-it.");
}
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

requireText("Theme and logout isolation", themeToggle, [
  'type="button"',
  "localStorage.setItem",
]);
requireText("Logout action", authControls, [
  'type="submit"',
  "signOutAction",
]);
requireText("Root UI mounting", layout, [
  '<ThemeToggle />',
  '<NavigationSafety />',
  'import "./theme-hitbox-fix.css"',
]);

requireText("Private PWA handling", serviceWorker, [
  'const PRIVATE_PATHS = ["/api/", "/auth/", "/progress"]',
  "networkFirstNavigation(request)",
  'url.hostname.endsWith("api.sanity.io")',
  'credentials: "omit"',
]);
requireText("PWA manifest", manifestSource, [
  'start_url: "/"',
  'scope: "/"',
  'display: "standalone"',
  'src: "/icon.svg"',
  'url: "/#klasat"',
  'url: "/progress"',
]);

for (const requiredFile of ["app/manifest.ts", "public/sw.js", "public/icon.svg"]) {
  if (!existsSync(path.join(root, requiredFile))) failures.push(`${requiredFile} mungon.`);
}

const scripts = packageJson.scripts || {};
if (!String(scripts["prepare:portal"] || "").includes("add-rich-text-marks.mjs")) failures.push("prepare:portal nuk gjeneron rich-text marks.");
if (!String(scripts["prepare:portal"] || "").includes("harden-admin-editor.mjs")) failures.push("prepare:portal nuk aplikon mbrojtjet e editorit të adminit.");
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
