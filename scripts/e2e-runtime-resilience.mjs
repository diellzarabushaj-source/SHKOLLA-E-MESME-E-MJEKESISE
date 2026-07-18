import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const outputDir = "artifacts/runtime-resilience-audit";
mkdirSync(outputDir, { recursive: true });

const auditUserId = "d664bdf7-d232-4e52-bc88-60f3a2fc2509";
const jwt = "eyJhbGciOiJub25lIn0.eyJleHAiOjQxMDI0NDQ4MDB9.signature";
let sessionReads = 0;
let progressWrites = 0;
const payloads = [];
const browserErrors = [];

function assert(value, message) {
  if (!value) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 900, height: 700 },
    serviceWorkers: "block",
  });

  await context.route("**/api/auth/get-session**", async (route) => {
    sessionReads += 1;
    if (sessionReads === 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ session: null, user: null }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        session: {
          id: "runtime-audit-session",
          token: jwt,
          userId: auditUserId,
          expiresAt: "2100-01-01T00:00:00.000Z",
        },
        user: {
          id: auditUserId,
          name: "qa.portal.audit",
          email: "qa.portal.audit@users.mjekesi-peje.com",
          emailVerified: false,
        },
      }),
    });
  });

  await context.route("**/api/progress", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
      return;
    }

    progressWrites += 1;
    const body = request.postDataJSON();
    payloads.push(body);

    if (progressWrites === 1) {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "PROGRESS_USER_MISMATCH" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sessionId: "runtime-heartbeat-ok" }),
    });
  });

  const page = await context.newPage();
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  await page.goto(`${baseURL}/runtime-audit`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.getByRole("heading", { name: "Auditimi i sesionit dhe PWA-së" }).waitFor();

  await page.getByRole("button", { name: "Përgatit cache-in bosh" }).click();
  await page.getByText("Cache-i bosh u përgatit").waitFor({ state: "visible", timeout: 10_000 });

  await page.getByRole("button", { name: "Dërgo heartbeat" }).click();
  await page.getByText("Heartbeat u ruajt: runtime-heartbeat-ok").waitFor({ state: "visible", timeout: 10_000 });

  assert(sessionReads === 2, `Expected two session reads, received ${sessionReads}`);
  assert(progressWrites === 2, `Expected one mismatch and one retry, received ${progressWrites} writes`);
  assert(payloads[0]?.clientUserId === null, `First request should use stale empty identity: ${JSON.stringify(payloads[0])}`);
  assert(payloads[1]?.clientUserId === auditUserId, `Retry did not use refreshed identity: ${JSON.stringify(payloads[1])}`);
  assert(browserErrors.length === 0, `Runtime emitted browser errors: ${browserErrors.join(" | ")}`);

  await page.screenshot({ path: `${outputDir}/runtime-resilience.png`, fullPage: true });
  writeFileSync(`${outputDir}/report.json`, JSON.stringify({ sessionReads, progressWrites, payloads, browserErrors }, null, 2));
  await context.close();
} finally {
  await browser.close();
}

console.log("Runtime resilience passed stale-session retry and blocked-service-worker audits.");
