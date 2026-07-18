import { readFileSync, writeFileSync } from "node:fs";

const filePath = "scripts/e2e-navigation.mjs";
let source = readFileSync(filePath, "utf8");
const oldSequence = '  await page.evaluate(() => localStorage.removeItem("medical-portal-selected-grade"));\n  await page.reload({ waitUntil: "domcontentloaded" });';
const stableSequence = '  await page.evaluate(() => localStorage.removeItem("medical-portal-selected-grade"));\n  await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });';

if (source.includes(oldSequence)) {
  source = source.replace(oldSequence, stableSequence);
  writeFileSync(filePath, source);
  process.stdout.write("Replaced flaky page.reload with deterministic page.goto.\n");
  process.exit(0);
}

if (source.includes(stableSequence)) {
  process.stdout.write("E2E initial navigation is already stable.\n");
  process.exit(0);
}

throw new Error("E2E initial navigation sequence was not found");
