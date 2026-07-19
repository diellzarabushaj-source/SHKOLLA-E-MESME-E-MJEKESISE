import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const baseURL = (process.env.E2E_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const outputDir = "artifacts/admin-image-paste-audit";
mkdirSync(outputDir, { recursive: true });

const assetRef = "image-0123456789abcdef-2x2-png";
const assetUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M/wn4GBgYGJAQoAHgQCAf3C6i8AAAAASUVORK5CYII=";
let savedPayload = null;
let uploadCount = 0;
const consoleErrors = [];

const lesson = {
  _id: "admin-audit-lesson",
  _rev: "image-paste-revision-1",
  title: "Mësimi provues i administratorit",
  body: [{
    _key: "paste-paragraph",
    _type: "block",
    style: "normal",
    markDefs: [],
    children: [{ _key: "paste-span", _type: "span", text: "Ngjite fotografinë pas këtij teksti.", marks: [] }],
  }],
};

function assert(value, message) {
  if (!value) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
let page = null;
try {
  const context = await browser.newContext({ viewport: { width: 1365, height: 960 }, serviceWorkers: "block" });

  await context.route("**/api/admin/assets/images", async (route) => {
    uploadCount += 1;
    assert(route.request().method() === "POST", "Image upload did not use POST");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ assetRef, url: assetUrl, originalFilename: "clipboard-test.png" }),
    });
  });

  await context.route("**/api/admin/lessons/admin-audit-lesson", async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ lesson }) });
      return;
    }
    if (request.method() === "PATCH") {
      savedPayload = request.postDataJSON();
      const savedLesson = { ...lesson, _rev: "image-paste-revision-2", body: savedPayload.body };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ lesson: savedLesson }) });
      return;
    }
    await route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ error: "METHOD_NOT_ALLOWED" }) });
  });

  page = await context.newPage();
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(`${baseURL}/admin-audit`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.getByRole("button", { name: "Edito mësimin" }).click();
  const editor = page.getByRole("textbox", { name: "Përmbajtja e Mësimi provues i administratorit" });
  await editor.waitFor({ state: "visible", timeout: 10_000 });

  await editor.evaluate((element) => {
    element.focus();
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const bytes = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M/wn4GBgYGJAQoAHgQCAf3C6i8AAAAASUVORK5CYII="), (char) => char.charCodeAt(0));
    const file = new File([bytes], "clipboard-test.png", { type: "image/png" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: transfer }));
  });

  await page.getByText("Fotografia u ngarkua në Sanity dhe u vendos në mësim.").waitFor({ timeout: 10_000 });
  const pastedFigure = editor.locator('figure[data-sanity-asset-ref="image-0123456789abcdef-2x2-png"]');
  await pastedFigure.waitFor({ state: "visible", timeout: 10_000 });
  assert(uploadCount === 1, `Expected one image upload, received ${uploadCount}`);

  const saveButton = page.getByRole("button", { name: "Ruaj në Sanity" }).first();
  assert(await saveButton.isEnabled(), "Save did not enable after image paste");
  await saveButton.click();
  await page.getByText("Teksti u ruajt dhe u publikua në Sanity.").waitFor({ timeout: 10_000 });

  const serialized = JSON.stringify(savedPayload?.body || []);
  assert(serialized.includes('"_type":"image"'), "Saved Portable Text does not contain an image node");
  assert(serialized.includes(assetRef), "Saved Portable Text lost the Sanity asset reference");
  assert(serialized.includes("clipboard-test.png"), "Saved Portable Text lost image alt text");
  assert(consoleErrors.length === 0, `Image paste emitted browser errors: ${consoleErrors.join(" | ")}`);

  await page.screenshot({ path: `${outputDir}/admin-image-paste.png`, fullPage: true });
  writeFileSync(`${outputDir}/report.json`, JSON.stringify({ uploadCount, savedPayload, consoleErrors }, null, 2));
  await context.close();
} catch (error) {
  if (page) await page.screenshot({ path: `${outputDir}/admin-image-paste-failure.png`, fullPage: true }).catch(() => undefined);
  throw error;
} finally {
  await browser.close();
}

console.log("Administrator image paste audit passed clipboard upload, inline placement, Sanity asset reference and Portable Text save.");
