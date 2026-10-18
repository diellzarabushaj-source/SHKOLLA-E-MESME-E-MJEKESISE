import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const failures = [];

const fixturePortal = [
  {
    _id: "grade-10",
    title: "Klasa 10",
    gradeNumber: 10,
    slug: "klasa-10",
    shortDescription: "Bazat e mjekësisë.",
    icon: "10",
    subjects: [],
  },
  {
    _id: "grade-11",
    title: "Klasa 11",
    gradeNumber: 11,
    slug: "klasa-11",
    shortDescription: "Vazhdimi i mësimit.",
    icon: "11",
    subjects: [],
  },
  {
    _id: "grade-12",
    title: "Klasa 12",
    gradeNumber: 12,
    slug: "klasa-12",
    shortDescription: "Përgatitja përfundimtare.",
    icon: "12",
    subjects: [],
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function installSanityFixture(context) {
  await context.route(/https:\/\/[^/]*sanity\.io\/.*/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
      return;
    }
    if (url.pathname.includes("/data/listen/")) {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: { "access-control-allow-origin": "*" },
        body: "event: welcome\ndata: {}\n\n",
      });
      return;
    }
    const query = url.searchParams.get("query") || "";
    const result = query.includes('_type == "grade"') ? fixturePortal : [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*", "cache-control": "no-store" },
      body: JSON.stringify({ ms: 1, query, result }),
    });
  });
}

function watchPage(page, label) {
  page.on("pageerror", (error) => failures.push(`${label}: uncaught browser error: ${error.message}`));
}

async function auditPublicInfrastructure(browser) {
  const context = await browser.newContext({ serviceWorkers: "block" });
  try {
    const manifest = await context.request.get(`${baseURL}/manifest.webmanifest`);
    assert(manifest.ok(), `manifest returned ${manifest.status()}`);
    assert((manifest.headers()["content-type"] || "").includes("application/manifest+json") || (manifest.headers()["content-type"] || "").includes("application/json"), "manifest content type is invalid");
    const manifestBody = await manifest.json();
    assert(manifestBody.start_url === "/", "manifest start_url is not /");

    const worker = await context.request.get(`${baseURL}/sw.js`);
    assert(worker.ok(), `service worker returned ${worker.status()}`);
    assert((await worker.text()).includes("PRIVATE_PATHS"), "service worker is missing private-route protection");

    const offline = await context.request.get(`${baseURL}/offline`);
    assert(offline.ok(), `offline page returned ${offline.status()}`);

    const progress = await context.request.get(`${baseURL}/api/progress`);
    assert(progress.status() === 401, `guest progress endpoint should return 401, got ${progress.status()}`);
    assert((progress.headers()["cache-control"] || "").includes("no-store"), "guest progress response is cacheable");

    const annotations = await context.request.get(`${baseURL}/api/annotations?lessonId=lesson-cells`);
    assert(annotations.status() === 401, `guest annotations endpoint should return 401, got ${annotations.status()}`);
    assert((annotations.headers()["cache-control"] || "").includes("no-store"), "guest annotations response is cacheable");

    const annotationsWithoutOrigin = await context.request.post(`${baseURL}/api/annotations`, {
      data: {
        lessonId: "lesson-cells",
        kind: "highlight",
        blockKey: "block-cells",
        startOffset: 0,
        endOffset: 6,
        quote: "Qeliza",
        prefix: "",
        suffix: " është",
        color: "yellow",
      },
    });
    assert(annotationsWithoutOrigin.status() === 403, `annotation write without same-origin header should return 403, got ${annotationsWithoutOrigin.status()}`);
    assert((annotationsWithoutOrigin.headers()["cache-control"] || "").includes("no-store"), "invalid-origin annotation response is cacheable");

    const adminRead = await context.request.get(`${baseURL}/api/admin/lessons/lesson-cells`);
    assert(adminRead.status() === 401, `guest admin read should return 401, got ${adminRead.status()}`);
    assert((adminRead.headers()["cache-control"] || "").includes("no-store"), "guest admin read is cacheable");

    const adminWithoutOrigin = await context.request.patch(`${baseURL}/api/admin/lessons/lesson-cells`, {
      data: { revision: "fixture", body: [] },
    });
    assert(adminWithoutOrigin.status() === 403, `admin write without same-origin header should return 403, got ${adminWithoutOrigin.status()}`);

    const page = await context.newPage();
    watchPage(page, "infrastructure shell");
    await page.goto(`${baseURL}/offline`, { waitUntil: "domcontentloaded" });
    const privateWritesAsGuest = await page.evaluate(async () => {
      const [adminResponse, annotationResponse] = await Promise.all([
        fetch("/api/admin/lessons/lesson-cells", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revision: "fixture", body: [] }),
        }),
        fetch("/api/annotations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId: "lesson-cells",
            kind: "highlight",
            blockKey: "block-cells",
            startOffset: 0,
            endOffset: 6,
            quote: "Qeliza",
            prefix: "",
            suffix: " është",
            color: "yellow",
          }),
        }),
      ]);
      return {
        admin: {
          status: adminResponse.status,
          cacheControl: adminResponse.headers.get("cache-control") || "",
        },
        annotation: {
          status: annotationResponse.status,
          cacheControl: annotationResponse.headers.get("cache-control") || "",
        },
      };
    });
    assert(privateWritesAsGuest.admin.status === 401, `same-origin guest admin write should return 401, got ${privateWritesAsGuest.admin.status}`);
    assert(privateWritesAsGuest.admin.cacheControl.includes("no-store"), "same-origin guest admin write response is cacheable");
    assert(privateWritesAsGuest.annotation.status === 401, `same-origin guest annotation write should return 401, got ${privateWritesAsGuest.annotation.status}`);
    assert(privateWritesAsGuest.annotation.cacheControl.includes("no-store"), "same-origin guest annotation write response is cacheable");

    console.log("✓ PWA assets and private API boundaries");
  } finally {
    await context.close();
  }
}

async function auditServiceWorkerRegistration(browser) {
  const context = await browser.newContext({ serviceWorkers: "allow" });
  const page = await context.newPage();
  watchPage(page, "service worker shell");
  try {
    await page.goto(`${baseURL}/offline`, { waitUntil: "domcontentloaded" });
    let registered = false;

    for (let attempt = 0; attempt < 4 && !registered; attempt += 1) {
      try {
        await page.waitForLoadState("domcontentloaded");
        registered = await page.evaluate(async () => {
          if (!("serviceWorker" in navigator)) return false;
          const registration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => setTimeout(() => reject(new Error("service worker readiness timeout")), 15_000)),
          ]);
          return registration instanceof ServiceWorkerRegistration
            && Boolean(registration.active || registration.waiting || registration.installing);
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("Execution context was destroyed") && !message.includes("frame was detached")) throw error;
        await page.waitForTimeout(250);
      }
    }

    assert(registered, "service worker did not register after controller reload");
    console.log("✓ service worker registration and controller reload");
  } finally {
    await context.close();
  }
}

async function auditThemeAndDesktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  await installSanityFixture(context);
  const page = await context.newPage();
  watchPage(page, "desktop shell");
  try {
    await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });
    await page.locator("#main-content #klasat").waitFor({ state: "visible", timeout: 20_000 });

    const duplicateIds = await page.evaluate(() => {
      const activeElements = Array.from(document.querySelectorAll("[id]")).filter((element) => {
        if (!(element instanceof HTMLElement)) return true;
        if (element.closest("[hidden], [inert], [aria-hidden=\"true\"]")) return false;
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
      });
      const ids = activeElements.map((element) => element.id).filter(Boolean);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    });
    assert(duplicateIds.length === 0, `duplicate DOM ids: ${JSON.stringify([...new Set(duplicateIds)])}`);
    assert(await page.locator("[data-lesson-annotations]").count() === 0, "guest homepage unexpectedly mounted private annotation controls");

    const toggle = page.locator('button.theme-switch[type="button"]');
    await toggle.waitFor({ state: "visible" });
    const beforeTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    const beforeURL = page.url();
    await toggle.click();
    const afterTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    const storedTheme = await page.evaluate(() => localStorage.getItem("flashcards-theme"));
    assert(afterTheme && afterTheme !== beforeTheme, "theme button did not change theme");
    assert(storedTheme === afterTheme, "theme choice was not persisted");
    assert(page.url() === beforeURL, "theme button changed navigation or activated a neighboring control");

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
    assert(manifestHref === "/manifest.webmanifest", `manifest link is incorrect: ${manifestHref}`);

    console.log("✓ desktop shell and theme isolation");
  } finally {
    await context.close();
  }
}

async function auditCollapsibleSidebar(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
  await installSanityFixture(context);
  const page = await context.newPage();
  watchPage(page, "collapsible sidebar");
  const contentLeft = () => page.locator("#main-content").evaluate((element) => Math.round(element.getBoundingClientRect().left));
  try {
    await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });
    const collapse = page.getByRole("button", { name: "Minimizo menunë", exact: true });
    await collapse.waitFor({ state: "visible" });
    assert(await contentLeft() === 224, "expanded sidebar does not reserve the expected content space");
    await collapse.click();
    const expand = page.getByRole("button", { name: "Zgjero menunë", exact: true });
    await expand.waitFor({ state: "visible" });
    assert(await expand.getAttribute("aria-expanded") === "false", "collapsed sidebar has an incorrect expanded state");
    assert(await contentLeft() === 80, "collapsing the sidebar did not free content space");
    const links = page.locator("#desktop-navigation a");
    assert(await links.count() === 3, "collapsed sidebar lost a navigation destination");
    for (const link of await links.all()) {
      const target = await link.boundingBox();
      assert(target && target.width >= 44 && target.height >= 44, "collapsed navigation target is too small");
      assert(Boolean(await link.getAttribute("aria-label")), "icon navigation is missing an accessible name");
    }
    await page.reload({ waitUntil: "domcontentloaded" });
    await expand.waitFor({ state: "visible" });
    assert(await contentLeft() === 80, "collapsed preference did not survive refresh");
    await page.locator("#desktop-navigation").getByRole("link", { name: "Progresi im", exact: true }).click();
    await page.waitForURL("**/progress");
    assert(await contentLeft() === 80, "route navigation reset the collapsed sidebar");
    await page.setViewportSize({ width: 390, height: 844 });
    assert(!await expand.isVisible(), "desktop collapse control is visible on mobile");
    assert(await page.locator("nav.mobile-navigation").isVisible(), "collapsed desktop preference hid mobile navigation");
    assert(await contentLeft() === 0, "collapsed desktop preference left a gap on mobile");
    await page.setViewportSize({ width: 1440, height: 900 });
    await expand.click();
    await collapse.waitFor({ state: "visible" });
    assert(await collapse.getAttribute("aria-expanded") === "true", "expanded sidebar has an incorrect expanded state");
    assert(await contentLeft() === 224, "expanding did not restore the sidebar");
    console.log("✓ sidebar collapse, saved preference, route navigation and mobile isolation");
  } finally {
    await context.close();
  }
}

async function auditAppRefinement(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", reducedMotion: "reduce" });
  await installSanityFixture(context);
  const page = await context.newPage();
  watchPage(page, "app refinement");
  try {
    await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });
    await page.locator("[data-campus-card]").first().waitFor({ state: "visible" });
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      const geometry = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        brandRight: document.querySelector(".brand").getBoundingClientRect().right,
        actionsLeft: document.querySelector(".header-actions").getBoundingClientRect().left,
      }));
      assert(geometry.scrollWidth <= geometry.width + 2, `refined shell overflows at ${width}px`);
      assert(geometry.brandRight <= geometry.actionsLeft + 2, `header controls overlap the brand at ${width}px`);
    }
    await page.setViewportSize({ width: 390, height: 360 });
    await page.locator("[data-campus-card]").last().scrollIntoViewIfNeeded();
    const topButton = page.getByRole("button", { name: "Kthehu në krye", exact: true });
    await topButton.waitFor({ state: "visible" });
    const box = await topButton.boundingBox();
    assert(box && box.width >= 44 && box.height >= 44, "back-to-top touch target is too small");
    await topButton.click();
    await page.waitForFunction(() => window.scrollY === 0);
    assert(await page.evaluate(() => document.activeElement?.id === "main-content"), "back-to-top did not return keyboard focus to content");
    assert(!await topButton.isVisible(), "back-to-top stayed visible at the beginning of the page");
    console.log("✓ refined shell at 320/390/768/1024/1440px and accessible reduced-motion return to top");
  } finally {
    await context.close();
  }
}

async function auditMobileShell(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  await installSanityFixture(context);
  const page = await context.newPage();
  watchPage(page, "mobile shell");
  try {
    await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });
    await page.locator("#main-content #klasat").waitFor({ state: "visible", timeout: 20_000 });
    await page.locator("nav.mobile-navigation").waitFor({ state: "visible", timeout: 10_000 });

    const geometry = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    assert(geometry.documentWidth <= geometry.viewport + 2, `mobile document overflows horizontally: ${JSON.stringify(geometry)}`);
    assert(geometry.bodyWidth <= geometry.viewport + 2, `mobile body overflows horizontally: ${JSON.stringify(geometry)}`);

    const touchTargets = await page.locator("nav.mobile-navigation a").evaluateAll((links) => links.map((link) => {
      const rect = link.getBoundingClientRect();
      return { label: link.getAttribute("aria-label") || link.textContent || "link", width: rect.width, height: rect.height };
    }));
    for (const target of touchTargets) {
      assert(target.width >= 40 && target.height >= 40, `mobile touch target is too small: ${JSON.stringify(target)}`);
    }

    console.log("✓ mobile shell, overflow and touch targets");
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  await auditPublicInfrastructure(browser).catch((error) => failures.push(error instanceof Error ? error.message : "infrastructure audit failed"));
  await auditServiceWorkerRegistration(browser).catch((error) => failures.push(error instanceof Error ? error.message : "service worker audit failed"));
  await auditThemeAndDesktop(browser).catch((error) => failures.push(error instanceof Error ? error.message : "desktop smoothness audit failed"));
  await auditCollapsibleSidebar(browser).catch((error) => failures.push(error instanceof Error ? error.message : "sidebar collapse audit failed"));
  await auditAppRefinement(browser).catch((error) => failures.push(error instanceof Error ? error.message : "app refinement audit failed"));
  await auditMobileShell(browser).catch((error) => failures.push(error instanceof Error ? error.message : "mobile smoothness audit failed"));
} finally {
  await browser.close();
}

if (failures.length) {
  console.error("\nBrowser smoothness audit failed:");
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Browser smoothness audit passed.");
await import("./e2e-auth.mjs");
