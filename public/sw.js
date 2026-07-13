const VERSION = "medical-portal-v5";
const SHELL_CACHE = `${VERSION}-shell`;
const CONTENT_CACHE = `${VERSION}-content`;
const MEDIA_CACHE = `${VERSION}-media`;
const DB_NAME = "medical-portal-offline";
const DB_VERSION = 1;
const QUEUE_STORE = "progress-queue";

const PRECACHE = ["/", "/offline", "/manifest.webmanifest", "/icon.svg"];
const PRIVATE_PATHS = ["/api/", "/auth/", "/progress"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("medical-portal-") && ![SHELL_CACHE, CONTENT_CACHE, MEDIA_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      )),
      self.clients.claim(),
      flushProgressQueue(),
    ]),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "FLUSH_PROGRESS_QUEUE") event.waitUntil(flushProgressQueue());
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-progress") event.waitUntil(flushProgressQueue());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method === "POST" && url.origin === self.location.origin && url.pathname === "/api/progress") {
    event.respondWith(networkOrQueueProgress(request));
    return;
  }

  if (request.method !== "GET") return;

  if (url.origin === self.location.origin) {
    if (PRIVATE_PATHS.some((path) => url.pathname.startsWith(path))) {
      event.respondWith(fetch(request));
      return;
    }

    if (request.mode === "navigate") {
      event.respondWith(networkFirstNavigation(request));
      return;
    }

    if (url.pathname.startsWith("/_next/static/") || url.pathname.endsWith(".css") || url.pathname.endsWith(".js") || url.pathname.endsWith(".woff2")) {
      event.respondWith(cacheFirst(request, SHELL_CACHE));
      return;
    }

    if (request.destination === "image" || request.destination === "font") {
      event.respondWith(staleWhileRevalidate(request, MEDIA_CACHE));
      return;
    }
  }

  const isSanity = url.hostname.endsWith("api.sanity.io") || url.hostname.endsWith("apicdn.sanity.io") || url.hostname.endsWith("cdn.sanity.io");
  if (isSanity) {
    const cacheName = request.destination === "image" ? MEDIA_CACHE : CONTENT_CACHE;
    event.respondWith(staleWhileRevalidate(request, cacheName));
  }
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(CONTENT_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await caches.match("/")) || (await caches.match("/offline"));
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request).then(async (response) => {
    if (response.ok || response.type === "opaque") await cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || (await network) || new Response("Offline", { status: 503 });
}

async function networkOrQueueProgress(request) {
  try {
    const response = await fetch(request.clone());
    if (response.ok || response.status === 400 || response.status === 401) return response;
    throw new Error(`Progress request failed: ${response.status}`);
  } catch {
    const payload = await request.clone().json();
    let responsePayload = { ok: true, queued: true };

    if (payload.action === "start-session") {
      const sessionId = crypto.randomUUID();
      payload.sessionId = sessionId;
      responsePayload = { id: sessionId, queued: true };
    }

    await enqueueProgress({
      url: request.url,
      body: JSON.stringify(payload),
      headers: Array.from(request.headers.entries()),
      createdAt: Date.now(),
    });
    try {
      await self.registration.sync.register("sync-progress");
    } catch {
      // Background Sync is not available in every browser; online/message events also flush the queue.
    }

    return new Response(JSON.stringify(responsePayload), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function openQueueDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE, { keyPath: "id", autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function enqueueProgress(entry) {
  const db = await openQueueDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readwrite");
    transaction.objectStore(QUEUE_STORE).add(entry);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function queuedProgress() {
  const db = await openQueueDb();
  const entries = await new Promise((resolve, reject) => {
    const request = db.transaction(QUEUE_STORE, "readonly").objectStore(QUEUE_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return entries.sort((a, b) => a.id - b.id);
}

async function deleteQueuedProgress(id) {
  const db = await openQueueDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readwrite");
    transaction.objectStore(QUEUE_STORE).delete(id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function flushProgressQueue() {
  const entries = await queuedProgress();
  for (const entry of entries) {
    try {
      const response = await fetch(entry.url, {
        method: "POST",
        credentials: "include",
        headers: new Headers(entry.headers),
        body: entry.body,
      });
      if (response.ok || response.status === 400) {
        await deleteQueuedProgress(entry.id);
        continue;
      }
      if (response.status === 401) break;
      break;
    } catch {
      break;
    }
  }
}
