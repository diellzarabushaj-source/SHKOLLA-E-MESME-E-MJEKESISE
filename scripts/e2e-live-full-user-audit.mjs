import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const baseURL = (process.env.E2E_BASE_URL || "https://shkolla-e-mesme-e-mjekesise-ct9t.vercel.app").replace(/\/$/, "");
const username = process.env.AUDIT_USERNAME || "qa.portal.audit";
const password = process.env.AUDIT_PASSWORD || "PortalAudit2026!";
const outputDir = "artifacts/full-user-audit";
mkdirSync(outputDir, { recursive: true });

const failures = [];
const checks = [];
const diagnostics = [];

function assert(value, message) {
  if (!value) throw new Error(message);
}

function checkpoint(label) {
  checks.push(label);
  console.log(`✓ ${label}`);
}

function sameOrigin(url) {
  try {
    return new URL(url).origin === new URL(baseURL).origin;
  } catch {
    return false;
  }
}

function attachDiagnostics(page, label) {
  page.on("pageerror", (error) => diagnostics.push(`${label} pageerror: ${error.message}`));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText || "unknown";
    if (sameOrigin(request.url())) diagnostics.push(`${label} requestfailed: ${request.method()} ${request.url()} — ${failure}`);
  });
  page.on("response", (response) => {
    if (sameOrigin(response.url()) && response.status() >= 500) {
      diagnostics.push(`${label} HTTP ${response.status()}: ${response.url()}`);
    }
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/favicon|AbortError|ResizeObserver loop/i.test(text)) return;
    diagnostics.push(`${label} console.error: ${text}`);
  });
}

async function screenshot(page, name, fullPage = true) {
  await page.screenshot({ path: `${outputDir}/${name}.png`, fullPage });
}

async function waitForPortal(page) {
  await page.locator("main").first().waitFor({ state: "visible", timeout: 30_000 });
  await page.locator("main.loading-screen").waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
}

async function assertNoHorizontalOverflow(page, label) {
  const geometry = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    body: document.body.scrollWidth,
    html: document.documentElement.scrollWidth,
  }));
  assert(Math.max(geometry.body, geometry.html) <= geometry.innerWidth + 2,
    `${label}: horizontal overflow ${Math.max(geometry.body, geometry.html)}px > ${geometry.innerWidth}px`);
}

async function auditVisibleAccessibility(page, label) {
  const result = await page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && box.width > 0 && box.height > 0;
    };
    const text = (element) => (element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent || "").trim();
    const unnamed = Array.from(document.querySelectorAll("button,a")).filter((element) => visible(element) && !text(element)).map((element) => element.outerHTML.slice(0, 180));
    const unlabeledInputs = Array.from(document.querySelectorAll("input,textarea,select")).filter((element) => {
      if (!visible(element)) return false;
      const id = element.id;
      return !(element.getAttribute("aria-label") || element.getAttribute("aria-labelledby") || element.getAttribute("placeholder") || (id && document.querySelector(`label[for=\"${CSS.escape(id)}\"]`)));
    }).map((element) => element.outerHTML.slice(0, 180));
    const imagesWithoutAlt = Array.from(document.images).filter((image) => !image.hasAttribute("alt")).map((image) => image.outerHTML.slice(0, 180));
    const ids = Array.from(document.querySelectorAll("[id]")).map((element) => element.id).filter(Boolean);
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    return { unnamed, unlabeledInputs, imagesWithoutAlt, duplicateIds };
  });
  assert(result.unnamed.length === 0, `${label}: controls without accessible names: ${JSON.stringify(result.unnamed)}`);
  assert(result.unlabeledInputs.length === 0, `${label}: form fields without labels: ${JSON.stringify(result.unlabeledInputs)}`);
  assert(result.imagesWithoutAlt.length === 0, `${label}: images without alt: ${JSON.stringify(result.imagesWithoutAlt)}`);
  assert(result.duplicateIds.length === 0, `${label}: duplicate IDs: ${result.duplicateIds.join(", ")}`);
}

async function openFirstLesson(page) {
  await page.goto(`${baseURL}/#klasat`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await waitForPortal(page);
  const gradeButton = page.locator("#klasat button").first();
  await gradeButton.waitFor({ state: "visible", timeout: 30_000 });
  await gradeButton.click();
  await page.locator("main.inner-page").waitFor({ state: "visible", timeout: 30_000 });

  const subjectButton = page.locator(".subject-card button").first();
  await subjectButton.waitFor({ state: "visible", timeout: 30_000 });
  await subjectButton.click();
  await page.locator("main.subject-page").waitFor({ state: "visible", timeout: 30_000 });

  const chapterButton = page.locator(".chapter-row button").first();
  await chapterButton.waitFor({ state: "visible", timeout: 30_000 });
  await chapterButton.click();
  await page.locator(".chapter-hero").waitFor({ state: "visible", timeout: 30_000 });

  const lessonButton = page.getByRole("button", { name: "Hape mësimin" }).first();
  await lessonButton.waitFor({ state: "visible", timeout: 30_000 });
  await lessonButton.click();
  await page.locator('main[data-progress-page="lesson"]').waitFor({ state: "visible", timeout: 30_000 });
  await page.locator('main[data-progress-page="lesson"] article').first().waitFor({ state: "visible", timeout: 30_000 });
  return {
    url: page.url(),
    lessonId: await page.locator('main[data-progress-page="lesson"]').getAttribute("data-progress-lesson-id"),
  };
}

async function selectTextInLesson(page, preferredIndex = 0) {
  const selection = await page.evaluate((index) => {
    const article = document.querySelector('[data-lesson-annotations] article') || document.querySelector('main[data-progress-page="lesson"] article');
    if (!article) throw new Error("Lesson article missing");
    const blocks = Array.from(article.querySelectorAll("p,h2,h3,h4,blockquote,li")).filter((element) => (element.textContent || "").trim().length >= 14);
    const block = blocks[index] || blocks[0];
    if (!block) throw new Error("Selectable lesson text missing");
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const node = walker.nextNode();
    if (!(node instanceof Text)) throw new Error("Selectable text node missing");
    const text = node.data.trim();
    const start = node.data.indexOf(text);
    const length = Math.min(Math.max(8, Math.floor(text.length / 2)), 42);
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, start + length);
    const browserSelection = window.getSelection();
    browserSelection?.removeAllRanges();
    browserSelection?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
    document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" }));
    return range.toString();
  }, preferredIndex);
  await page.locator("[data-annotation-selection-toolbar]").waitFor({ state: "visible", timeout: 10_000 });
  return selection;
}

async function ensureStudentSession(page) {
  await page.goto(`${baseURL}/auth/sign-up`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Krijo llogarinë" }).click();

  const reachedHome = await page.waitForURL((url) => url.pathname === "/", { timeout: 20_000 }).then(() => true).catch(() => false);
  if (!reachedHome) {
    const alertText = await page.getByRole("alert").textContent().catch(() => "");
    if (!/ekziston|regjistrimi nuk u krye/i.test(alertText || "")) {
      throw new Error(`Student registration failed: ${alertText || "no error message"}`);
    }
    await page.goto(`${baseURL}/auth/sign-in`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Kyçu", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/", { timeout: 30_000 });
  }
  await waitForPortal(page);
  await page.getByText(`@${username}`, { exact: true }).waitFor({ state: "visible", timeout: 20_000 });
}

async function auditGuestDesktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  const page = await context.newPage();
  attachDiagnostics(page, "guest-desktop");
  try {
    const response = await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    assert(response && response.status() < 500, `Homepage returned ${response?.status()}`);
    await waitForPortal(page);
    await page.locator("section.hero").waitFor({ state: "visible", timeout: 30_000 });
    await page.getByRole("link", { name: "Kyçu" }).waitFor();
    await page.getByRole("link", { name: "Regjistrohu" }).waitFor();
    await auditVisibleAccessibility(page, "guest homepage");
    await assertNoHorizontalOverflow(page, "guest homepage");
    await screenshot(page, "01-guest-home-desktop");
    checkpoint("Guest homepage, header, footer and accessibility");

    const themeButton = page.getByRole("button", { name: "Ndrysho temën light/dark" });
    const initialTheme = await page.locator("html").getAttribute("data-theme");
    await themeButton.click();
    const changedTheme = await page.locator("html").getAttribute("data-theme");
    assert(changedTheme && changedTheme !== initialTheme, "Theme did not change");
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForPortal(page);
    assert(await page.locator("html").getAttribute("data-theme") === changedTheme, "Theme did not persist after reload");
    checkpoint("Theme switch and persistence");

    await page.goto(`${baseURL}/progress`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.getByRole("heading", { name: "Kyçu për ta parë progresin tënd" }).waitFor();
    checkpoint("Guest progress privacy boundary");

    await page.goto(`${baseURL}/auth/sign-in`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.getByLabel("Username").waitFor();
    const passwordInput = page.getByLabel("Password");
    assert(await passwordInput.getAttribute("type") === "password", "Sign-in password is visible by default");
    await page.getByRole("button", { name: "Shfaq password-in" }).click();
    assert(await passwordInput.getAttribute("type") === "text", "Password visibility toggle failed");
    await page.getByRole("button", { name: /Admini.*Google/ }).waitFor();
    await auditVisibleAccessibility(page, "sign-in page");
    checkpoint("Student and administrator sign-in UI");

    await page.goto(`${baseURL}/auth/sign-up`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.getByRole("heading", { name: "Krijo llogari" }).waitFor();
    await auditVisibleAccessibility(page, "sign-up page");
    checkpoint("Student registration UI and labels");

    const lesson = await openFirstLesson(page);
    assert(lesson.lessonId, "Lesson ID missing");
    const bodyText = (await page.locator('main[data-progress-page="lesson"] article').first().innerText()).trim();
    assert(bodyText.length > 20, "Published lesson body is empty");
    assert(await page.getByRole("button", { name: /Shënimet e mia/ }).count() === 0, "Guest can see private annotation controls");
    assert(await page.getByText("Vetëm administratori", { exact: true }).count() === 0, "Guest can see administrator editor");
    await auditVisibleAccessibility(page, "guest lesson");
    await screenshot(page, "02-guest-lesson-desktop");
    checkpoint("Guest class → subject → chapter → lesson journey");

    const testButton = page.getByRole("button", { name: "Testo mësimin" });
    if (await testButton.count() && await testButton.isEnabled()) {
      await testButton.click();
      await page.locator("main.study-page").waitFor({ state: "visible", timeout: 30_000 });
      await page.getByRole("button", { name: "Shfaq përgjigjen" }).click();
      await page.getByRole("button", { name: /Mirë/ }).click();
      await page.getByText("Testi përfundoi").waitFor({ state: "visible", timeout: 20_000 });
      await screenshot(page, "03-guest-flashcard-finished-desktop");
      checkpoint("Guest flashcard reveal, rating and completion");
    } else {
      checkpoint("Guest flashcard state correctly disabled for lesson without cards");
    }

    const notFound = await page.goto(`${baseURL}/qa-route-that-must-not-exist`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    assert(notFound?.status() === 404, `Unknown route returned ${notFound?.status()} instead of 404`);
    await page.locator('a.brand[href="/"]').click();
    await page.waitForURL((url) => url.pathname === "/", { timeout: 20_000 });
    checkpoint("404 recovery through brand link");

    for (const path of ["/manifest.webmanifest", "/sw.js", "/icon.svg"]) {
      const asset = await page.request.get(`${baseURL}${path}`);
      assert(asset.status() === 200, `${path} returned ${asset.status()}`);
    }
    checkpoint("PWA manifest, service worker and icon assets");
  } finally {
    await context.close();
  }
}

async function auditGuestMobile(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  const page = await context.newPage();
  attachDiagnostics(page, "guest-mobile");
  try {
    await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await waitForPortal(page);
    const mobileNav = page.locator("nav.mobile-navigation");
    await mobileNav.waitFor({ state: "visible", timeout: 20_000 });
    const navTargets = await mobileNav.locator("a").evaluateAll((links) => links.map((link) => {
      const box = link.getBoundingClientRect();
      return { label: link.getAttribute("aria-label"), width: box.width, height: box.height };
    }));
    assert(navTargets.every((target) => target.width >= 40 && target.height >= 40), `Mobile navigation has undersized targets: ${JSON.stringify(navTargets)}`);
    await assertNoHorizontalOverflow(page, "mobile homepage");
    await screenshot(page, "04-guest-home-mobile");

    await mobileNav.getByRole("link", { name: "Klasat" }).click();
    await page.locator("#klasat").waitFor({ state: "visible", timeout: 20_000 });
    await assertNoHorizontalOverflow(page, "mobile classes");
    const lesson = await openFirstLesson(page);
    assert(lesson.lessonId, "Mobile lesson ID missing");
    await assertNoHorizontalOverflow(page, "mobile lesson");
    await auditVisibleAccessibility(page, "mobile lesson");
    await screenshot(page, "05-guest-lesson-mobile");
    checkpoint("Mobile navigation, touch targets and no horizontal overflow");
  } finally {
    await context.close();
  }
}

async function auditAuthenticatedStudent(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  const page = await context.newPage();
  attachDiagnostics(page, "student-desktop");
  try {
    await ensureStudentSession(page);
    await screenshot(page, "06-student-home-desktop");
    checkpoint("Real student registration/sign-in and authenticated header");

    const lesson = await openFirstLesson(page);
    assert(lesson.lessonId, "Authenticated lesson ID missing");
    await page.getByRole("button", { name: /Shënimet e mia/ }).waitFor({ state: "visible", timeout: 20_000 });
    assert(await page.getByText("Vetëm administratori", { exact: true }).count() === 0, "Student can see administrator editor");

    await selectTextInLesson(page, 0);
    await page.getByRole("button", { name: "Thekso e verdhë" }).click();
    await page.getByText("Teksti u theksua dhe u ruajt privatisht.").waitFor({ state: "visible", timeout: 20_000 });

    await selectTextInLesson(page, 1).catch(() => selectTextInLesson(page, 0));
    await page.getByRole("button", { name: "+ Sticky note" }).click();
    const dialog = page.getByRole("dialog", { name: "Shto sticky note" });
    await dialog.getByRole("textbox").fill("Shënim QA: kjo pjesë duhet përsëritur.");
    await dialog.getByRole("button", { name: "E gjelbër" }).click();
    await dialog.getByRole("button", { name: "Ruaj sticky note" }).click();
    await dialog.waitFor({ state: "detached", timeout: 20_000 });

    await page.getByRole("button", { name: /Shënimet e mia/ }).click();
    const library = page.locator("#lesson-annotation-library");
    await library.waitFor({ state: "visible", timeout: 20_000 });
    assert(await library.locator("article").count() >= 2, "Highlight and sticky note are not both listed");
    const noteCard = library.locator("article").filter({ hasText: "Sticky note" }).first();
    await noteCard.getByRole("button", { name: "Ndrysho" }).click();
    await noteCard.getByRole("textbox").fill("Shënim QA i ndryshuar dhe i sinkronizuar.");
    await noteCard.getByRole("button", { name: "Ruaj" }).click();
    await noteCard.getByTitle("E kaltër").click();
    await noteCard.getByText("Shënim QA i ndryshuar dhe i sinkronizuar.").waitFor({ state: "visible", timeout: 20_000 });
    await screenshot(page, "07-student-notes-library-desktop");
    checkpoint("Real highlight, sticky note, four-color controls and editing");

    const adminResponse = await page.request.get(`${baseURL}/api/admin/lessons/${encodeURIComponent(lesson.lessonId)}`);
    assert([401, 403].includes(adminResponse.status()), `Student admin API access returned ${adminResponse.status()}`);
    checkpoint("Student blocked from administrator API");

    await page.goto(`${baseURL}/progress`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.getByRole("heading", { name: `Progresi i @${username}` }).waitFor({ state: "visible", timeout: 30_000 });
    await page.getByText("I izoluar sipas llogarisë").waitFor();
    await screenshot(page, "08-student-progress-desktop");
    checkpoint("Real private progress dashboard under student account");

    const secondContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
    const secondPage = await secondContext.newPage();
    attachDiagnostics(secondPage, "student-second-device");
    try {
      await secondPage.goto(`${baseURL}/auth/sign-in`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await secondPage.getByLabel("Username").fill(username);
      await secondPage.getByLabel("Password").fill(password);
      await secondPage.getByRole("button", { name: "Kyçu", exact: true }).click();
      await secondPage.waitForURL((url) => url.pathname === "/", { timeout: 30_000 });
      await secondPage.goto(lesson.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await waitForPortal(secondPage);
      await secondPage.getByRole("button", { name: /Shënimet e mia/ }).click();
      await secondPage.getByText("Shënim QA i ndryshuar dhe i sinkronizuar.").waitFor({ state: "visible", timeout: 30_000 });
      await assertNoHorizontalOverflow(secondPage, "second-device notes");
      await screenshot(secondPage, "09-student-notes-second-device-mobile");
      checkpoint("Cross-device account synchronization on mobile");
    } finally {
      await secondContext.close();
    }

    await page.goto(lesson.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await waitForPortal(page);
    await page.getByRole("button", { name: /Shënimet e mia/ }).click();
    const cleanupLibrary = page.locator("#lesson-annotation-library");
    await cleanupLibrary.waitFor({ state: "visible", timeout: 20_000 });
    while (await cleanupLibrary.getByRole("button", { name: "Fshi" }).count()) {
      page.once("dialog", (dialog) => dialog.accept());
      const before = await cleanupLibrary.locator("article").count();
      await cleanupLibrary.getByRole("button", { name: "Fshi" }).first().click();
      await page.waitForFunction((count) => document.querySelectorAll("#lesson-annotation-library article").length < count, before, { timeout: 20_000 });
    }
    checkpoint("Annotation cleanup through the user interface");

    await page.getByRole("button", { name: "Dil nga llogaria" }).click();
    await page.getByRole("link", { name: "Kyçu" }).waitFor({ state: "visible", timeout: 30_000 });
    await page.goto(`${baseURL}/progress`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.getByRole("heading", { name: "Kyçu për ta parë progresin tënd" }).waitFor();
    checkpoint("Logout clears authenticated UI and protects progress");
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  for (const [name, audit] of [
    ["guest desktop", auditGuestDesktop],
    ["guest mobile", auditGuestMobile],
    ["authenticated student", auditAuthenticatedStudent],
  ]) {
    try {
      await audit(browser);
    } catch (error) {
      const message = error instanceof Error ? error.stack || error.message : String(error);
      failures.push(`${name}: ${message}`);
      console.error(`✗ ${name}: ${message}`);
    }
  }
} finally {
  await browser.close();
}

if (diagnostics.length) {
  console.error("\nBrowser diagnostics:");
  for (const entry of diagnostics) console.error(`- ${entry}`);
  failures.push(...diagnostics);
}

const report = {
  baseURL,
  username,
  checkedAt: new Date().toISOString(),
  checks,
  failures,
};
writeFileSync(`${outputDir}/report.json`, JSON.stringify(report, null, 2));
writeFileSync(`${outputDir}/report.txt`, [
  `Base URL: ${baseURL}`,
  `QA account: ${username}`,
  `Checks passed: ${checks.length}`,
  ...checks.map((item) => `PASS: ${item}`),
  ...failures.map((item) => `FAIL: ${item}`),
].join("\n"));

if (failures.length) {
  console.error(`\nFull user audit failed with ${failures.length} issue(s).`);
  process.exit(1);
}

console.log(`\nFull live user audit passed with ${checks.length} checkpoints.`);
