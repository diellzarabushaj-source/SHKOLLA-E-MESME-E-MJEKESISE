import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const baseURL = (process.env.E2E_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const outputDir = "artifacts/admin-editor-audit";
const marker = " Kontroll administratori.";
mkdirSync(outputDir, { recursive: true });

let revision = "audit-revision-1";
let patchCount = 0;
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
    body: currentBody,
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
    const range = document.createRange();
    range.selectNodeContents(target);
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

const browser = await chromium.launch({ headless: true });
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
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const boundaryResponse = await page.request.get(`${baseURL}/api/admin/lessons/admin-boundary-check`);
  assert([401, 403].includes(boundaryResponse.status()), `Unauthenticated admin API returned ${boundaryResponse.status()}`);

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
  const htmlAfterFormat = await editor.evaluate((element) => element.innerHTML);
  assert(/<strong>[^<]*Kontroll administratori\./.test(htmlAfterFormat), `Bold formatting was not applied: ${htmlAfterFormat}`);

  await saveButton.click();
  await page.getByText("Teksti u ruajt dhe u publikua në Sanity.").waitFor({ state: "visible", timeout: 10_000 });
  assert(savedPayload?.revision === "audit-revision-1", "Editor did not send the loaded revision");

  const serialized = JSON.stringify(savedPayload?.body || []);
  assert(serialized.includes("Kontroll administratori."), "Portable Text payload lost typed content");
  assert(serialized.includes('"strong"'), "Portable Text payload lost bold formatting");
  assert((await page.locator("[data-admin-audit-revision]").textContent()) === "audit-revision-2", "Parent view did not receive the saved revision");

  await placeCaretAtEnd(page);
  await page.keyboard.type(" Ndryshim me konflikt.");
  await saveButton.click();
  await page.getByText("Mësimi është ndryshuar në Sanity. Rifreskoje përmbajtjen dhe provo përsëri.").waitFor({ state: "visible", timeout: 10_000 });

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Rifresko nga Sanity" }).click();
  await page.getByText("U ngarkua versioni më i ri nga Sanity.").waitFor({ state: "visible", timeout: 10_000 });
  assert(await saveButton.isDisabled(), "Refresh did not clear the dirty state");

  await page.screenshot({ path: `${outputDir}/admin-editor-audit.png`, fullPage: true });
  assert(consoleErrors.length === 0, `Admin editor emitted browser errors: ${consoleErrors.join(" | ")}`);

  writeFileSync(
    `${outputDir}/report.json`,
    JSON.stringify({ boundaryStatus: boundaryResponse.status(), patchCount, revision, savedPayload, consoleErrors }, null, 2),
  );

  await context.close();
} finally {
  await browser.close();
}

console.log("Administrator browser audit passed access control, editing, formatting, Portable Text save, revision conflict and refresh checks.");
