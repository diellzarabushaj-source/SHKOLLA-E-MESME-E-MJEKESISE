import { existsSync, readFileSync } from "node:fs";

const failures = [];
function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path} mungon.`);
    return "";
  }
  return readFileSync(path, "utf8");
}
function requireText(label, source, values) {
  for (const value of values) if (!source.includes(value)) failures.push(`${label}: mungon ${JSON.stringify(value)}.`);
}

const portal = read("app/SchoolLearningPortal.tsx");
const nextConfig = read("next.config.mjs");
const sanityConfig = read("lib/sanity/config.ts");
const writeClient = read("lib/sanity/write-client.ts");
const serviceWorker = read("public/sw.js");
const registrar = read("app/PwaRegistrar.tsx");
const hardener = read("scripts/harden-sanity-runtime.mjs");
const pinner = read("scripts/pin-live-sanity.mjs");
const liveDataCheck = read("scripts/check-live-sanity-data.mjs");
const packageJson = JSON.parse(read("package.json") || "{}");

requireText("Generated portal", portal, [
  'projectId: "u5d5zn7n"', 'dataset: "schoolv2"', 'apiVersion: "2026-07-17"',
  "useCdn: false", "SANITY_PORTAL_DATA_INCOMPLETE", "canonical-sanity-schoolv2",
]);
if (portal.includes("projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID")) failures.push("Portali nuk duhet të varet nga project ID i environment-it.");
if (portal.includes("dataset: process.env.NEXT_PUBLIC_SANITY_DATASET_V2")) failures.push("Portali nuk duhet të varet nga dataset-i i environment-it.");

requireText("Canonical constants", sanityConfig, ['SANITY_PROJECT_ID = "u5d5zn7n"', 'SANITY_DATASET = "schoolv2"', 'SANITY_API_VERSION = "2026-07-17"']);
requireText("Write client", writeClient, ["SANITY_PROJECT_ID", "SANITY_DATASET", "SANITY_API_VERSION", "useCdn: false"]);
requireText("Next config", nextConfig, ['const sanityProjectId = "u5d5zn7n"', 'const sanityDataset = "schoolv2"']);
requireText("Service worker", serviceWorker, ['const VERSION = "medical-portal-v9"', "GROQ/query JSON must never be served stale", 'if (request.destination === "image")', "event.respondWith(fetch(request));"]);
if (serviceWorker.includes('const cacheName = request.destination === "image" ? MEDIA_CACHE : CONTENT_CACHE')) failures.push("Service worker-i ende ruan query JSON në cache.");
requireText("PWA registrar", registrar, ['const SERVICE_WORKER_URL = "/sw.js?v=9"']);
requireText("Runtime hardener", hardener, ["fixed Sanity project", "fresh portal reads", "non-stale Sanity query handling"]);
requireText("Final pinner", pinner, ["Canonical Sanity project", "Portal data contract", "SANITY_PORTAL_DATA_INCOMPLETE"]);
requireText("Live hierarchy check", liveDataCheck, ['projectId: "u5d5zn7n"', 'dataset: "schoolv2"', "counts.grades < 3", "counts.subjects < 1", "counts.chapters < 1", "counts.lessons < 1"]);

const prepare = String(packageJson.scripts?.["prepare:portal"] || "");
const runtimeAudit = String(packageJson.scripts?.["audit:sanity-runtime"] || "");
if (!prepare.includes("harden-sanity-runtime.mjs")) failures.push("prepare:portal nuk ekzekuton Sanity hardening.");
if (!prepare.includes("pin-live-sanity.mjs")) failures.push("prepare:portal nuk ekzekuton pinning final.");
if (!runtimeAudit.includes("check-live-sanity-data.mjs")) failures.push("audit:sanity-runtime nuk kontrollon të dhënat live.");

if (failures.length) {
  console.error("\nSanity runtime audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Sanity runtime audit passed: canonical project, complete live hierarchy, fresh queries and cache v9.");
