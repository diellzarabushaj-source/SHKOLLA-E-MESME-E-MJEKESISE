import { readFileSync, writeFileSync } from "node:fs";

const path = "scripts/e2e-live-full-user-audit.mjs";
let source = readFileSync(path, "utf8");

source = source.replace(
  'if (/favicon|AbortError|ResizeObserver loop/i.test(text)) return;',
  'if (/favicon|AbortError|ResizeObserver loop|Failed to load resource: the server responded with a status of (401|403)/i.test(text)) return;',
);

const oneCardFlow = `      await page.getByRole("button", { name: "Shfaq përgjigjen", exact: true }).click();
      await page.getByRole("button", { name: /Mirë/ }).click();
      await page.getByText("Testi përfundoi").waitFor({ state: "visible", timeout: 20_000 });`;

const fullDeckFlow = `      const totalCards = Number(await page.locator("[data-progress-total-cards]").first().getAttribute("data-progress-total-cards"));
      assert(Number.isInteger(totalCards) && totalCards > 0, "Flashcard total is invalid");
      for (let index = 0; index < totalCards; index += 1) {
        await page.getByRole("button", { name: "Shfaq përgjigjen", exact: true }).click();
        await page.getByRole("button", { name: /^Mirë/ }).click();
      }
      await page.getByText("Testi përfundoi").waitFor({ state: "visible", timeout: 20_000 });`;

if (!source.includes(oneCardFlow)) throw new Error("Single-card audit flow was not found");
source = source.replace(oneCardFlow, fullDeckFlow);

for (const marker of ["const totalCards = Number", "index < totalCards", "status of (401|403)"]) {
  if (!source.includes(marker)) throw new Error(`Missing full-deck audit marker: ${marker}`);
}

writeFileSync(path, source);
console.log("Prepared full flashcard deck and expected auth diagnostics.");
