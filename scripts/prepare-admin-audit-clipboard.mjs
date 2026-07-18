import { readFileSync, writeFileSync } from "node:fs";

const path = "scripts/e2e-admin-editor.mjs";
let source = readFileSync(path, "utf8");

const pastePattern = /  await editor\.focus\(\);\n  await page\.evaluate\(\(\) => \{[\s\S]*?\n  \}\);\n\n  const htmlAfterPaste/;
const pasteReplacement = `  await editor.focus();
  await page.evaluate(() => {
    const target = document.querySelector('[contenteditable="true"]');
    if (!(target instanceof HTMLElement)) throw new Error("Editor missing");

    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const unsafeScript = "<scr" + "ipt>window.__unsafe=1</scr" + "ipt>";
    const unsafeFrame = "<ifr" + "ame src=\\"https://example.com\\"></ifr" + "ame>";
    const unsafeLink = "<a href=\\"java" + "script:alert(1)\\">Lidhje e keqe</a>";
    const transfer = new DataTransfer();
    transfer.setData("text/html", "<h1>Paste i sigurt</h1><p>Tekst <strong>trashë</strong> <em>italik</em>.</p>" + unsafeScript + unsafeFrame + unsafeLink);
    transfer.setData("text/plain", "Paste i sigurt Tekst trashë italik. Lidhje e keqe");

    const pasteEvent = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvent, "clipboardData", { value: transfer });
    target.dispatchEvent(pasteEvent);
  });

  const htmlAfterPaste`;

if (!pastePattern.test(source)) throw new Error("Synthetic paste block was not found");
source = source.replace(pastePattern, pasteReplacement);

for (const marker of ["Object.defineProperty", "clipboardData", "selection?.addRange(range)"]) {
  if (!source.includes(marker)) throw new Error(`Prepared administrator audit is missing ${marker}`);
}

writeFileSync(path, source);
console.log("Prepared administrator audit with explicit clipboard data.");
