import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const root = process.cwd();
const failures = [];

const fixtureLessonSummary = {
  _id: "lesson-cells",
  _rev: "fixture-revision-1",
  title: "Qeliza",
  slug: "qeliza",
  summary: "Hyrje logjike në strukturën dhe funksionin e qelizës.",
  flashcardCount: 1,
};

const fixtureLessonDetails = {
  ...fixtureLessonSummary,
  body: [
    {
      _key: "block-cells",
      _type: "block",
      style: "normal",
      markDefs: [],
      children: [
        {
          _key: "span-cells",
          _type: "span",
          text: "Qeliza është njësia themelore strukturore dhe funksionale e organizmit.",
          marks: [],
        },
      ],
    },
  ],
  recording: {
    title: "Audio e mësimit Qeliza",
    url: "data:audio/mpeg;base64,",
    originalFilename: "qeliza.mp3",
  },
};

const fixtureDecks = [
  {
    _id: fixtureLessonSummary._id,
    title: fixtureLessonSummary.title,
    cards: [
      {
        _key: "card-cell-1",
        title: "Njësia themelore",
        front: "Cila është njësia themelore e organizmit?",
        back: "Qeliza.",
        explanation: "Indet dhe organet ndërtohen nga qelizat.",
        difficulty: "easy",
        tags: ["qeliza"],
        imageSide: "front",
      },
    ],
  },
];

const fixturePortal = [
  {
    _id: "grade-10",
    title: "Klasa 10",
    gradeNumber: 10,
    slug: "klasa-10",
    shortDescription: "Bazat e mjekësisë.",
    icon: "10",
    subjects: [
      {
        _id: "subject-anatomy",
        title: "Anatomi dhe Fiziologji",
        slug: "anatomi-dhe-fiziologji",
        shortDescription: "Struktura dhe funksioni i organizmit.",
        emoji: "🫀",
        chapters: [
          {
            _id: "chapter-cell",
            title: "Qeliza dhe organizimi",
            slug: "qeliza-dhe-organizimi",
            summary: "Nga qeliza te organizmi.",
            lessons: [fixtureLessonSummary],
          },
        ],
      },
    ],
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const absolute = path.join(directory, name);
    return statSync(absolute).isDirectory() ? walk(absolute) : [absolute];
  });
}

function routeForPage(file) {
  const relative = path.relative(path.join(root, "app"), path.dirname(file));
  const segments = relative === "" ? [] : relative.split(path.sep);
  const visible = segments.filter((segment) => !segment.startsWith("(") && !segment.startsWith("@"));
  if (visible.some((segment) => segment.startsWith("["))) return null;
  return `/${visible.join("/")}`.replace(/\/+/g, "/") || "/";
}

const staticRoutes = [...new Set(
  walk(path.join(root, "app"))
    .filter((file) => path.basename(file) === "page.tsx")
    .map(routeForPage)
    .filter(Boolean),
)].sort();

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
    let result = [];

    if (query.includes('_type == "grade"')) {
      result = fixturePortal;
    } else if (query.includes('"cards": flashcards')) {
      result = fixtureDecks;
    } else if (query.includes("body[]") && query.includes("$lessonId")) {
      result = fixtureLessonDetails;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin": "*",
        "cache-control": "no-store",
      },
      body: JSON.stringify({ ms: 1, query, result }),
    });
  });
}

async function waitForPortal(page) {
  await page.locator("main").first().waitFor({ state: "visible", timeout: 20_000 });
  await page.locator("main.loading-screen").waitFor({ state: "detached", timeout: 20_000 }).catch(() => {});
}

async function expectHome(page, label) {
  await waitForPortal(page);
  await page.locator("section.hero").waitFor({ state: "visible", timeout: 15_000 });
  const url = new URL(page.url());
  assert(url.pathname === "/", `${label}: expected homepage pathname, got ${url.pathname}`);
  assert(!url.search, `${label}: homepage still contains a learning-flow query: ${url.search}`);
  const savedGrade = await page.evaluate(() => localStorage.getItem("medical-portal-selected-grade"));
  assert(savedGrade === null, `${label}: saved grade was not cleared`);
}

async function expectClasses(page, label) {
  await waitForPortal(page);
  await page.locator("#klasat").waitFor({ state: "visible", timeout: 15_000 });
  const selectedPage = await page.locator("main.inner-page").count();
  assert(selectedPage === 0, `${label}: classes link reopened a saved grade instead of the class selector`);
}

async function clickFirstNestedPath(page) {
  await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });
  await waitForPortal(page);
  await page.evaluate(() => localStorage.removeItem("medical-portal-selected-grade"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await expectClasses(page, "initial class selector");

  const gradeButton = page.locator("#klasat button").first();
  await gradeButton.waitFor({ state: "visible", timeout: 15_000 });
  await gradeButton.click();
  await page.locator("main.inner-page").waitFor({ state: "visible" });
  const gradeURL = new URL(page.url());
  const gradeId = gradeURL.searchParams.get("grade");
  assert(gradeId, "grade selection did not create a grade history URL");

  const subjectButton = page.locator(".subject-card button").first();
  await subjectButton.waitFor({ state: "visible", timeout: 15_000 });
  await subjectButton.click();
  await page.locator("main.subject-page").waitFor({ state: "visible" });
  assert(new URL(page.url()).searchParams.get("subject"), "subject selection did not create a subject history URL");

  const chapterButton = page.locator(".chapter-row button").first();
  await chapterButton.waitFor({ state: "visible", timeout: 15_000 });
  await chapterButton.click();
  await page.locator(".chapter-hero").waitFor({ state: "visible" });
  assert(new URL(page.url()).searchParams.get("chapter"), "chapter selection did not create a chapter history URL");

  const lessonButton = page.getByRole("button", { name: "Hape mësimin" }).first();
  await lessonButton.waitFor({ state: "visible", timeout: 15_000 });
  await lessonButton.click();
  await page.locator('main[data-progress-page="lesson"]').waitFor({ state: "visible", timeout: 20_000 });
  assert(new URL(page.url()).searchParams.get("lesson"), "lesson selection did not create a lesson history URL");

  const lessonTitle = (await page.locator('main[data-progress-page="lesson"] h1').innerText()).trim();
  const lessonBody = (await page.locator('main[data-progress-page="lesson"] article').first().innerText()).trim();
  const hasAudio = await page.locator('main[data-progress-page="lesson"] audio').count();
  assert(lessonBody.includes("Qeliza është njësia themelore"), "full lesson body was not loaded before history testing");
  assert(hasAudio === 1, "lesson audio was not loaded before history testing");
  return { gradeId, lessonTitle, lessonBody, hasAudio };
}

async function auditStaticRoutes(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await installSanityFixture(context);
  for (const route of staticRoutes) {
    const page = await context.newPage();
    try {
      const response = await page.goto(`${baseURL}${route}`, { waitUntil: "domcontentloaded", timeout: 25_000 });
      assert(response, `${route}: no HTTP response`);
      assert(response.status() < 500, `${route}: returned HTTP ${response.status()}`);
      await page.locator('a.brand[href="/"]').waitFor({ state: "visible", timeout: 10_000 });
      await page.locator('a.brand[href="/"]').click();
      await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 });
      await waitForPortal(page);
      console.log(`✓ route escape: ${route}`);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : `${route}: unknown route error`);
    } finally {
      await page.close();
    }
  }
  await context.close();
}

async function auditDesktopFlow(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await installSanityFixture(context);
  const page = await context.newPage();
  try {
    const baselineHistory = await page.evaluate(() => history.length).catch(() => 0);
    const nested = await clickFirstNestedPath(page);
    const lessonURL = page.url();

    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.locator(".chapter-hero").waitFor({ state: "visible", timeout: 15_000 });
    assert(!new URL(page.url()).searchParams.get("lesson"), "Back from lesson did not return to chapter");

    await page.goForward({ waitUntil: "domcontentloaded" });
    await page.locator('main[data-progress-page="lesson"]').waitFor({ state: "visible", timeout: 20_000 });
    const restoredTitle = (await page.locator('main[data-progress-page="lesson"] h1').innerText()).trim();
    const restoredBody = (await page.locator('main[data-progress-page="lesson"] article').first().innerText()).trim();
    const restoredAudio = await page.locator('main[data-progress-page="lesson"] audio').count();
    assert(restoredTitle === nested.lessonTitle, "Forward restored a different lesson title");
    assert(restoredBody === nested.lessonBody, "Forward restored the lesson without the same full body content");
    assert(restoredAudio === nested.hasAudio, "Forward did not restore the lesson audio state");

    const studyButton = page.getByRole("button", { name: "Testo mësimin", exact: true });
    assert(await studyButton.count(), "lesson study button is missing");
    assert(await studyButton.isEnabled(), "lesson study button is unexpectedly disabled");
    await studyButton.click();
    await page.locator("main.study-page").waitFor({ state: "visible", timeout: 20_000 });
    assert(new URL(page.url()).searchParams.get("study") === "lesson", "study mode missing from browser history URL");
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.locator('main[data-progress-page="lesson"]').waitFor({ state: "visible", timeout: 20_000 });
    await page.goForward({ waitUntil: "domcontentloaded" });
    await page.locator("main.study-page").waitFor({ state: "visible", timeout: 20_000 });
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.locator('main[data-progress-page="lesson"]').waitFor({ state: "visible", timeout: 20_000 });

    await page.locator('a.brand[href="/"]').click();
    await expectHome(page, "brand Home from lesson");
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.locator('main[data-progress-page="lesson"]').waitFor({ state: "visible", timeout: 20_000 });
    assert(page.url() === lessonURL, "Back from Home did not restore the exact lesson URL");

    await page.locator('a[href="/#klasat"]').first().click();
    await expectClasses(page, "Classes from lesson");
    assert(new URL(page.url()).hash === "#klasat", "Classes did not preserve the #klasat destination");
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.locator('main[data-progress-page="lesson"]').waitFor({ state: "visible", timeout: 20_000 });

    await page.evaluate((gradeId) => localStorage.setItem("medical-portal-selected-grade", gradeId), nested.gradeId);
    await page.goto(`${baseURL}/#klasat`, { waitUntil: "domcontentloaded" });
    await expectClasses(page, "direct /#klasat with saved grade");

    await page.evaluate((gradeId) => localStorage.setItem("medical-portal-selected-grade", gradeId), nested.gradeId);
    await page.goto(`${baseURL}/progress`, { waitUntil: "domcontentloaded" });
    await page.locator('a.brand[href="/"]').click();
    await expectHome(page, "Home from /progress with saved grade");

    const finalHistory = await page.evaluate(() => history.length);
    assert(finalHistory >= baselineHistory, "browser history unexpectedly collapsed");
    console.log("✓ desktop nested flow, Home, Classes, Back and Forward");
  } finally {
    await context.close();
  }
}

async function auditMobileFlow(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await installSanityFixture(context);
  const page = await context.newPage();
  try {
    const nested = await clickFirstNestedPath(page);
    await page.goto(`${baseURL}/progress`, { waitUntil: "domcontentloaded" });
    await page.evaluate((gradeId) => localStorage.setItem("medical-portal-selected-grade", gradeId), nested.gradeId);

    const mobileNav = page.locator("nav.mobile-navigation");
    await mobileNav.waitFor({ state: "visible", timeout: 10_000 });
    await mobileNav.locator('a[href="/#klasat"]').click();
    await expectClasses(page, "mobile Classes from /progress");

    await page.locator("nav.mobile-navigation").locator('a[href="/progress"]').click();
    await page.waitForURL((url) => url.pathname === "/progress", { timeout: 15_000 });
    await page.locator("nav.mobile-navigation").locator('a[href="/"]').click();
    await expectHome(page, "mobile Home from /progress");
    console.log("✓ mobile navigation and saved-state escape");
  } finally {
    await context.close();
  }
}

async function auditNotFound(browser) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  await installSanityFixture(context);
  const page = await context.newPage();
  try {
    const response = await page.goto(`${baseURL}/navigation-audit-missing-page`, { waitUntil: "domcontentloaded" });
    assert(response?.status() === 404, `unknown route should return 404, got ${response?.status()}`);
    await page.locator('a.brand[href="/"]').click();
    await expectHome(page, "404 escape");
    console.log("✓ 404 escape to homepage");
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  await auditStaticRoutes(browser);
  await auditDesktopFlow(browser).catch((error) => failures.push(error instanceof Error ? error.message : "desktop flow failed"));
  await auditMobileFlow(browser).catch((error) => failures.push(error instanceof Error ? error.message : "mobile flow failed"));
  await auditNotFound(browser).catch((error) => failures.push(error instanceof Error ? error.message : "404 flow failed"));
} finally {
  await browser.close();
}

if (failures.length) {
  console.error("\nBrowser navigation audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Browser navigation audit passed across ${staticRoutes.length} static pages.`);
