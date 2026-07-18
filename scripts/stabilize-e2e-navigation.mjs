import { readFileSync, writeFileSync } from "node:fs";

const filePath = "scripts/e2e-navigation.mjs";
let source = readFileSync(filePath, "utf8");
let changed = false;

const oldSequence = '  await page.evaluate(() => localStorage.removeItem("medical-portal-selected-grade"));\n  await page.reload({ waitUntil: "domcontentloaded" });';
const stableSequence = '  await stableEvaluate(page, () => localStorage.removeItem("medical-portal-selected-grade"));\n  try {\n    await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });\n  } catch (error) {\n    if (!String(error).includes("ERR_ABORTED")) throw error;\n    await page.waitForLoadState("domcontentloaded").catch(() => {});\n  }';

if (source.includes(oldSequence)) {
  source = source.replace(oldSequence, stableSequence);
  changed = true;
} else if (source.includes('  await page.evaluate(() => localStorage.removeItem("medical-portal-selected-grade"));')) {
  source = source.replace(
    '  await page.evaluate(() => localStorage.removeItem("medical-portal-selected-grade"));',
    '  await stableEvaluate(page, () => localStorage.removeItem("medical-portal-selected-grade"));',
  );
  changed = true;
}

if (!source.includes("e2e-navigation-stability-v2")) {
  const anchor = "const failures = [];";
  if (!source.includes(anchor)) throw new Error("E2E failures anchor was not found");
  source = source.replace(anchor, `${anchor}\n\n// e2e-navigation-stability-v2\nasync function stableEvaluate(page, callback, argument) {\n  let lastError;\n  for (let attempt = 0; attempt < 3; attempt += 1) {\n    try {\n      return argument === undefined\n        ? await page.evaluate(callback)\n        : await page.evaluate(callback, argument);\n    } catch (error) {\n      lastError = error;\n      const message = String(error);\n      if (!message.includes("Execution context was destroyed") && !message.includes("Cannot find context")) throw error;\n      await page.waitForLoadState("domcontentloaded").catch(() => {});\n      await page.waitForTimeout(120);\n    }\n  }\n  throw lastError;\n}`);
  changed = true;
}

const replacements = [
  [
    'const baselineHistory = await page.evaluate(() => history.length).catch(() => 0);',
    'const baselineHistory = await stableEvaluate(page, () => history.length).catch(() => 0);',
  ],
  [
    'await page.evaluate((gradeId) => localStorage.setItem("medical-portal-selected-grade", gradeId), nested.gradeId);',
    'await stableEvaluate(page, (gradeId) => localStorage.setItem("medical-portal-selected-grade", gradeId), nested.gradeId);',
  ],
  [
    'const finalHistory = await page.evaluate(() => history.length);',
    'const finalHistory = await stableEvaluate(page, () => history.length);',
  ],
];

for (const [find, replacement] of replacements) {
  if (source.includes(find)) {
    source = source.replaceAll(find, replacement);
    changed = true;
  }
}

if (!source.includes(stableSequence)) {
  throw new Error("E2E initial navigation sequence was not found");
}
if (!source.includes("stableEvaluate(page")) {
  throw new Error("E2E context-safe evaluation was not installed");
}

if (changed) writeFileSync(filePath, source);
process.stdout.write(changed
  ? "Installed service-worker-safe navigation and context-retry evaluation.\n"
  : "E2E navigation is already stable.\n");
