import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const groups = [];

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!existsSync(absolute)) {
    failures.push(`${relativePath} mungon.`);
    return "";
  }
  return readFileSync(absolute, "utf8");
}

function requireAll(label, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) failures.push(`${label}: mungon ${JSON.stringify(token)}.`);
  }
  groups.push(label);
}

function reject(label, source, patterns) {
  for (const pattern of patterns) {
    if (pattern.test(source)) failures.push(`${label}: u gjet model i pasigurt ${pattern}.`);
  }
}

const packageSource = read("package.json");
const packageJson = JSON.parse(packageSource || "{}");
const nextConfig = read("next.config.mjs");
const layout = read("app/layout.tsx");
const manifest = read("app/manifest.ts");
const serviceWorker = read("public/sw.js");
const classicPortal = read("app/ClassicLearningPortal.tsx");
const generatedPortal = read("app/SchoolLearningPortal.tsx");
const buildPortal = read("scripts/build-schoolv2-portal-v2.mjs");
const illustrationInstaller = read("scripts/add-anatomy-heart-card.mjs");
const illustrationAudit = read("scripts/audit-anatomy-heart.mjs");
const authServer = read("lib/auth/server.ts");
const adminServer = read("lib/admin/server.ts");
const adminRoute = read("app/api/admin/lessons/[lessonId]/route.ts");
const progressRoute = read("app/api/progress/route.ts");
const progressClient = read("lib/progress/client.ts");
const authControls = read("app/AuthControls.tsx");

requireAll("Build pipeline", packageSource + buildPortal + illustrationInstaller, [
  '"prepare:portal"',
  "build-schoolv2-portal-v2.mjs",
  "add-anatomy-heart-card.mjs",
  '"app/ClassicLearningPortal.tsx"',
  '"app/SchoolLearningPortal.tsx"',
  "for (const portalPath of portalPaths) patchPortal(portalPath)",
]);

const preparePortal = String(packageJson.scripts?.["prepare:portal"] || "");
const generatorIndex = preparePortal.indexOf("build-schoolv2-portal-v2.mjs");
const illustrationIndex = preparePortal.indexOf("add-anatomy-heart-card.mjs");
if (generatorIndex < 0 || illustrationIndex < 0 || generatorIndex >= illustrationIndex) {
  failures.push("Build pipeline: figura e lëndës duhet të aplikohet pasi gjenerohet portali i prodhimit.");
}

const portalRequirements = [
  'projectId: "u5d5zn7n"',
  'dataset: "schoolv2"',
  "flashcards[isActive != false]",
  "normalizeCards",
  "lessonDetailsQuery",
  "pushPortalHistory",
  "cardIllustration?: SanityImage",
  "cardIllustration {",
  "subject.cardIllustration?.asset?.url",
  "subject-icon-illustration",
  "?w=240&fit=max&auto=format",
];
requireAll("Generated production portal", generatedPortal, portalRequirements);
requireAll("Portal source template", classicPortal, [
  "cardIllustration?: SanityImage",
  "cardIllustration {",
  "subject.cardIllustration?.asset?.url",
  "subject-icon-illustration",
]);
requireAll("Illustration regression audit", illustrationAudit, [
  '"app/ClassicLearningPortal.tsx"',
  '"app/SchoolLearningPortal.tsx"',
  "portalRequirements",
]);

if (generatedPortal.trim().startsWith("export { default }")) {
  failures.push("Generated production portal nuk u ndërtua; ende është vetëm re-export.");
}
if (generatedPortal.length < 20_000) failures.push("Generated production portal duket i paplotë.");

requireAll("Security headers", nextConfig, [
  'X-Content-Type-Options", value: "nosniff',
  'X-Frame-Options", value: "DENY',
  'Referrer-Policy", value: "strict-origin-when-cross-origin',
  'Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy", value: "same-origin',
  'Strict-Transport-Security", value: "max-age=31536000; includeSubDomains',
  'X-DNS-Prefetch-Control", value: "off',
  'X-Permitted-Cross-Domain-Policies", value: "none',
  "poweredByHeader: false",
  "productionBrowserSourceMaps: false",
]);

requireAll("Metadata and accessibility", layout, [
  '<html lang="sq"',
  'className="skip-link"',
  'href="#main-content"',
  'id="main-content"',
  'manifest: "/manifest.webmanifest"',
  "metadataBase: siteUrl",
  "robots: { index: true, follow: true",
  '<NavigationSafety />',
]);
requireAll("PWA manifest", manifest, [
  'start_url: "/"',
  'scope: "/"',
  'display: "standalone"',
  'url: "/#klasat"',
  'url: "/progress"',
]);
requireAll("Session-safe service worker", serviceWorker, [
  'const PRIVATE_PATHS = ["/api/", "/auth/", "/progress"]',
  "networkFirstNavigation(request)",
  'credentials: "omit"',
  'url.hostname.endsWith("api.sanity.io")',
  'credentials: "include"',
]);
reject("Service worker privacy", serviceWorker, [
  /cache\.put\([^\n]*\/auth\//,
  /cache\.put\([^\n]*\/progress/,
]);

requireAll("Authentication", authServer + authControls, [
  "sessionDataTtl: 1",
  "NEON_AUTH_COOKIE_SECRET",
  "authClient.useSession()",
  "authClient.signOut()",
  "window.location.replace",
]);
requireAll("Administrator boundary", adminServer + adminRoute, [
  'import "server-only"',
  'const ADMIN_PROVIDER = "google"',
  "user.emailVerified === true",
  "providers.length === 1",
  "await requireAdminUser()",
  "isSameOriginRequest(request)",
  'const noStoreHeaders = { "Cache-Control": "no-store" }',
]);
requireAll("Progress isolation", progressRoute + progressClient, [
  "requireUserId()",
  "body.clientUserId !== userId",
  "PROGRESS_USER_MISMATCH",
  'credentials: "same-origin"',
  "clearProgressUserCache",
]);

for (const assetPath of ["public/icon.svg", "public/assets/anatomy-heart.webp"]) {
  const absolute = path.join(root, assetPath);
  if (!existsSync(absolute)) failures.push(`${assetPath} mungon.`);
  else if (statSync(absolute).size > 250_000) failures.push(`${assetPath} është tepër i madh për një asset të portalit.`);
}
groups.push("Static assets");

const publicClientSurface = [layout, manifest, serviceWorker, classicPortal, generatedPortal, authControls].join("\n");
reject("Public client surface", publicClientSurface, [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /sk-[A-Za-z0-9_-]{20,}/,
  /SANITY_API_WRITE_TOKEN\s*=/,
  /NEON_AUTH_COOKIE_SECRET\s*=/,
]);

const smoothness = String(packageJson.scripts?.["audit:smoothness"] || "");
if (!smoothness.includes("audit-full-project.mjs")) failures.push("audit:smoothness nuk e ekzekuton auditimin e plotë.");
if (!String(packageJson.scripts?.["audit:app"] || "").includes("audit:smoothness")) failures.push("audit:app nuk e përfshin auditimin e plotë.");
groups.push("Audit orchestration");

console.log("Full project audit");
console.log(`- ${groups.length} audit groups checked`);
console.log("- frontend, generated portal, authentication, admin, progress, PWA, security, accessibility and assets");

if (failures.length) {
  console.error("\nFull project audit failed:");
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Full project audit passed.");
