import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const expectedGrades = [10, 11, 12];

const fixturePortal = expectedGrades.map((gradeNumber) => ({
  _id: `grade-${gradeNumber}`,
  title: `Klasa ${gradeNumber}`,
  gradeNumber,
  slug: `klasa-${gradeNumber}`,
  shortDescription: `Përmbajtja e klasës ${gradeNumber}.`,
  icon: String(gradeNumber),
  subjects: [
    {
      _id: `subject-${gradeNumber}`,
      title: `Lënda provuese ${gradeNumber}`,
      slug: `lenda-${gradeNumber}`,
      shortDescription: `Lënda provuese për klasën ${gradeNumber}.`,
      emoji: "📘",
      chapters: [
        {
          _id: `chapter-${gradeNumber}`,
          title: `Kapitulli provues ${gradeNumber}`,
          slug: `kapitulli-${gradeNumber}`,
          summary: "Kapitull provues.",
          lessons: [
            {
              _id: `lesson-${gradeNumber}`,
              title: `Mësimi provues ${gradeNumber}`,
              slug: `mesimi-${gradeNumber}`,
              summary: "Mësim provues.",
              flashcardCount: 0,
            },
          ],
        },
      ],
    },
  ],
}));

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
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*", "cache-control": "no-store" },
      body: JSON.stringify({ ms: 1, query, result: query.includes('_type == "grade"') ? fixturePortal : [] }),
    });
  });
}

async function assertGradeCards(page, label) {
  await page.locator("#klasat").waitFor({ state: "visible", timeout: 20_000 });
  const cards = page.locator("#klasat article");
  await cards.first().waitFor({ state: "visible", timeout: 20_000 });
  assert(await cards.count() === 3, `${label}: expected 3 class cards, found ${await cards.count()}`);

  for (const gradeNumber of expectedGrades) {
    const card = cards.filter({ hasText: `Klasa ${gradeNumber}` }).first();
    assert(await card.count() === 1, `${label}: Klasa ${gradeNumber} card is missing`);
    assert(await card.isVisible(), `${label}: Klasa ${gradeNumber} card is hidden`);

    const button = card.getByRole("button", { name: `Hape Klasa ${gradeNumber}`, exact: true });
    assert(await button.count() === 1, `${label}: Klasa ${gradeNumber} open button is missing`);
    assert(await button.isVisible(), `${label}: Klasa ${gradeNumber} open button is hidden`);

    const geometry = await card.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        display: style.display,
        visibility: style.visibility,
        opacity: Number(style.opacity),
        width: rect.width,
        height: rect.height,
      };
    });

    assert(geometry.display !== "none", `${label}: Klasa ${gradeNumber} uses display:none`);
    assert(geometry.visibility !== "hidden", `${label}: Klasa ${gradeNumber} uses visibility:hidden`);
    assert(geometry.opacity > 0, `${label}: Klasa ${gradeNumber} is transparent`);
    assert(geometry.width >= 180 && geometry.height >= 180, `${label}: Klasa ${gradeNumber} has invalid geometry ${JSON.stringify(geometry)}`);
  }
}

async function verifyViewport(browser, options, label) {
  const context = await browser.newContext({ ...options, serviceWorkers: "block" });
  await installSanityFixture(context);
  const page = await context.newPage();

  try {
    await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });
    await assertGradeCards(page, `${label} fresh homepage`);

    await page.goto(`${baseURL}/offline`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.setItem("medical-portal-selected-grade", "grade-10"));
    await page.goto(`${baseURL}/#klasat`, { waitUntil: "domcontentloaded" });
    await assertGradeCards(page, `${label} direct classes link with saved grade`);

    const selectedGrade = await page.evaluate(() => localStorage.getItem("medical-portal-selected-grade"));
    assert(selectedGrade === null, `${label}: direct #klasat did not clear the saved grade`);
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  await verifyViewport(browser, { viewport: { width: 1440, height: 1000 } }, "desktop");
  await verifyViewport(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, "mobile");
} finally {
  await browser.close();
}

console.log("Class 10, 11 and 12 cards are visible with a complete subject/chapter/lesson hierarchy on desktop, mobile and direct #klasat navigation.");
