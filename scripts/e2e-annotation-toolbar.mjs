import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const assert = (value, message) => { if (!value) throw new Error(message); };

async function geometry(page) {
  return page.evaluate(() => {
    const toolbar = document.querySelector("[data-annotation-selection-toolbar]");
    const selection = window.getSelection();
    if (!(toolbar instanceof HTMLElement) || !selection || selection.rangeCount === 0) return null;
    const toolbarRect = toolbar.getBoundingClientRect();
    const selectionRect = selection.getRangeAt(0).getBoundingClientRect();
    return {
      portalIsBody: toolbar.parentElement === document.body,
      placement: toolbar.dataset.placement,
      selectionCollapsed: selection.isCollapsed,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      toolbar: {
        left: toolbarRect.left,
        right: toolbarRect.right,
        top: toolbarRect.top,
        bottom: toolbarRect.bottom,
        width: toolbarRect.width,
        height: toolbarRect.height,
      },
      selection: {
        left: selectionRect.left,
        right: selectionRect.right,
        top: selectionRect.top,
        bottom: selectionRect.bottom,
        width: selectionRect.width,
        height: selectionRect.height,
      },
    };
  });
}

function assertContextualPosition(snapshot, label) {
  assert(snapshot, `${label}: toolbar geometry missing`);
  assert(snapshot.portalIsBody, `${label}: toolbar is not portaled to document.body`);
  assert(!snapshot.selectionCollapsed, `${label}: text selection collapsed unexpectedly`);
  assert(["above", "below"].includes(snapshot.placement), `${label}: toolbar placement metadata missing`);
  assert(snapshot.toolbar.left >= -0.5, `${label}: toolbar overflows left viewport edge`);
  assert(snapshot.toolbar.right <= snapshot.viewport.width + 0.5, `${label}: toolbar overflows right viewport edge`);
  assert(snapshot.toolbar.top >= -0.5, `${label}: toolbar overflows top viewport edge`);
  assert(snapshot.toolbar.bottom <= snapshot.viewport.height + 0.5, `${label}: toolbar overflows bottom viewport edge`);

  const toolbarCenter = snapshot.toolbar.left + snapshot.toolbar.width / 2;
  const selectionCenter = snapshot.selection.left + snapshot.selection.width / 2;
  assert(Math.abs(toolbarCenter - selectionCenter) <= 170, `${label}: toolbar is horizontally detached from the selection`);

  const distanceAbove = Math.abs(snapshot.selection.top - snapshot.toolbar.bottom);
  const distanceBelow = Math.abs(snapshot.toolbar.top - snapshot.selection.bottom);
  assert(Math.min(distanceAbove, distanceBelow) <= 42, `${label}: toolbar is vertically detached from the selection`);

  if (snapshot.placement === "above") {
    assert(snapshot.toolbar.bottom <= snapshot.selection.top + 1, `${label}: above placement overlaps selected text`);
  } else {
    assert(snapshot.toolbar.top >= snapshot.selection.bottom - 1, `${label}: below placement overlaps selected text`);
  }
}

function assertStableGeometry(before, after, label, tolerance = 2.5) {
  assert(before && after, `${label}: missing toolbar geometry`);
  assert(Math.abs(before.toolbar.left - after.toolbar.left) <= tolerance, `${label}: toolbar drifted horizontally`);
  assert(Math.abs(before.toolbar.top - after.toolbar.top) <= tolerance, `${label}: toolbar drifted vertically`);
  assert(Math.abs(before.toolbar.width - after.toolbar.width) <= tolerance, `${label}: toolbar width changed while interacting`);
  assert(Math.abs(before.toolbar.height - after.toolbar.height) <= tolerance, `${label}: toolbar height changed while interacting`);
  assert(before.placement === after.placement, `${label}: toolbar flipped placement while interacting`);
  assert(!after.selectionCollapsed, `${label}: selection collapsed while interacting with toolbar`);
}

async function selectAuditPhrase(page) {
  await page.evaluate(() => {
    const paragraph = document.querySelector("[data-audit-paragraph]");
    const node = paragraph?.firstChild;
    if (!(node instanceof Text)) throw new Error("Audit text node missing");
    const phrase = "Membrana kontrollon shkëmbimin";
    const start = node.data.indexOf(phrase);
    if (start < 0) throw new Error("Audit phrase missing");
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, start + phrase.length);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
    document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "mouse" }));
  });
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1100, height: 760 },
    serviceWorkers: "block",
  });

  await context.route("**/api/annotations**", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ annotations: [] }),
    });
  });

  const page = await context.newPage();
  await page.goto(`${baseURL}/annotations-audit`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-audit-paragraph][data-annotation-block-key]").waitFor({ state: "visible", timeout: 10_000 });

  await selectAuditPhrase(page);

  const toolbar = page.locator("[data-annotation-selection-toolbar]");
  await toolbar.waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForTimeout(100);
  const initial = await geometry(page);
  assertContextualPosition(initial, "initial selection");

  const firstColor = toolbar.locator("button[data-color]").first();
  await firstColor.dispatchEvent("pointerdown", { pointerType: "mouse", button: 0, buttons: 1 });
  await page.waitForTimeout(70);
  const duringPress = await geometry(page);
  assertContextualPosition(duringPress, "during toolbar press");
  assertStableGeometry(initial, duringPress, "toolbar pointer-down stability");
  await firstColor.dispatchEvent("pointercancel", { pointerType: "mouse", button: 0, buttons: 0 });
  await page.waitForTimeout(180);
  const afterCancel = await geometry(page);
  assertContextualPosition(afterCancel, "after toolbar pointer cancel");
  assertStableGeometry(initial, afterCancel, "toolbar pointer-cancel stability");

  const didScroll = await page.evaluate(() => {
    const before = window.scrollY;
    window.scrollBy(0, 120);
    return window.scrollY !== before;
  });

  if (didScroll) {
    await page.waitForTimeout(120);
    assertContextualPosition(await geometry(page), "after scroll");
  }

  await page.setViewportSize({ width: 820, height: 680 });
  await page.waitForTimeout(120);
  assertContextualPosition(await geometry(page), "after resize");

  await page.keyboard.press("Escape");
  await toolbar.waitFor({ state: "detached", timeout: 5_000 });

  await selectAuditPhrase(page);
  await toolbar.waitFor({ state: "visible", timeout: 5_000 });
  const buttons = toolbar.locator("button[data-color]");
  assert(await buttons.count() === 4, "Toolbar lost highlight color controls after reopening");
  for (let index = 0; index < 4; index += 1) {
    assert(await buttons.nth(index).getAttribute("aria-pressed") === "false", "Fresh selection should not report a highlight color as active");
  }

  await context.close();
} finally {
  await browser.close();
}

console.log("Contextual annotation toolbar stayed stable through pointer interaction, scrolling, resizing and keyboard dismissal.");
