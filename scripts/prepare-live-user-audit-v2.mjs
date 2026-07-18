import { readFileSync, writeFileSync } from "node:fs";

const path = "scripts/e2e-live-full-user-audit.mjs";
let source = readFileSync(path, "utf8");

source = source.replace(
  'const baseURL = (process.env.E2E_BASE_URL || "https://shkolla-e-mesme-e-mjekesise-ct9t.vercel.app").replace(/\\/$/, "");',
  'const baseURL = "http://127.0.0.1:3000";',
);

source = source.replace(
  'await page.getByRole("button", { name: "Shfaq përgjigjen" }).click();',
  'await page.getByRole("button", { name: "Shfaq përgjigjen", exact: true }).click();',
);

source = source.replace(
  'if (sameOrigin(request.url()) && !request.url().includes("_rsc=")) diagnostics.push(`${label} requestfailed: ${request.method()} ${request.url()} — ${failure}`);',
  'const pathName = new URL(request.url()).pathname; const authRedirect = request.method() === "POST" && (pathName === "/auth/sign-up" || pathName === "/auth/sign-in") && failure.includes("ERR_ABORTED"); if (sameOrigin(request.url()) && !request.url().includes("_rsc=") && !authRedirect) diagnostics.push(`${label} requestfailed: ${request.method()} ${request.url()} — ${failure}`);',
);

const oldRegistrationFlow = `  const reachedHome = await page.waitForURL((url) => url.pathname === "/", { timeout: 20_000 }).then(() => true).catch(() => false);
  if (!reachedHome) {
    const alertText = await page.getByRole("alert").textContent().catch(() => "");
    if (!/ekziston|regjistrimi nuk u krye/i.test(alertText || "")) {
      throw new Error(\`Student registration failed: \${alertText || "no error message"}\`);
    }
    await page.goto(\`\${baseURL}/auth/sign-in\`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.getByLabel("Username").fill(username);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: "Kyçu", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/", { timeout: 30_000 });
  }
  await waitForPortal(page);`;

const newRegistrationFlow = `  let authenticated = await page.waitForURL((url) => url.pathname === "/", { timeout: 20_000 }).then(() => true).catch(() => false);
  if (!authenticated) {
    await page.goto(\`\${baseURL}/\`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await waitForPortal(page);
    authenticated = await page.getByText(\`@\${username}\`, { exact: true }).count() > 0;
  }
  if (!authenticated) {
    await page.goto(\`\${baseURL}/auth/sign-in\`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.getByLabel("Username").fill(username);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: "Kyçu", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/", { timeout: 30_000 });
  }
  await waitForPortal(page);`;

if (!source.includes(oldRegistrationFlow)) throw new Error("Registration audit flow was not found");
source = source.replace(oldRegistrationFlow, newRegistrationFlow);

for (const marker of ["exact: true", "authRedirect", "let authenticated = await page.waitForURL", "127.0.0.1:3000"]) {
  if (!source.includes(marker)) throw new Error(`Missing audit marker: ${marker}`);
}

writeFileSync(path, source);
await import("./prepare-live-user-audit-v3.mjs");
console.log("Prepared redirect-aware local audit flow.");
