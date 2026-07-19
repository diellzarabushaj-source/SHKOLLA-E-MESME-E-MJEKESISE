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
  letterHeading: "A. Qarkullimi arterial",
  parenthesizedHeading: "(a) Shtresa e Brendshme",
  detail: "3.6.1. Ndërtimi i murit arterial",
  paragraph: "Arteriet përçojnë gjakun nga zemra kah periferia e trupit.",
  falseHeading: "Arteriet dhe venat lidhen përmes kapilarëve",
  numberedOne: "1. Arteriet përçojnë gjakun nga zemra kah periferia",
  numberedTwo: "2. Venat e kthejnë gjakun drejt zemrës",
  callout: "Mbaje mend: Teksti i Sanity-t mbetet i pandryshuar.",
  labelHeading: "Metodat e studimit anatomik",
  sanityHeading: "Nëntitull i caktuar drejtpërdrejt në Sanity",
  sanityH1: "Titull i trupit i vendosur si H1 në Sanity",
  topLetter: "C. SISTEMI VENOR",
};

async function exactText(locator, value, label) {
  await locator.waitFor({state: "visible", timeout: 10_000});
  const actual = await locator.evaluate((element) => element.textContent || "");
  assert(actual === value, `${label} changed. Expected ${JSON.stringify(value)}, received ${JSON.stringify(actual)}`);
}

async function savedState(page) {
  const saved = await page.evaluate((key) => window.localStorage.getItem(key), storageKey);
  return JSON.parse(saved || "{}");
}

const browser = await chromium.launch({headless: true});
try {
  const context = await browser.newContext({
    viewport: {width: 1280, height: 900},
    serviceWorkers: "block",
  });
  await context.addInitScript(({key}) => {
    if (window.sessionStorage.getItem("learning-audit-seeded") === "1") return;
    window.sessionStorage.setItem("learning-audit-seeded", "1");
    window.localStorage.setItem(key, JSON.stringify({
      version: 2,
      visited: ["seksioni-qe-nuk-ekziston"],
      completed: true,
      signature: "v2-permbajtje-e-vjeter",
      lastHeading: "seksioni-qe-nuk-ekziston",
      readingProgress: 100,
    }));
  }, {key: storageKey});

  const page = await context.newPage();
  await page.goto(`${baseURL}/learning-experience-audit`, {waitUntil: "domcontentloaded"});
  await page.locator("[data-learning-experience]").waitFor({state: "visible", timeout: 10_000});
  await page.waitForFunction(() => {
    const element = document.querySelector("[data-learning-experience]");
    return Boolean(element?.getAttribute("data-content-signature"))
      && element?.getAttribute("data-content-current") === "true";
  });

  await page.getByRole("button", {name: "Shëno si të përfunduar"}).waitFor({state: "visible"});
  await page.waitForFunction((key) => {
    const state = JSON.parse(window.localStorage.getItem(key) || "{}");
    return state.completed === false
      && typeof state.signature === "string"
      && state.signature.startsWith("v2-");
  }, storageKey);
  const resetState = await savedState(page);
  assert(resetState.completed === false, "A changed Sanity lesson remained incorrectly completed");
  assert(!resetState.visited.includes("seksioni-qe-nuk-ekziston"), "Stale sections survived a content change");
  assert(resetState.readingProgress < 100, "Stale 100% progress survived a content change");

  assert(await page.locator("h1").count() === 1, "The lesson page must contain exactly one H1");
  assert(await page.locator("[data-learning-audit-article] h1").count() === 0, "Sanity body content created a second H1");
  await exactText(page.locator("h1[data-audit-lesson-title]"), expected.title, "Lesson H1");

  await exactText(page.locator('h2[data-learning-source-key="audit-section"][data-heading-source="section"]'), expected.section, "Automatic H2");
  await exactText(page.locator('h3[data-learning-source-key="audit-subsection"][data-heading-source="numbered"]'), expected.subsection, "Automatic H3");
  await exactText(page.locator('h4[data-learning-source-key="audit-letter-heading"][data-heading-source="letter"]'), expected.letterHeading, "Letter H4");
  await exactText(page.locator('h4[data-learning-source-key="audit-parenthesized-heading"][data-heading-source="parenthesized"]'), expected.parenthesizedHeading, "Parenthesized H4");
  await exactText(page.locator('h4[data-learning-source-key="audit-detail"][data-heading-source="numbered"]'), expected.detail, "Automatic detail H4");
  await exactText(page.locator('h4[data-learning-source-key="audit-label-heading"]'), expected.labelHeading, "Inferred medical H4");
  await exactText(page.locator('h3[data-learning-source-key="audit-sanity-heading"][data-heading-source="sanity"]'), expected.sanityHeading, "Explicit Sanity H3");
  await exactText(page.locator('h2[data-learning-source-key="audit-sanity-h1"][data-heading-source="sanity"]'), expected.sanityH1, "Demoted Sanity body H1");
  await exactText(page.locator('h2[data-learning-source-key="audit-top-letter"][data-heading-source="letter"]'), expected.topLetter, "Top-level letter H2");

  await exactText(page.locator('[data-learning-source-key="audit-paragraph"]'), expected.paragraph, "Paragraph");
  await exactText(page.locator('[data-learning-source-key="audit-false-heading"]'), expected.falseHeading, "Sentence without punctuation");
  await exactText(page.locator('[data-learning-source-key="audit-numbered-sentence-one"]'), expected.numberedOne, "First numbered sentence");
  await exactText(page.locator('[data-learning-source-key="audit-numbered-sentence-two"]'), expected.numberedTwo, "Second numbered sentence");
  await exactText(page.locator('[data-learning-source-key="audit-callout"][data-learning-callout="remember"]'), expected.callout, "Learning callout");

  for (const key of ["audit-paragraph", "audit-false-heading", "audit-numbered-sentence-one", "audit-numbered-sentence-two"]) {
    const element = page.locator(`[data-learning-source-key="${key}"]`);
    assert(await element.evaluate((node) => node.tagName) === "P", `${key} was misclassified as a heading`);
  }

  assert(await page.locator('[data-source-preserved="true"]').count() >= 13, "Exact-source preservation markers are missing");
  assert(await page.locator('[data-learning-heading="true"]').count() === 9, "The whole-lesson renderer did not create the expected hierarchy");

  const outline = page.locator("details").filter({hasText: "Harta e mësimit"});
  await outline.locator("summary").click();
  assert(await outline.locator("nav button").count() === 9, "The lesson map does not contain every heading");
  await outline.getByRole("button", {name: new RegExp(expected.detail)}).click();
  assert(!(await outline.getAttribute("open")), "The lesson map stayed open after selecting a section");

  await page.waitForFunction((key) => {
    const state = JSON.parse(window.localStorage.getItem(key) || "{}");
    return typeof state.lastHeading === "string"
      && state.lastHeading.includes("ndertimi-i-murit-arterial")
      && state.readingProgress > 0;
  }, storageKey);
  const progressed = await savedState(page);
  const furthestProgress = progressed.readingProgress;
  assert(furthestProgress > 0 && furthestProgress < 100, "Reading progress was not captured before completion");

  await page.evaluate(() => window.scrollTo({top: 0, behavior: "auto"}));
  await page.waitForTimeout(350);
  const afterScrollBack = await savedState(page);
  assert(afterScrollBack.readingProgress >= furthestProgress, "Reading progress decreased while scrolling upward");

  await page.reload({waitUntil: "domcontentloaded"});
  await page.locator("[data-learning-experience]").waitFor({state: "visible", timeout: 10_000});
  const resume = page.getByRole("button", {name: "Vazhdo te seksioni i fundit"});
  await resume.waitFor({state: "visible"});
  await resume.click();
  await page.waitForFunction(() => {
    const heading = document.querySelector('[data-learning-source-key="audit-detail"]');
    if (!heading) return false;
    const box = heading.getBoundingClientRect();
    return box.top >= -20 && box.top < 430;
  });

  const completion = page.getByRole("button", {name: "Shëno si të përfunduar"});
  await completion.click();
  const progress = page.getByRole("progressbar", {name: "Progresi i leximit"});
  assert(await progress.getAttribute("aria-valuenow") === "100", "Completing the lesson did not set progress to 100%");
  await page.getByRole("button", {name: "✓ Përfunduar"}).waitFor({state: "visible"});

  await page.waitForFunction((key) => {
    const state = JSON.parse(window.localStorage.getItem(key) || "{}");
    return state.completed === true
      && state.readingProgress === 100
      && Array.isArray(state.visited)
      && state.visited.length === 9;
  }, storageKey);
  const completedState = await savedState(page);
  assert(completedState.version === 2, "Learning progress was not saved with schema version 2");
  assert(completedState.completed === true, "Completion was not saved locally");
  assert(completedState.signature === await page.locator("[data-learning-experience]").getAttribute("data-content-signature"), "Saved progress is not tied to the current content");
  assert(completedState.visited.length === 9, "Not every detected section was saved as visited");

  await page.reload({waitUntil: "domcontentloaded"});
  await page.locator("[data-learning-experience]").waitFor({state: "visible", timeout: 10_000});
  const restored = page.getByRole("button", {name: "✓ Përfunduar"});
  await restored.waitFor({state: "visible"});
  assert(await restored.isDisabled(), "Completed state was not restored after reload");
  assert(await page.getByRole("button", {name: "Vazhdo te seksioni i fundit"}).count() === 0, "Resume remained visible after completion");

  await context.close();
} finally {
  await browser.close();
}

console.log("Perfect future-Sanity hierarchy, exact text, false-positive protection, content reset, resume and persistence passed in Chromium.");
