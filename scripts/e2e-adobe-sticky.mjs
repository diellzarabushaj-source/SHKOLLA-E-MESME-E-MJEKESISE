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
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ annotations: records.filter((item) => item.lessonId === lessonId) }) });
    }
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      const annotation = { ...body, id: randomUUID(), createdAt: now, updatedAt: now };
      records.push(annotation);
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ annotation }) });
    }
    if (request.method() === "PATCH") {
      const body = request.postDataJSON();
      const current = records.find((item) => item.id === body.id);
      if (!current) return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "ANNOTATION_NOT_FOUND" }) });
      const annotation = { ...current, ...(body.color ? { color: body.color } : {}), ...(body.noteText !== undefined ? { noteText: body.noteText } : {}), updatedAt: now };
      records = records.map((item) => item.id === annotation.id ? annotation : item);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ annotation }) });
    }
    if (request.method() === "DELETE") {
      records = records.filter((item) => item.id !== url.searchParams.get("id"));
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
    return route.abort();
  });
}

async function selectPhrase(page, phrase) {
  await page.locator("[data-audit-paragraph][data-annotation-block-key]").waitFor({ state: "visible", timeout: 10_000 });
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
  await page.locator("[data-annotation-selection-toolbar]").waitFor({ state: "visible", timeout: 10_000 });
}

const browser = await chromium.launch({ headless: true });
try {
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  await installApi(mobileContext);
  const page = await mobileContext.newPage();
  await page.goto(`${baseURL}/annotations-audit`, { waitUntil: "domcontentloaded" });

  await selectPhrase(page, "Membrana kontrollon shkëmbimin");
  await page.getByRole("button", { name: "+ Sticky note" }).click();
  const composer = page.getByRole("dialog", { name: "Shto sticky note" });
  await composer.getByRole("textbox").fill("Shënimi fillestar për këtë pjesë.");
  await composer.getByRole("button", { name: "Ruaj sticky note" }).click();
  await page.getByText("Sticky note u ruajt privatisht.").waitFor();

  const popover = page.locator("[data-pdf-comment-popover]");
  await popover.waitFor({ state: "visible", timeout: 10_000 });
  const pin = page.locator("[data-pdf-comment-pin]");
  assert(await pin.getAttribute("aria-expanded") === "true", "PDF comment pin did not expose expanded state");

  const mobileBox = await popover.boundingBox();
  const mobileViewport = page.viewportSize();
  assert(mobileBox && mobileViewport, "PDF comment mobile geometry missing");
  assert(mobileBox.x >= 0 && mobileBox.x + mobileBox.width <= mobileViewport.width, "PDF comment overflows mobile width");
  assert(mobileBox.y >= 0 && mobileBox.y + mobileBox.height <= mobileViewport.height, "PDF comment overflows mobile height");

  assert(await popover.getByRole("textbox").count() === 0, "PDF comment must be read-only before editing");
  await popover.getByText("Shënimi fillestar për këtë pjesë.").waitFor();
  await popover.getByRole("button", { name: "Ndrysho komentin" }).click();
  const editor = popover.getByRole("textbox", { name: "Teksti i komentit" });
  await editor.waitFor({ state: "visible" });
  assert(await editor.inputValue() === "Shënimi fillestar për këtë pjesë.", "Editor did not load the saved comment");
  await editor.fill("Shënim i ndryshuar direkt pranë tekstit.");
  await popover.getByRole("button", { name: "E kaltër" }).click();
  await popover.getByRole("button", { name: "Ruaj" }).click();
  await page.getByText("Shënimi u përditësua.").waitFor();
  await editor.waitFor({ state: "detached", timeout: 10_000 });
  await popover.getByText("Shënim i ndryshuar direkt pranë tekstit.").waitFor();
  assert(records[0]?.noteText === "Shënim i ndryshuar direkt pranë tekstit.", "PDF comment did not persist edited text");
  assert(records[0]?.color === "blue", "PDF comment did not persist selected color");

  await page.locator("[data-audit-paragraph]").click({ position: { x: 8, y: 8 } });
  await popover.waitFor({ state: "detached", timeout: 10_000 });
  await pin.click();
  await popover.waitFor({ state: "visible" });
  await popover.getByRole("button", { name: "Ndrysho komentin" }).click();
  await popover.getByRole("textbox", { name: "Teksti i komentit" }).fill("Ndryshim që nuk duhet humbur nga prekja jashtë.");
  await page.locator("[data-audit-paragraph]").click({ position: { x: 8, y: 8 } });
  await popover.waitFor({ state: "visible" });
  await popover.getByRole("button", { name: "Anulo" }).click();
  await popover.getByText("Shënim i ndryshuar direkt pranë tekstit.").waitFor();

  await popover.getByRole("button", { name: "Mbyll komentin" }).click();
  await popover.waitFor({ state: "detached" });

  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  await installApi(desktopContext);
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(`${baseURL}/annotations-audit`, { waitUntil: "domcontentloaded" });
  const desktopPin = desktopPage.locator("[data-pdf-comment-pin]");
  await desktopPin.waitFor({ state: "visible", timeout: 10_000 });
  await desktopPin.click();
  const desktopPopover = desktopPage.locator("[data-pdf-comment-popover]");
  await desktopPopover.waitFor({ state: "visible", timeout: 10_000 });
  const desktopBox = await desktopPopover.boundingBox();
  const desktopPinBox = await desktopPin.boundingBox();
  const desktopViewport = desktopPage.viewportSize();
  assert(desktopBox && desktopPinBox && desktopViewport, "PDF comment desktop geometry missing");
  assert(desktopBox.x >= 0 && desktopBox.x + desktopBox.width <= desktopViewport.width, "PDF comment overflows desktop width");
  assert(desktopBox.y >= 0 && desktopBox.y + desktopBox.height <= desktopViewport.height, "PDF comment overflows desktop height");
  assert(desktopBox.x < desktopPinBox.x, "Desktop PDF comment is not anchored beside its pin");
  await desktopPage.getByText("Shënim i ndryshuar direkt pranë tekstit.").waitFor();
  await desktopContext.close();

  await pin.click();
  await popover.waitFor({ state: "visible" });
  page.once("dialog", (dialog) => dialog.accept());
  await popover.getByRole("button", { name: "Fshi" }).click();
  await popover.waitFor({ state: "detached", timeout: 10_000 });
  assert(records.length === 0, "PDF comment deletion from contextual card failed");

  await mobileContext.close();
} finally {
  await browser.close();
}

console.log("PDF-style comment card passed auto-open, read-only, edit, cancel, recolor, desktop anchoring, reopen and delete tests.");
