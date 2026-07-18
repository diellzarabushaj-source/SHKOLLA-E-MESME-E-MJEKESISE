import { readFileSync, writeFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function write(path, source) {
  writeFileSync(path, source);
}

function replaceRequired(source, label, search, replacement) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`${label}: expected source pattern was not found`);
  return source.replace(search, replacement);
}

const portalPath = "app/SchoolLearningPortal.tsx";
let portal = read(portalPath);
portal = replaceRequired(
  portal,
  "fixed Sanity project",
  'projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "u5d5zn7n",',
  'projectId: "u5d5zn7n",',
);
portal = replaceRequired(
  portal,
  "fixed Sanity dataset",
  'dataset: process.env.NEXT_PUBLIC_SANITY_DATASET_V2 || "schoolv2",',
  'dataset: "schoolv2",',
);
portal = replaceRequired(
  portal,
  "fresh portal reads",
  "  useCdn: true,",
  "  useCdn: false,",
);
write(portalPath, portal);

const serviceWorkerPath = "public/sw.js";
let serviceWorker = read(serviceWorkerPath);
serviceWorker = serviceWorker.replace(
  /const VERSION = "medical-portal-v\d+";/,
  'const VERSION = "medical-portal-v9";',
);

const staleSanityBlock = `  const isSanityCdn = url.hostname.endsWith("apicdn.sanity.io") || url.hostname.endsWith("cdn.sanity.io");
  if (isSanityCdn) {
    const cacheName = request.destination === "image" ? MEDIA_CACHE : CONTENT_CACHE;
    event.respondWith(staleWhileRevalidate(request, cacheName));
  }`;
const safeSanityBlock = `  const isSanityCdn = url.hostname.endsWith("apicdn.sanity.io") || url.hostname.endsWith("cdn.sanity.io");
  if (isSanityCdn) {
    // Media may be cached, but GROQ/query JSON must never be served stale.
    if (request.destination === "image") {
      event.respondWith(staleWhileRevalidate(request, MEDIA_CACHE));
    } else {
      event.respondWith(fetch(request));
    }
    return;
  }`;
serviceWorker = replaceRequired(
  serviceWorker,
  "non-stale Sanity query handling",
  staleSanityBlock,
  safeSanityBlock,
);
write(serviceWorkerPath, serviceWorker);

const registrarPath = "app/PwaRegistrar.tsx";
let registrar = read(registrarPath);
registrar = registrar.replace(
  /const SERVICE_WORKER_URL = "\/sw\.js\?v=\d+";/,
  'const SERVICE_WORKER_URL = "/sw.js?v=9";',
);
write(registrarPath, registrar);

for (const [label, source, markers] of [
  ["portal", portal, ['projectId: "u5d5zn7n"', 'dataset: "schoolv2"', "useCdn: false"]],
  ["service worker", serviceWorker, ['medical-portal-v9', "GROQ/query JSON must never be served stale", "event.respondWith(fetch(request))"]],
  ["PWA registrar", registrar, ['const SERVICE_WORKER_URL = "/sw.js?v=9"']]],
) {
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`${label}: missing ${marker}`);
  }
}

console.log("Hardened Sanity runtime: fixed project/dataset, fresh queries and cache v9.");
