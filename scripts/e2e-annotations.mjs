import { randomUUID } from "node:crypto";
import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
let records = [];

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function installApi(context) {
  await context.route("**/api/annotations**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const now = new Date().toISOString();

    if (request.method() === "GET") {
      const lessonId = url.searchParams.get("lessonId");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ annotations: records.filter((item) => item.lessonId === lessonId) }) });
      return;
    }

    if (request.method() === "POST") {
      const body = request.postDataJSON();
      const existing = records.find((item) => item.lessonId === body.lessonId && item.kind === body.kind && item.blockKey === body.blockKey && item.startOffset === body.startOffset && item.endOffset === body.endOffset);
      const annotation = { ...body, id: existing?.id || randomUUID(), createdAt: existing?.createdAt || now, updatedAt: now };
      records = [...records.filter((item) => item.id !== annotation.id), annotation];
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ annotation }) });
      return;
    }

    if (request.method() === "PATCH") {
      const body = request.postDataJSON();
      const current = records.find((item) => item.id === body.id);
      if (!current) {
        await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "ANNOTATION_NOT_FOUND" }) });
        return;
      }
      const annotation = { ...current, ...(body.color ? { color: body.color } : {}), ...(body.noteText !== undefined ? { noteText: body.noteText } : {}), updatedAt: now };
      records = records.map((item) => item.id === annotation.id ? annotation : item);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ annotation }) });
      return;
    }

    if (request.method() === "DELETE") {
      const id = url.searchParams.get("id");
      records = records.filter((item) => item.id !== id);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      return;
    }

    await route.abort();
  });
}

async function selectPhrase(page, phrase) {
  await page.evaluate((selectedText) => {
    const paragraph = document.querySelector("[data-audit-paragraph]");
    const node = paragraph?.firstChild;
    if (!(node instanceof Text)) throw new Error("Audit paragraph text node missing");
    const start = node.data.indexOf(selectedText);
    if (start < 0) throw new Error("Audit phrase missing");
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, start + selectedText.length);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
    document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" }));
  }, phrase);
  await page.locator("[data-annotation-selection-toolbar]").waitFor({ state: "visible", timeout: 5000 });
}

async function openLibrary(page) {
  const button = page.getByRole("button", { name: /Shënimet e mia/ });
  if (await page.locator("#lesson-annotation-library").count() === 0) await button.click();
  await page.locator("#lesson-annotation-library").waitFor({ state: "visible" });
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  await installApi(context);
  const page = await context.newPage();
  await page.goto(`${baseURL}/annotations-audit`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-audit-paragraph]").waitFor({ state: "visible" });

  await selectPhrase(page, "Qeliza është njësia themelore");
  const toolbar = page.locator("[data-annotation-selection-toolbar]");
  const toolbarBox = await toolbar.boundingBox();
  const viewport = page.viewportSize();
  assert(toolbarBox && viewport, "Mobile selection toolbar geometry missing");
  assert(viewport.height - toolbarBox.y - toolbarBox.height >= 70, "Mobile toolbar is not docked above iPhone navigation and safe area");
  const mobileStyle = await toolbar.evaluate((element) => ({ top: getComputedStyle(element).top, bottom: getComputedStyle(element).bottom, transform: getComputedStyle(element).transform }));
  assert(mobileStyle.top === "auto" && mobileStyle.bottom !== "auto" && mobileStyle.transform === "none", "Mobile toolbar still follows the native iPhone selection popup");
  await page.getByRole("button", { name: "Thekso e verdhë" }).click();
  await page.getByText("Teksti u theksua dhe u ruajt privatisht.").waitFor({ state: "visible" });

  await selectPhrase(page, "Membrana kontrollon shkëmbimin");
  await page.getByRole("button", { name: "+ Sticky note" }).click();
  const dialog = page.getByRole("dialog", { name: "Shto sticky note" });
  await dialog.getByRole("textbox").fill("Kjo pjesë duhet përsëritur para testit.");
  await dialog.getByRole("button", { name: "E gjelbër" }).click();
  await dialog.getByRole("button", { name: "Ruaj sticky note" }).click();

  await openLibrary(page);
  assert(await page.locator("#lesson-annotation-library article").count() === 2, "Highlight and sticky note were not both listed");
  const noteCard = page.locator("#lesson-annotation-library article").filter({ hasText: "Sticky note" });
  await noteCard.getByRole("button", { name: "Ndrysho" }).click();
  await noteCard.getByRole("textbox").fill("Shënim i ndryshuar dhe i sinkronizuar.");
  await noteCard.getByRole("button", { name: "Ruaj" }).click();
  await noteCard.getByTitle("E kaltër").click();
  await noteCard.getByText("Shënim i ndryshuar dhe i sinkronizuar.").waitFor({ state: "visible" });

  const highlightCard = page.locator("#lesson-annotation-library article").filter({ hasText: "Highlight" });
  page.once("dialog", (popup) => popup.accept());
  await highlightCard.getByRole("button", { name: "Fshi" }).click();
  assert(await page.locator("#lesson-annotation-library article").count() === 1, "Highlight deletion did not update the private library");

  const secondContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  await installApi(secondContext);
  const secondPage = await secondContext.newPage();
  await secondPage.goto(`${baseURL}/annotations-audit`, { waitUntil: "domcontentloaded" });
  await secondPage.getByRole("button", { name: /Shënimet e mia/ }).click();
  await secondPage.getByText("Shënim i ndryshuar dhe i sinkronizuar.").waitFor({ state: "visible" });
  assert(await secondPage.locator("#lesson-annotation-library article").count() === 1, "Account annotations did not load on a second device context");

  await secondContext.close();
  await context.close();
} finally {
  await browser.close();
}

console.log("Private highlights and sticky notes passed mobile, editing, deletion and cross-device browser audits.");
