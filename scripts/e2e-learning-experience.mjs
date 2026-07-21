import {chromium} from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const storageKey = "medical-lesson-learning-v1:learning-experience-audit-lesson";
const assert = (value, message) => {
  if (!value) throw new Error(message);
};

const expected = {
  title: "1.1. Hierarkia automatike e mësimit",
  section: "SISTEMI I ENËVE",
  subsection: "3.6. Arteriet",
  detail: "3.6.1. Ndërtimi i murit arterial",
  paragraph: "Arteriet përçojnë gjakun nga zemra kah periferia e trupit.",
  callout: "Mbaje mend: Teksti i Sanity-t mbetet i pandryshuar.",
  sanityHeading: "Nëntitull i caktuar drejtpërdrejt në Sanity",
};

async function exactText(locator, value, label) {
  await locator.waitFor({state: "visible", timeout: 10_000});
  const actual = await locator.evaluate((element) => element.textContent || "");
  assert(actual === value, `${label} changed. Expected ${JSON.stringify(value)}, received ${JSON.stringify(actual)}`);
}

const browser = await chromium.launch({headless: true});
try {
  const context = await browser.newContext({
    viewport: {width: 1280, height: 900},
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/learning-experience-audit`, {waitUntil: "domcontentloaded"});
  const workspace = page.locator("[data-learning-experience]");
  await workspace.waitFor({state: "visible", timeout: 10_000});

  assert(await page.locator("h1").count() === 1, "The lesson page must contain exactly one H1 title");
  assert(await page.locator("[data-learning-audit-article] h1").count() === 0, "Sanity body content must never create another H1");
  await exactText(workspace.locator("h1"), expected.title, "Lesson H1");

  const firstHeadingTag = await workspace.locator("h1,h2,h3,h4").first().evaluate((element) => element.tagName);
  assert(firstHeadingTag === "H1", `The lesson heading order starts with ${firstHeadingTag}, not H1`);
  assert(await workspace.locator("aside h2").count() === 0, "The sidebar introduces an H2 before the lesson title");

  const automaticH2 = page.locator('h2[data-learning-heading="true"][data-heading-source="uppercase"]');
  const automaticH3 = page.locator('h3[data-learning-heading="true"][data-heading-source="numbered"]');
  const automaticH4 = page.locator('h4[data-learning-heading="true"][data-heading-source="numbered"]');
  const sanityH3 = page.locator('h3[data-learning-heading="true"][data-heading-source="sanity"]');

  await exactText(automaticH2, expected.section, "Automatic H2");
  await exactText(automaticH3, expected.subsection, "Automatic H3");
  await exactText(automaticH4, expected.detail, "Automatic H4");
  await exactText(sanityH3, expected.sanityHeading, "Sanity H3");

  await exactText(page.locator('[data-learning-paragraph="true"]'), expected.paragraph, "Paragraph");
  await exactText(page.locator('[data-learning-callout="remember"]'), expected.callout, "Learning callout");

  assert(await page.locator('[data-source-preserved="true"]').count() >= 2, "Source-preservation markers are missing");
  assert(await page.locator('[data-learning-heading="true"]').count() === 4, "The learning engine did not produce the expected four-section hierarchy");

  const desktopOutline = workspace.locator("aside nav");
  assert(await desktopOutline.locator("button").count() === 4, "The desktop lesson outline does not contain every detected heading");
  assert(await desktopOutline.locator('button[data-level="2"]').count() === 1, "The desktop outline is missing its H2 level");
  assert(await desktopOutline.locator('button[data-level="3"]').count() === 2, "The desktop outline is missing its H3 levels");
  assert(await desktopOutline.locator('button[data-level="4"]').count() === 1, "The desktop outline is missing its H4 level");

  await page.setViewportSize({width: 390, height: 844});
  const mobileOutline = page.locator("details").filter({hasText: "Përmbajtja e mësimit"});
  await mobileOutline.locator("summary").click();
  assert(await mobileOutline.locator("nav button").count() === 4, "The mobile lesson outline does not contain every detected heading");

  const subsectionButton = mobileOutline.getByRole("button", {name: /3\.6\. Arteriet/});
  const subsectionId = await automaticH3.getAttribute("id");
  await subsectionButton.click();
  assert(!(await mobileOutline.getAttribute("open")), "The mobile lesson outline stayed open after navigation");
  await page.waitForFunction((id) => document.activeElement?.id === id, subsectionId);

  const progress = page.getByRole("progressbar", {name: "Progresi i leximit"});
  const automaticProgress = Number(await progress.getAttribute("aria-valuenow"));
  assert(automaticProgress < 100, "Automatic reading progress reached 100% before explicit completion");

  const completion = page.getByRole("button", {name: "Shëno si të përfunduar"});
  await completion.click();
  assert(await progress.getAttribute("aria-valuenow") === "100", "Completing the lesson did not set progress to 100%");
  const restoredButton = page.getByRole("button", {name: "Përfunduar"});
  await restoredButton.waitFor({state: "visible"});
  assert(await restoredButton.isDisabled(), "Completed action is not disabled");

  const saved = await page.evaluate((key) => window.localStorage.getItem(key), storageKey);
  const parsed = JSON.parse(saved || "{}");
  assert(parsed.completed === true, "Per-lesson completion was not saved locally");
  assert(Array.isArray(parsed.visited) && parsed.visited.length === 4, "Visited sections were not saved for every detected heading");

  await page.reload({waitUntil: "domcontentloaded"});
  await page.locator("[data-learning-experience]").waitFor({state: "visible", timeout: 10_000});
  const restored = page.getByRole("button", {name: "Përfunduar"});
  await restored.waitFor({state: "visible"});
  assert(await restored.isDisabled(), "Completed state was not restored after reload");

  await context.close();
} finally {
  await browser.close();
}

console.log("Automatic H1/H2/H3/H4 hierarchy, exact Sanity text preservation, responsive outline navigation, truthful progress and persistence passed in Chromium.");
