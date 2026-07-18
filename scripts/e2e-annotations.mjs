import { randomUUID } from "node:crypto";
import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
let records = [];
const assert = (value, message) => { if (!value) throw new Error(message); };

async function installApi(context) {
  await context.route("**/api/annotations**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const now = new Date().toISOString();
    if (request.method() === "GET") {
      const lessonId = url.searchParams.get("lessonId");
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ annotations: records.filter((x) => x.lessonId === lessonId) }) });
    }
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      const old = records.find((x) => x.lessonId === body.lessonId && x.kind === body.kind && x.blockKey === body.blockKey && x.startOffset === body.startOffset && x.endOffset === body.endOffset);
      const annotation = { ...body, id: old?.id || randomUUID(), createdAt: old?.createdAt || now, updatedAt: now };
      records = [...records.filter((x) => x.id !== annotation.id), annotation];
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ annotation }) });
    }
    if (request.method() === "PATCH") {
      const body = request.postDataJSON();
      const old = records.find((x) => x.id === body.id);
      if (!old) return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "ANNOTATION_NOT_FOUND" }) });
      const annotation = { ...old, ...(body.color ? { color: body.color } : {}), ...(body.noteText !== undefined ? { noteText: body.noteText } : {}), updatedAt: now };
      records = records.map((x) => x.id === annotation.id ? annotation : x);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ annotation }) });
    }
    if (request.method() === "DELETE") {
      records = records.filter((x) => x.id !== url.searchParams.get("id"));
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
    return route.abort();
  });
}

async function selectPhrase(page, phrase) {
  await page.locator("[data-audit-paragraph][data-annotation-block-key]").waitFor({ state: "visible", timeout: 5000 });
  await page.evaluate((text) => {
    const paragraph = document.querySelector("[data-audit-paragraph]");
    const node = paragraph?.firstChild;
    if (!(node instanceof Text)) throw new Error("Audit text node missing");
    const start = node.data.indexOf(text);
    if (start < 0) throw new Error("Audit phrase missing");
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, start + text.length);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
    document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" }));
  }, phrase);
  await page.locator("[data-annotation-selection-toolbar]").waitFor({ state: "visible", timeout: 5000 });
}

async function openLibrary(page) {
  const button = page.getByRole("button", { name: /Shënimet e mia/ });
  await button.waitFor({ state: "visible", timeout: 10000 });
  await button.click();
  const library = page.locator("#lesson-annotation-library");
  await library.waitFor({ state: "visible", timeout: 10000 });
  return library;
}

const browser = await chromium.launch({ headless: true });
try {
  const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" };
  const context = await browser.newContext(mobile);
  await installApi(context);
  const page = await context.newPage();
  await page.goto(`${baseURL}/annotations-audit`, { waitUntil: "domcontentloaded" });

  await selectPhrase(page, "Qeliza është njësia themelore");
  const toolbar = page.locator("[data-annotation-selection-toolbar]");
  const box = await toolbar.boundingBox();
  const viewport = page.viewportSize();
  assert(box && viewport, "Mobile toolbar geometry missing");
  assert(viewport.height - box.y - box.height >= 70, "Toolbar is not above the iPhone safe area");
  const style = await toolbar.evaluate((el) => ({ bottom: getComputedStyle(el).bottom, transform: getComputedStyle(el).transform }));
  assert(style.bottom !== "auto" && style.transform === "none", "Toolbar still follows the native selection popup");
  await page.getByRole("button", { name: "Thekso e verdhë" }).click();
  await page.getByText("Teksti u theksua dhe u ruajt privatisht.").waitFor();

  await selectPhrase(page, "Qeliza është njësia themelore");
  await page.getByRole("button", { name: "Hiq highlighting-un nga teksti i zgjedhur" }).click();
  await page.getByText("Highlighting-u u hoq.").waitFor();
  assert(records.filter((record) => record.kind === "highlight").length === 0, "None control did not delete the selected highlight");

  await selectPhrase(page, "Qeliza është njësia themelore");
  await page.getByRole("button", { name: "Thekso e verdhë" }).click();
  await page.getByText("Teksti u theksua dhe u ruajt privatisht.").waitFor();

  await selectPhrase(page, "Membrana kontrollon shkëmbimin");
  await page.getByRole("button", { name: "+ Sticky note" }).click();
  const dialog = page.getByRole("dialog", { name: "Shto sticky note" });
  await dialog.getByRole("textbox").fill("Kjo pjesë duhet përsëritur para testit.");
  await dialog.getByRole("button", { name: "E gjelbër" }).click();
  await dialog.getByRole("button", { name: "Ruaj sticky note" }).click();
  await dialog.waitFor({ state: "detached", timeout: 10000 });
  await page.getByText("Sticky note u ruajt privatisht.").waitFor();

  const library = await openLibrary(page);
  assert(await library.locator("article").count() === 2, "Highlight and sticky note are not both listed");
  const note = library.locator("article").filter({ hasText: "Sticky note" });
  await note.getByRole("button", { name: "Ndrysho" }).click();
  await note.getByRole("textbox").fill("Shënim i ndryshuar dhe i sinkronizuar.");
  await note.getByRole("button", { name: "Ruaj" }).click();
  await note.getByTitle("E kaltër").click();
  await note.getByText("Shënim i ndryshuar dhe i sinkronizuar.").waitFor();

  const highlight = library.locator("article").filter({ hasText: "Highlight" });
  page.once("dialog", (popup) => popup.accept());
  await highlight.getByRole("button", { name: "Fshi" }).click();
  await highlight.waitFor({ state: "detached", timeout: 10000 });
  assert(await library.locator("article").count() === 1, "Highlight deletion failed");

  const secondContext = await browser.newContext(mobile);
  await installApi(secondContext);
  const secondPage = await secondContext.newPage();
  await secondPage.goto(`${baseURL}/annotations-audit`, { waitUntil: "domcontentloaded" });
  const secondLibrary = await openLibrary(secondPage);
  await secondPage.getByText("Shënim i ndryshuar dhe i sinkronizuar.").waitFor();
  assert(await secondLibrary.locator("article").count() === 1, "Second-device account sync failed");
  await secondContext.close();
  await context.close();
} finally {
  await browser.close();
}

console.log("Private highlights and sticky notes passed mobile, None removal, editing, deletion and cross-device audits.");
