import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { GET } from "../app/api/app-version/route.ts";
import ts from "typescript";

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

// Run the actual registrar with browser lifecycle and React hooks controlled.
const registrar = ts.transpileModule(readFileSync("app/PwaRegistrar.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
async function checkRegistrar({ controlled = false, workerState = null, requestUpdate = false, expectedReloads }) {
  const slots = [];
  const effects = [];
  const workerEvents = new Map();
  let index = 0;
  let mounting = true;
  let reloads = 0;
  const waiting = workerState ? {
    state: workerState,
    postMessage(message) {
      assert.deepEqual(message.type, "SKIP_WAITING");
      this.state = "activated";
      workerEvents.get("controllerchange")();
    },
  } : null;
  const react = {
    useState(initial) {
      const slot = index++;
      if (mounting) slots[slot] = initial;
      return [slots[slot], (value) => { slots[slot] = value; }];
    },
    useRef(initial) {
      const slot = index++;
      if (mounting) slots[slot] = { current: initial };
      return slots[slot];
    },
    useEffect(callback) { if (mounting) effects.push(callback); },
  };
  const moduleExports = {};
  const jsx = (type, props) => ({ type, props });
  runInNewContext(registrar, {
    exports: moduleExports,
    require(name) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name.endsWith(".css")) return { default: {} };
      throw new Error(`Unexpected dependency: ${name}`);
    },
    process: { env: { NODE_ENV: "production" } },
    AbortController,
    document: { visibilityState: "hidden", addEventListener() {}, removeEventListener() {} },
    window: {
      location: { reload() { reloads++; } },
      setInterval() { return 1; }, clearInterval() {},
      addEventListener() {}, removeEventListener() {},
    },
    navigator: {
      onLine: true,
      serviceWorker: {
        controller: controlled ? {} : null,
        async register() { return { waiting, async update() {}, addEventListener() {} }; },
        addEventListener(name, callback) { workerEvents.set(name, callback); },
        removeEventListener() {},
      },
    },
  });
  moduleExports.default({ release: "test-release" });
  const cleanups = effects.map((effect) => effect());
  await new Promise((resolve) => setImmediate(resolve));
  mounting = false;
  index = 0;
  const tree = moduleExports.default({ release: "test-release" });
  if (requestUpdate) {
    const children = tree.props.children;
    const action = children.find((node) => node?.type === "button" && node.props.children === "Përditëso");
    assert.ok(action, "A waiting update must offer an explicit update action");
    action.props.onClick();
  } else {
    workerEvents.get("controllerchange")();
  }
  assert.equal(reloads, expectedReloads);
  cleanups.forEach((cleanup) => cleanup?.());
}
await checkRegistrar({ expectedReloads: 0 });
await checkRegistrar({ controlled: true, expectedReloads: 1 });
await checkRegistrar({ workerState: "installed", requestUpdate: true, expectedReloads: 1 });
await checkRegistrar({ workerState: "activated", requestUpdate: true, expectedReloads: 1 });
console.log("PASS: release checks stay fresh and worker updates wait for the learner.");
