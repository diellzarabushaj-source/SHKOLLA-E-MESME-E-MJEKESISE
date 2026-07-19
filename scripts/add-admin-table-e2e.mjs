import { readFileSync, writeFileSync } from "node:fs";

const path = "scripts/e2e-admin-editor.mjs";
const marker = "admin-table-paste-e2e-v1";
let source = readFileSync(path, "utf8");

if (source.includes(marker)) {
  console.log("Administrator table-paste browser checks are already installed.");
  process.exit(0);
}

function replaceRequired(label, before, after) {
  if (!source.includes(before)) throw new Error(`${label}: source pattern was not found`);
  source = source.replace(before, after);
}

replaceRequired(
  "table paste test helper",
  `async function pasteTestImage(editor) {
  await editor.evaluate((element, pngBase64) => {
    const bytes = Uint8Array.from(atob(pngBase64), (character) => character.charCodeAt(0));
    const file = new File([bytes], "paste-test.png", { type: "image/png", lastModified: Date.now() });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: dataTransfer });
    element.dispatchEvent(event);
  }, onePixelPng);
}`,
  `async function pasteTestImage(editor) {
  await editor.evaluate((element, pngBase64) => {
    const bytes = Uint8Array.from(atob(pngBase64), (character) => character.charCodeAt(0));
    const file = new File([bytes], "paste-test.png", { type: "image/png", lastModified: Date.now() });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: dataTransfer });
    element.dispatchEvent(event);
  }, onePixelPng);
}

// ${marker}
async function pasteTestTable(editor) {
  await editor.evaluate((element) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/html", ` + "`" + `<table><thead><tr><th>Organi</th><th>Funksioni</th></tr></thead><tbody><tr><td>Zemra</td><td>Pompon gjakun</td></tr></tbody></table>` + "`" + `);
    dataTransfer.setData("text/plain", "Organi\\tFunksioni\\nZemra\\tPompon gjakun");
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: dataTransfer });
    element.dispatchEvent(event);
  });
}`,
);

replaceRequired(
  "table paste browser interaction",
  `  assert(await saveButton.isEnabled(), "Save did not enable after pasted image upload");

  await saveButton.click();`,
  `  assert(await saveButton.isEnabled(), "Save did not enable after pasted image upload");

  await placeCaretAtEnd(page);
  await pasteTestTable(editor);
  const pastedTable = editor.locator('[data-portable-table="true"]');
  await pastedTable.waitFor({ state: "visible", timeout: 5_000 });
  assert(await pastedTable.locator("th").count() === 2, "Pasted table lost its header cells");
  assert(await pastedTable.locator("td").count() === 2, "Pasted table lost its body cells");
  assert((await pastedTable.textContent())?.includes("Pompon gjakun"), "Pasted table lost cell text");
  await page.getByText("Tabela u ngjit. Ruaje mësimin për ta publikuar.").waitFor({ state: "visible", timeout: 5_000 });
  assert(await saveButton.isEnabled(), "Save did not remain enabled after table paste");

  await saveButton.click();`,
);

replaceRequired(
  "table Portable Text assertions",
  `  assert(serialized.includes('"_ref":"image-auditasset-1x1-png"'), "Portable Text payload lost pasted Sanity asset reference");`,
  `  assert(serialized.includes('"_ref":"image-auditasset-1x1-png"'), "Portable Text payload lost pasted Sanity asset reference");
  assert(serialized.includes('"_type":"lessonTable"'), "Portable Text payload lost pasted table block");
  assert(serialized.includes('"_type":"lessonTableRow"'), "Portable Text payload lost table rows");
  assert(serialized.includes('"_type":"lessonTableCell"'), "Portable Text payload lost table cells");
  assert(serialized.includes("Pompon gjakun"), "Portable Text payload lost table cell text");`,
);

replaceRequired(
  "table refresh assertion",
  `  assert(await editor.locator("img").count() === 1, "Saved pasted image did not survive the Sanity refresh");`,
  `  assert(await editor.locator("img").count() === 1, "Saved pasted image did not survive the Sanity refresh");
  assert(await editor.locator('[data-portable-table="true"]').count() === 1, "Saved pasted table did not survive the Sanity refresh");`,
);

replaceRequired(
  "browser audit completion message",
  `console.log("Administrator browser audit passed access control, rich-text formatting, direct clipboard image upload, Portable Text image save, revision conflict and refresh checks.");`,
  `console.log("Administrator browser audit passed access control, rich-text formatting, direct clipboard image and table paste, Portable Text saves, revision conflict and refresh checks.");`,
);

writeFileSync(path, source);
console.log("Installed browser-level administrator table-paste checks.");
