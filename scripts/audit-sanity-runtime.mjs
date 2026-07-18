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
const serviceWorker = read("public/sw.js");
const registrar = read("app/PwaRegistrar.tsx");
const hardener = read("scripts/harden-sanity-runtime.mjs");
const packageJson = JSON.parse(read("package.json") || "{}");

requireText("Generated portal", portal, [
  'projectId: "u5d5zn7n"',
  'dataset: "schoolv2"',
  "useCdn: false",
]);
if (portal.includes("projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID")) {
  failures.push("Portali i gjeneruar nuk duhet të mbështetet në project ID të vjetër nga Vercel environment.");
}
if (portal.includes("dataset: process.env.NEXT_PUBLIC_SANITY_DATASET_V2")) {
  failures.push("Portali i gjeneruar nuk duhet të mbështetet në dataset të vjetër nga Vercel environment.");
}

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

const prepare = String(packageJson.scripts?.["prepare:portal"] || "");
if (!prepare.includes("harden-sanity-runtime.mjs")) failures.push("prepare:portal nuk ekzekuton Sanity runtime hardening.");

if (failures.length) {
  console.error("\nSanity runtime audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Sanity runtime audit passed: correct project, schoolv2 dataset, fresh queries and cache v9.");
