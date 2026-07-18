import { existsSync, readFileSync } from "node:fs";

const failures = [];
const read = (file) => existsSync(file) ? readFileSync(file, "utf8") : (failures.push(`${file} mungon.`), "");
const requireAll = (label, source, values) => {
  for (const value of values) if (!source.includes(value)) failures.push(`${label}: mungon ${JSON.stringify(value)}.`);
};

const editor = read("app/LessonAdminEditor.tsx");
const route = read("app/api/admin/lessons/[lessonId]/route.ts");
const readClient = read("lib/sanity/read-client.ts");
const hardener = read("scripts/harden-admin-sanity-save.mjs");
const css = read("app/admin-editor-resilience.css");
const packageJson = JSON.parse(read("package.json") || "{}");

requireAll("Admin editor resilience", editor, [
  "admin-sanity-resilience-v1",
  "adminFetch",
  'credentials: "same-origin"',
  "EDITOR_TIMEOUT",
  "EDITOR_TOKEN_INVALID",
  "sanityStudioEditUrl",
  "data-admin-studio-link",
  "data-admin-error-studio",
]);
requireAll("Admin route resilience", route, [
  "admin-sanity-resilience-v1",
  "getSanityReadClient",
  "getSanityWriteClient",
  "sanityStatusCode",
  "EDITOR_TOKEN_INVALID",
  "allowedHosts",
  "allowedProtocols",
]);
requireAll("Public Sanity read client", readClient, [
  "SANITY_PROJECT_ID",
  "SANITY_DATASET",
  'useCdn: false',
  'perspective: "published"',
]);
requireAll("Admin hardening installer", hardener, [
  "admin-sanity-resilience-v1",
  "token-free lesson read",
  "proxy-safe origin validation",
  "Sanity Studio fallback",
]);
requireAll("Admin fallback styling", css, [
  "[data-admin-actions]",
  "[data-admin-studio-link]",
  "[data-admin-error-studio]",
  "@media (max-width: 720px)",
]);

const prepare = String(packageJson.scripts?.["prepare:portal"] || "");
if (!prepare.includes("harden-admin-sanity-save.mjs")) failures.push("prepare:portal nuk e forcon ruajtjen admin/Sanity.");
if (prepare.indexOf("harden-admin-sanity-save.mjs") <= prepare.indexOf("harden-admin-editor.mjs")) {
  failures.push("Ruajtja admin/Sanity duhet të forcohet pas editorit bazë.");
}

if (failures.length) {
  console.error("Administrator save resilience audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Administrator save resilience audit passed.");
