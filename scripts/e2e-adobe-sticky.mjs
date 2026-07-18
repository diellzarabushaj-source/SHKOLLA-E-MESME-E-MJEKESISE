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
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  await installApi(context);
  const page = await context.newPage();
  await page.goto(`${baseURL}/annotations-audit`, { waitUntil: "domcontentloaded" });

  await selectPhrase(page, "Membrana kontrollon shkëmbimin");
  await page.getByRole("button", { name: "+ Sticky note" }).click();
  const composer = page.getByRole("dialog", { name: "Shto sticky note" });
  await composer.getByRole("textbox").fill("Shënimi fillestar për këtë pjesë.");
  await composer.getByRole("button", { name: "Ruaj sticky note" }).click();
  await page.getByText("Sticky note u ruajt privatisht.").waitFor();

  const pin = page.getByRole("button", { name: /Hape sticky note:/ });
  await pin.click();
  const popover = page.locator("[data-adobe-note-popover]");
  await popover.waitFor({ state: "visible", timeout: 10_000 });
  assert(await pin.getAttribute("aria-expanded") === "true", "Sticky note pin did not expose expanded state");

  const box = await popover.boundingBox();
  const viewport = page.viewportSize();
  assert(box && viewport, "Sticky note popover geometry missing");
  assert(box.x >= 0 && box.x + box.width <= viewport.width, "Sticky note popover overflows mobile width");
  assert(box.y >= 0 && box.y + box.height <= viewport.height, "Sticky note popover overflows mobile height");

  const editor = popover.getByRole("textbox");
  await editor.fill("Shënim i ndryshuar direkt pranë tekstit.");
  await popover.getByRole("button", { name: "E kaltër" }).click();
  await popover.getByRole("button", { name: "Ruaj" }).click();
  await page.getByText("Shënimi u përditësua.").waitFor();
  assert(records[0]?.noteText === "Shënim i ndryshuar direkt pranë tekstit.", "Popover did not persist edited note text");
  assert(records[0]?.color === "blue", "Popover did not persist selected note color");

  await popover.getByRole("button", { name: "Mbyll sticky note" }).click();
  await popover.waitFor({ state: "detached" });
  await pin.click();
  await popover.waitFor({ state: "visible" });
  assert(await popover.getByRole("textbox").inputValue() === "Shënim i ndryshuar direkt pranë tekstit.", "Reopened popover did not show saved text");

  page.once("dialog", (dialog) => dialog.accept());
  await popover.getByRole("button", { name: "Fshi" }).click();
  await popover.waitFor({ state: "detached", timeout: 10_000 });
  assert(records.length === 0, "Sticky note deletion from contextual popover failed");

  await context.close();
} finally {
  await browser.close();
}

console.log("Adobe-style sticky note popover passed mobile open, edit, recolor, reopen and delete tests.");
