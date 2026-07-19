import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const baseURL = (process.env.E2E_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const outputDir = "artifacts/admin-editor-audit";
const marker = " Kontroll administratori.";
const pastedImageUrl = "https://cdn.sanity.io/images/u5d5zn7n/schoolv2/audit-pasted-image.png";
const pastedImageId = "image-auditasset-1x1-png";
const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
mkdirSync(outputDir, { recursive: true });

let revision = "audit-revision-1";
let patchCount = 0;
let imageUploadCount = 0;
let savedPayload = null;
let currentBody = [
  {
    _key: "audit-heading",
    _type: "block",
    style: "h2",
    markDefs: [],
    children: [{ _key: "audit-heading-span", _type: "span", text: "Titulli provues", marks: [] }],
  },
  {
    _key: "audit-paragraph",
    _type: "block",
    style: "normal",
    markDefs: [],
    children: [{ _key: "audit-paragraph-span", _type: "span", text: "Teksti fillestar i mësimit.", marks: [] }],
  },
];
const consoleErrors = [];

function lesson() {
  return {
    _id: "admin-audit-lesson",
    _rev: revision,
    title: "Mësimi provues i administratorit",
    body: currentBody.map((node) => node._type === "image"
      ? { ...node, assetUrl: pastedImageUrl }
      : node),
  };
}

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function placeCaretAtEnd(page) {
  await page.evaluate(() => {
    const target = document.querySelector('[contenteditable="true"]');
    if (!(target instanceof HTMLElement)) throw new Error("Editor missing");
    target.focus();

    const editableBlocks = target.querySelectorAll("p,h2,h3,h4,blockquote,li");
    const endTarget = editableBlocks.length ? editableBlocks.item(editableBlocks.length - 1) : target;
    const range = document.createRange();
    range.selectNodeContents(endTarget);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
}

async function selectText(page, text) {
  await page.evaluate((needle) => {
    const target = document.querySelector('[contenteditable="true"]');
    if (!(target instanceof HTMLElement)) throw new Error("Editor missing");

    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const value = node.textContent || "";
      const start = value.lastIndexOf(needle);
      if (start < 0) continue;

      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, start + needle.length);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      return;
    }

    throw new Error(`Text not found in editor: ${needle}`);
  }, text);
}

async function pasteTestImage(editor) {
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

const browser = await chromium.launch({ headless: true });
let auditPage = null;
try {
  const context = await browser.newContext({
    viewport: { width: 1365, height: 960 },
    serviceWorkers: "block",
  });

  await context.route("**/api/admin/lessons/admin-audit-lesson", async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ lesson: lesson() }) });
      return;
    }

    if (request.method() === "PATCH") {
      patchCount += 1;
      savedPayload = request.postDataJSON();
      if (patchCount === 2) {
        await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ error: "LESSON_CHANGED_RELOAD" }) });
        return;
      }

      currentBody = savedPayload.body;
      revision = "audit-revision-2";
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ lesson: lesson() }) });
      return;
    }

    await route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ error: "METHOD_NOT_ALLOWED" }) });
  });

  const page = await context.newPage();
  auditPage = page;
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    // The second PATCH intentionally returns 409 to verify revision-conflict recovery.
    if (/Failed to load resource:.*status of 409/i.test(text)) return;
    consoleErrors.push(text);
  });

  const boundaryResponse = await page.request.get(`${baseURL}/api/admin/lessons/admin-boundary-check`);
  assert([401, 403].includes(boundaryResponse.status()), `Unauthenticated admin API returned ${boundaryResponse.status()}`);
  const imageBoundaryResponse = await page.request.post(`${baseURL}/api/admin/assets/images`);
  assert([401, 403].includes(imageBoundaryResponse.status()), `Unauthenticated image upload returned ${imageBoundaryResponse.status()}`);

  await context.route("**/api/admin/assets/images", async (route) => {
    const request = route.request();
    assert(request.method() === "POST", `Image upload used ${request.method()} instead of POST`);
    assert((request.headers()["content-type"] || "").includes("multipart/form-data"), "Image upload was not multipart/form-data");
    imageUploadCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 350));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        asset: {
          _id: pastedImageId,
          url: pastedImageUrl,
          originalFilename: "paste-test.png",
          mimeType: "image/png",
          size: 68,
          metadata: { dimensions: { width: 1, height: 1, aspectRatio: 1 } },
        },
      }),
    });
  });
  await context.route(pastedImageUrl, async (route) => {
    await route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from(onePixelPng, "base64") });
  });

  await page.goto(`${baseURL}/admin-audit`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.getByRole("heading", { name: "Auditimi i editorit të administratorit" }).waitFor();
  await page.getByRole("button", { name: "Edito mësimin" }).click();

  const editor = page.getByRole("textbox", { name: "Përmbajtja e Mësimi provues i administratorit" });
  const saveButton = page.getByRole("button", { name: "Ruaj në Sanity" }).first();
  await editor.waitFor({ state: "visible", timeout: 10_000 });
  assert(await saveButton.isDisabled(), "Save should be disabled before changes");

  await placeCaretAtEnd(page);
  await page.keyboard.type(marker);
  assert(await saveButton.isEnabled(), "Save did not enable after typing");

  await selectText(page, marker.trim());
  await page.getByTitle("Bold").click();
  const formatState = await editor.evaluate((element, needle) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!(node.textContent || "").includes(needle)) continue;
      const parent = node.parentElement;
      const weight = parent ? window.getComputedStyle(parent).fontWeight : "0";
      return {
        html: element.innerHTML,
        bold: weight === "bold" || weight === "bolder" || Number.parseInt(weight, 10) >= 600,
      };
    }
    return { html: element.innerHTML, bold: false };
  }, marker.trim());
  assert(formatState.bold, `Bold formatting was not applied: ${formatState.html}`);

  await placeCaretAtEnd(page);
  await pasteTestImage(editor);
  await editor.locator("[data-image-upload-key]").waitFor({ state: "visible", timeout: 5_000 });
  assert(await saveButton.isDisabled(), "Save stayed enabled while a pasted image was uploading");
  await editor.locator('[data-pasted-sanity-image="true"]').waitFor({ state: "visible", timeout: 10_000 });
  await page.getByText("Fotoja u ngarkua. Ruaje mësimin për ta publikuar.").waitFor({ state: "visible", timeout: 5_000 });
  assert(imageUploadCount === 1, `Expected one pasted image upload, received ${imageUploadCount}`);
  assert(await saveButton.isEnabled(), "Save did not enable after pasted image upload");

  await saveButton.click();
  await page.getByText("Teksti u ruajt dhe u publikua në Sanity.").waitFor({ state: "visible", timeout: 10_000 });
  assert(savedPayload?.revision === "audit-revision-1", "Editor did not send the loaded revision");

  const serialized = JSON.stringify(savedPayload?.body || []);
  assert(serialized.includes("Kontroll administratori."), "Portable Text payload lost typed content");
  assert(serialized.includes('"strong"'), "Portable Text payload lost bold formatting");
  assert(serialized.includes('"_type":"image"'), "Portable Text payload lost pasted image block");
  assert(serialized.includes('"_ref":"image-auditasset-1x1-png"'), "Portable Text payload lost pasted Sanity asset reference");
  assert((await page.locator("[data-admin-audit-revision]").textContent()) === "audit-revision-2", "Parent view did not receive the saved revision");

  await placeCaretAtEnd(page);
  await page.keyboard.type(" Ndryshim me konflikt.");
  await saveButton.click();
  await page.getByText("Mësimi është ndryshuar në Sanity. Rifreskoje përmbajtjen dhe provo përsëri.").waitFor({ state: "visible", timeout: 10_000 });

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Rifresko nga Sanity" }).click();
  await page.getByText("U ngarkua versioni më i ri nga Sanity.").waitFor({ state: "visible", timeout: 10_000 });
  assert(await saveButton.isDisabled(), "Refresh did not clear the dirty state");
  assert(await editor.locator("img").count() === 1, "Saved pasted image did not survive the Sanity refresh");

  await page.screenshot({ path: `${outputDir}/admin-editor-audit.png`, fullPage: true });
  assert(consoleErrors.length === 0, `Admin editor emitted browser errors: ${consoleErrors.join(" | ")}`);

  writeFileSync(
    `${outputDir}/report.json`,
    JSON.stringify({
      boundaryStatus: boundaryResponse.status(),
      imageBoundaryStatus: imageBoundaryResponse.status(),
      patchCount,
      imageUploadCount,
      revision,
      savedPayload,
      consoleErrors,
    }, null, 2),
  );

  await context.close();
} catch (error) {
  if (auditPage) {
    await auditPage.screenshot({ path: `${outputDir}/admin-editor-failure.png`, fullPage: true }).catch(() => undefined);
  }
  throw error;
} finally {
  await browser.close();
}

console.log("Administrator browser audit passed access control, rich-text formatting, direct clipboard image upload, Portable Text image save, revision conflict and refresh checks.");
