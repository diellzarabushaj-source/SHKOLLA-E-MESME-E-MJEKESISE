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
  for (const value of values) {
    if (!source.includes(value)) failures.push(`${label}: mungon ${JSON.stringify(value)}.`);
  }
}

const portal = read("app/SchoolLearningPortal.tsx");
const nextConfig = read("next.config.mjs");
const sanityConfig = read("lib/sanity/config.ts");
const writeClient = read("lib/sanity/write-client.ts");
const serviceWorker = read("public/sw.js");
const registrar = read("app/PwaRegistrar.tsx");
const hardener = read("scripts/harden-sanity-runtime.mjs");
const pinner = read("scripts/pin-live-sanity.mjs");
const packageJson = JSON.parse(read("package.json") || "{}");

requireText("Generated portal", portal, [
  'projectId: "u5d5zn7n"',
  'dataset: "schoolv2"',
  'apiVersion: "2026-07-17"',
  "useCdn: false",
  "SANITY_PORTAL_DATA_INCOMPLETE",
  "canonical-sanity-schoolv2",
]);
if (portal.includes("projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID")) {
  failures.push("Portali i gjeneruar nuk duhet të mbështetet në project ID nga Vercel environment.");
}
if (portal.includes("dataset: process.env.NEXT_PUBLIC_SANITY_DATASET_V2")) {
  failures.push("Portali i gjeneruar nuk duhet të mbështetet në dataset nga Vercel environment.");
}

requireText("Canonical Sanity constants", sanityConfig, [
  'SANITY_PROJECT_ID = "u5d5zn7n"',
  'SANITY_DATASET = "schoolv2"',
  'SANITY_API_VERSION = "2026-07-17"',
]);
requireText("Canonical write client", writeClient, [
  "SANITY_PROJECT_ID",
  "SANITY_DATASET",
  "SANITY_API_VERSION",
  "useCdn: false",
]);
requireText("Next configuration", nextConfig, [
  'const sanityProjectId = "u5d5zn7n"',
  'const sanityDataset = "schoolv2"',
]);

requireText("Service worker", serviceWorker, [
  'const VERSION = "medical-portal-v9"',
  "GROQ/query JSON must never be served stale",
  'if (request.destination === "image")',
  "event.respondWith(fetch(request));",
]);
if (serviceWorker.includes('const cacheName = request.destination === "image" ? MEDIA_CACHE : CONTENT_CACHE')) {
  failures.push("Service worker-i ende ruan query JSON të Sanity në content cache.");
}

requireText("PWA registrar", registrar, ['const SERVICE_WORKER_URL = "/sw.js?v=9"']);
requireText("Runtime hardener", hardener, [
  "fixed Sanity project",
  "fresh portal reads",
  "non-stale Sanity query handling",
]);
requireText("Final runtime pinner", pinner, [
  "Canonical Sanity project",
  "Portal data contract",
  "SANITY_PORTAL_DATA_INCOMPLETE",
]);

const prepare = String(packageJson.scripts?.["prepare:portal"] || "");
if (!prepare.includes("harden-sanity-runtime.mjs")) failures.push("prepare:portal nuk ekzekuton Sanity runtime hardening.");
if (!prepare.includes("pin-live-sanity.mjs")) failures.push("prepare:portal nuk ekzekuton kontrollin final të Sanity kanonik.");

if (failures.length) {
  console.error("\nSanity runtime audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Sanity runtime audit passed: canonical project, schoolv2 dataset, complete portal data, fresh queries and cache v9.");
