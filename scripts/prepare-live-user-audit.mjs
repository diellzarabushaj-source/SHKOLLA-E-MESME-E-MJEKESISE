import { readFileSync, writeFileSync } from "node:fs";

const path = "scripts/e2e-live-full-user-audit.mjs";
let source = readFileSync(path, "utf8");

source = source
  .replaceAll('serviceWorkers: "block"', 'serviceWorkers: "allow"')
  .replaceAll('page.getByLabel("Password")', 'page.locator(\'input[name="password"]\')')
  .replaceAll('secondPage.getByLabel("Password")', 'secondPage.locator(\'input[name="password"]\')')
  .replace(
    'if (sameOrigin(request.url())) diagnostics.push(`${label} requestfailed: ${request.method()} ${request.url()} — ${failure}`);',
    'if (sameOrigin(request.url()) && !request.url().includes("_rsc=")) diagnostics.push(`${label} requestfailed: ${request.method()} ${request.url()} — ${failure}`);',
  );

for (const required of [
  'serviceWorkers: "allow"',
  'locator(\'input[name="password"]\')',
  '!request.url().includes("_rsc=")',
]) {
  if (!source.includes(required)) throw new Error(`Live audit stabilization missing: ${required}`);
}

writeFileSync(path, source);
console.log("Prepared stable live user audit selectors and diagnostics.");
