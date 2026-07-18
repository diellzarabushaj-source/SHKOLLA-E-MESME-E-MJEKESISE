import { readFileSync, writeFileSync } from "node:fs";

const filePath = "scripts/e2e-navigation.mjs";
let source = readFileSync(filePath, "utf8");
const oldNavigation = '  await page.reload({ waitUntil: "domcontentloaded" });';
const stableNavigation = '  await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });';

if (source.includes(stableNavigation)) {
  process.stdout.write("E2E initial navigation is already stable.\n");
  process.exit(0);
}
if (!source.includes(oldNavigation)) throw new Error("E2E reload pattern was not found");

source = source.replace(oldNavigation, stableNavigation);
writeFileSync(filePath, source);
process.stdout.write("Replaced flaky page.reload with deterministic page.goto.\n");
