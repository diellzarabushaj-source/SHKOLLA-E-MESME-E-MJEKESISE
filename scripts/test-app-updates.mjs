import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { GET } from "../app/api/app-version/route.ts";

const previousCommit = process.env.VERCEL_GIT_COMMIT_SHA;
try {
  process.env.VERCEL_GIT_COMMIT_SHA = "test-deployment-commit";
  const response = GET();
  assert.deepEqual(await response.json(), { version: "test-deployment-commit" });
  assert.match(response.headers.get("cache-control"), /no-store/);
} finally {
  if (previousCommit === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA;
  else process.env.VERCEL_GIT_COMMIT_SHA = previousCommit;
}

// Exercise the worker lifecycle: an ordinary install must not reload a lesson.
const listeners = new Map();
let activations = 0;
const cache = { async addAll() {}, async put() {} };
runInNewContext(readFileSync("public/sw.js", "utf8"), {
  self: {
    addEventListener(type, listener) { listeners.set(type, listener); },
    async skipWaiting() { activations++; },
  },
  caches: { async open() { return cache; } },
  fetch: async () => new Response("Offline"),
  Request: class { constructor(url, options) { this.url = url; this.options = options; } },
  Response,
  URL,
});
const installation = [];
listeners.get("install")({ waitUntil(promise) { installation.push(promise); } });
await Promise.all(installation);
assert.equal(activations, 0, "An update must wait while the learner is working");
listeners.get("message")({ data: { type: "SKIP_WAITING" } });
assert.equal(activations, 1, "The explicit update action must activate the worker");
console.log("PASS: release checks stay fresh and worker updates wait for the learner.");
