import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const assert = (value, message) => { if (!value) throw new Error(message); };

async function mockAnnotations(context) {
  await context.route("**/api/annotations**", async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ annotations: [] }) });
    }
    if (request.method() === "DELETE") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        annotation: {
          id: "11111111-1111-4111-8111-111111111111",
          lessonId: "annotation-audit-lesson",
          contentRevision: "audit-revision-1",
          kind: "highlight",
          blockKey: "audit-paragraph",
          startOffset: 0,
          endOffset: 6,
          quote: "Qeliza",
          prefix: "",
          suffix: " është",
          color: "yellow",
          noteText: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    });
  });
}

async function selectText(page, selector, phrase, pointerType = "mouse") {
  await page.evaluate(({ selector, phrase, pointerType }) => {
    const element = document.querySelector(selector);
    if (!(element instanceof HTMLElement)) throw new Error(`Selection element missing: ${selector}`);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    let target = null;
    let start = -1;
    while (node) {
      const textNode = node;
      const index = textNode.data.indexOf(phrase);
      if (index >= 0) {
        target = textNode;
        start = index;
        break;
      }
      node = walker.nextNode();
    }
    if (!(target instanceof Text) || start < 0) throw new Error(`Phrase missing: ${phrase}`);
    const range = document.createRange();
    range.setStart(target, start);
    range.setEnd(target, start + phrase.length);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
    document.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true,
      pointerType,
      pointerId: pointerType === "touch" ? 9 : 4,
      button: 0,
      buttons: 0,
    }));
  }, { selector, phrase, pointerType });
}

async function desktopAudit(browser) {
  const context = await browser.newContext({
    viewport: { width: 1100, height: 760 },
    serviceWorkers: "block",
  });
  await mockAnnotations(context);
  const page = await context.newPage();
  await page.goto(`${baseURL}/annotations-audit`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-audit-paragraph][data-annotation-block-key]").waitFor({ state: "visible", timeout: 10_000 });

  const toolbar = page.locator("[data-annotation-selection-toolbar]");
  await selectText(page, "[data-audit-paragraph]", "Membrana kontrollon shkëmbimin");
  await toolbar.waitFor({ state: "visible", timeout: 5_000 });
  await page.waitForTimeout(100);

  const initial = await toolbar.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
  });
  assert(initial.left >= 0 && initial.right <= 1100, "Desktop toolbar overflows horizontally.");
  assert(initial.top >= 0 && initial.bottom <= 760, "Desktop toolbar overflows vertically.");
  assert(await toolbar.evaluate((element) => element.parentElement === document.body), "Desktop toolbar is not portaled to body.");

  const firstColor = toolbar.locator("button[data-color]").first();
  await firstColor.dispatchEvent("pointerdown", { pointerType: "mouse", pointerId: 41, button: 0, buttons: 1 });
  await page.locator("body").dispatchEvent("pointerup", { pointerType: "mouse", pointerId: 41, button: 0, buttons: 0 });
  await page.waitForTimeout(220);

  await selectText(page, "h2[data-annotation-block-key]", "Highlights dhe sticky notes");
  await page.waitForTimeout(120);
  const selectionText = await page.evaluate(() => window.getSelection()?.toString() || "");
  assert(selectionText === "Highlights dhe sticky notes", "Desktop browser selection did not move to the second anchor.");

  const contextual = await page.evaluate(() => {
    const toolbarElement = document.querySelector("[data-annotation-selection-toolbar]");
    const selection = window.getSelection();
    if (!(toolbarElement instanceof HTMLElement) || !selection || selection.rangeCount === 0) return null;
    const toolbarRect = toolbarElement.getBoundingClientRect();
    const selectionRect = selection.getRangeAt(0).getBoundingClientRect();
    return {
      toolbar: { top: toolbarRect.top, bottom: toolbarRect.bottom, left: toolbarRect.left, right: toolbarRect.right },
      selection: { top: selectionRect.top, bottom: selectionRect.bottom, left: selectionRect.left, right: selectionRect.right },
    };
  });
  assert(contextual, "Desktop toolbar disappeared after outside pointer release.");
  const verticalGap = Math.min(
    Math.abs(contextual.selection.top - contextual.toolbar.bottom),
    Math.abs(contextual.toolbar.top - contextual.selection.bottom),
  );
  assert(verticalGap <= 44, "Desktop toolbar stayed attached to the stale selection after pointer release outside the toolbar.");

  for (let index = 0; index < 8; index += 1) {
    const phrase = index % 2 === 0 ? "Qeliza është njësia themelore" : "Membrana kontrollon shkëmbimin";
    await selectText(page, "[data-audit-paragraph]", phrase);
    await page.waitForTimeout(80);
    assert(await toolbar.isVisible(), `Desktop toolbar vanished during repeated selection cycle ${index + 1}.`);
  }

  const colorButtons = toolbar.locator("button[data-color]");
  assert(await colorButtons.count() === 4, "Desktop toolbar does not expose exactly four highlight colors.");
  for (let index = 0; index < 4; index += 1) {
    assert(await colorButtons.nth(index).getAttribute("aria-pressed") !== null, "Highlight color button is missing aria-pressed state.");
  }

  const noneButton = toolbar.getByRole("button", { name: "Hiq highlighting-un nga teksti i zgjedhur" });
  await noneButton.focus();
  const focusStyle = await noneButton.evaluate((element) => getComputedStyle(element).outlineStyle);
  assert(focusStyle !== "none", "Portaled desktop toolbar control has no visible focus outline.");

  await context.close();
}

async function mobileAudit(browser, width, height) {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    serviceWorkers: "block",
  });
  await mockAnnotations(context);
  const page = await context.newPage();
  await page.goto(`${baseURL}/annotations-audit`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-audit-paragraph][data-annotation-block-key]").waitFor({ state: "visible", timeout: 10_000 });

  const toolbar = page.locator("[data-annotation-selection-toolbar]");
  await selectText(page, "[data-audit-paragraph]", "Membrana kontrollon shkëmbimin", "touch");
  await toolbar.waitFor({ state: "visible", timeout: 5_000 });
  await page.waitForTimeout(360);

  const mobileGeometry = await toolbar.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const buttons = Array.from(element.querySelectorAll("button")).map((button) => {
      const box = button.getBoundingClientRect();
      return { width: box.width, height: box.height, label: button.getAttribute("aria-label") || button.textContent || "" };
    });
    return {
      rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width },
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      buttons,
      touchAction: getComputedStyle(element).touchAction,
    };
  });

  assert(mobileGeometry.rect.left >= -0.5, `${width}px mobile toolbar overflows left.`);
  assert(mobileGeometry.rect.right <= width + 0.5, `${width}px mobile toolbar overflows right.`);
  assert(mobileGeometry.rect.top >= -0.5 && mobileGeometry.rect.bottom <= height + 0.5, `${width}px mobile toolbar overflows vertically.`);
  assert(mobileGeometry.scrollWidth <= mobileGeometry.clientWidth + 1, `${width}px mobile toolbar has hidden horizontal overflow.`);
  assert(mobileGeometry.touchAction === "manipulation", `${width}px mobile toolbar touch-action is not manipulation.`);
  assert(mobileGeometry.buttons.length === 6, `${width}px mobile toolbar should expose None, four colors and Sticky note.`);
  for (const button of mobileGeometry.buttons) {
    assert(button.width >= 43.5 && button.height >= 43.5, `${width}px mobile target is below 44px: ${button.label}`);
  }

  const firstColor = toolbar.locator("button[data-color]").first();
  await firstColor.dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 77, button: 0, buttons: 1 });
  await page.locator("body").dispatchEvent("pointerup", { pointerType: "touch", pointerId: 77, button: 0, buttons: 0 });
  await page.waitForTimeout(220);

  await selectText(page, "[data-audit-paragraph]", "Qeliza është njësia themelore", "touch");
  await page.waitForTimeout(420);
  await toolbar.getByRole("button", { name: "+ Sticky note" }).click();
  const dialog = page.getByRole("dialog", { name: "Shto sticky note" });
  await dialog.waitFor({ state: "visible", timeout: 5_000 });
  const quote = await dialog.locator("blockquote").innerText();
  assert(quote.includes("Qeliza është njësia themelore"), `${width}px mobile toolbar remained bound to a stale selection after outside pointer release.`);
  await dialog.getByRole("button", { name: "Anulo" }).click();

  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await desktopAudit(browser);
  await mobileAudit(browser, 320, 640);
  await mobileAudit(browser, 390, 844);
} finally {
  await browser.close();
}

console.log("Deep annotation browser audit passed: outside pointer release recovery, repeated desktop selection, focus visibility, 320/390px overflow and 44px touch targets are stable.");
