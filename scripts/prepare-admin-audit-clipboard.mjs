import { readFileSync, writeFileSync } from "node:fs";

const path = "scripts/e2e-admin-editor.mjs";
let source = readFileSync(path, "utf8");

source = source.replace(
  '  const context = await browser.newContext({ viewport: { width: 1365, height: 960 }, serviceWorkers: "block" });',
  '  const context = await browser.newContext({ viewport: { width: 1365, height: 960 }, serviceWorkers: "block" });\n  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseURL });',
);

const pastePattern = /  await editor\.focus\(\);\n  await page\.evaluate\(\(\) => \{[\s\S]*?\n  \}\);\n\n  const htmlAfterPaste/;
const pasteReplacement = `  await page.evaluate(async () => {
    const unsafeScript = "<scr" + "ipt>window.__unsafe=1</scr" + "ipt>";
    const unsafeFrame = "<ifr" + "ame src=\\"https://example.com\\"></ifr" + "ame>";
    const unsafeLink = "<a href=\\"java" + "script:alert(1)\\">Lidhje e keqe</a>";
    const html = "<h1>Paste i sigurt</h1><p>Tekst <strong>trashë</strong> <em>italik</em>.</p>" + unsafeScript + unsafeFrame + unsafeLink;
    const text = "Paste i sigurt Tekst trashë italik. Lidhje e keqe";
    const item = new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([text], { type: "text/plain" }),
    });
    await navigator.clipboard.write([item]);
  });

  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Control+V");

  const htmlAfterPaste`;

if (!pastePattern.test(source)) throw new Error("Synthetic paste block was not found");
source = source.replace(pastePattern, pasteReplacement);

for (const marker of ["grantPermissions", "ClipboardItem", 'keyboard.press("Control+V")']) {
  if (!source.includes(marker)) throw new Error(`Prepared administrator audit is missing ${marker}`);
}

writeFileSync(path, source);
console.log("Prepared administrator audit with a real browser clipboard paste.");
