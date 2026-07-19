import {chromium} from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const storageKey = "medical-lesson-learning-v2:learning-experience-audit-lesson";
const assert = (value, message) => {
  if (!value) throw new Error(message);
};

const expected = {
  title: "1.1. Hierarkia automatike e mësimit",
  section: "SISTEMI I ENËVE",
  letterHeading: "A. Qarkullimi arterial",
  parenthesizedHeading: "(a) Shtresa e Brendshme",
  subsection: "3.6. Arteriet",
  detail: "3.6.1. Ndërtimi i murit arterial",
  paragraph: "Arteriet përçojnë gjakun nga zemra kah periferia e trupit.",
  falseHeading: "Arteriet dhe venat lidhen përmes kapilarëve",
  numberedSentence: "1. Arteriet përçojnë gjakun nga zemra kah periferia",
  callout: "Mbaje mend: Teksti i Sanity-t mbetet i pandryshuar.",
  labelHeading: "Metodat e studimit anatomik",
  sanityHeading: "Nëntitull i caktuar drejtpërdrejt në Sanity",
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
      version: 3,
      revision: "audit-revision-old",
      signature: "v3-permbajtje-e-vjeter",
      visited: ["seksioni-qe-nuk-ekziston"],
      completed: true,
      lastHeading: "seksioni-qe-nuk-ekziston",
      readingProgress: 100,
    }));
  }, {key: storageKey});

  const page = await context.newPage();
  await page.goto(`${baseURL}/learning-experience-audit`, {waitUntil: "domcontentloaded"});
  await page.locator('[data-learning-experience="perfect-v3"]').waitFor({state: "visible", timeout: 10_000});
  await page.waitForFunction(() => {
    const element = document.querySelector("[data-learning-experience]");
    return Boolean(element?.getAttribute("data-content-signature")) && element?.getAttribute("data-content-current") === "true";
  });

  await page.getByRole("button", {name: "Shëno si të përfunduar"}).waitFor({state: "visible"});
  await page.waitForFunction((key) => {
    const state = JSON.parse(window.localStorage.getItem(key) || "{}");
    return state.completed === false
      && state.revision === "audit-revision-current"
      && typeof state.signature === "string"
      && state.signature.startsWith("v3-");
  }, storageKey);
  const resetState = await savedState(page);
  assert(resetState.completed === false, "A lesson changed in Sanity remained incorrectly completed");
  assert(!resetState.visited.includes("seksioni-qe-nuk-ekziston"), "Stale sections were not removed after content changed");
  assert(resetState.readingProgress < 100, "Stale 100% reading progress survived a content change");

  assert(await page.locator("h1").count() === 1, "The lesson page must contain exactly one H1 title");
  assert(await page.locator("[data-learning-audit-article] h1").count() === 0, "Sanity body content must never create another H1");
  await exactText(page.locator("h1[data-audit-lesson-title]"), expected.title, "Lesson H1");

  const automaticH2 = page.locator('h2[data-learning-heading="true"][data-heading-source="uppercase"]');
  const letterH3 = page.locator('h3[data-learning-heading="true"][data-heading-source="letter"]');
  const parenthesizedH4 = page.locator('h4[data-learning-heading="true"][data-heading-source="parenthesized"]');
  const automaticH3 = page.locator('h3[data-learning-heading="true"][data-heading-source="numbered"]');
  const automaticH4 = page.locator('h4[data-learning-heading="true"][data-heading-source="numbered"]');
  const labelH4 = page.locator('h4[data-learning-heading="true"][data-heading-source="label"]');
  const sanityH3 = page.locator('h3[data-learning-heading="true"][data-heading-source="sanity"]');

  await exactText(automaticH2, expected.section, "Automatic H2");
  await exactText(letterH3, expected.letterHeading, "Letter H3");
  await exactText(parenthesizedH4, expected.parenthesizedHeading, "Parenthesized H4");
  await exactText(automaticH3, expected.subsection, "Automatic H3");
  await exactText(automaticH4, expected.detail, "Automatic H4");
  await exactText(labelH4, expected.labelHeading, "Learning-label H4");
  await exactText(sanityH3, expected.sanityHeading, "Sanity H3");

  const paragraph = page.getByText(expected.paragraph, {exact: true});
  const falseHeading = page.getByText(expected.falseHeading, {exact: true});
  const numberedSentence = page.getByText(expected.numberedSentence, {exact: true});
  await exactText(paragraph, expected.paragraph, "Paragraph");
  await exactText(falseHeading, expected.falseHeading, "Verb sentence without punctuation");
  await exactText(numberedSentence, expected.numberedSentence, "Numbered sentence");
  await exactText(page.locator('[data-learning-callout="remember"]'), expected.callout, "Learning callout");
  assert(await falseHeading.evaluate((element) => element.tagName) === "P", "A normal sentence was misclassified as a heading");
  assert(await numberedSentence.evaluate((element) => element.tagName) === "P", "A numbered sentence was misclassified as a heading");

  assert(await page.locator('[data-source-preserved="true"]').count() >= 10, "Source-preservation markers are missing");
  assert(await page.locator('[data-learning-heading="true"]').count() === 7, "The production renderer did not produce the expected seven-section hierarchy");

  const outline = page.locator("details").filter({hasText: "Harta e mësimit"});
  await outline.locator("summary").click();
  assert(await outline.locator("nav button").count() === 7, "The lesson map does not contain every detected heading");
  await outline.getByRole("button", {name: new RegExp(expected.detail)}).click();
  assert(!(await outline.getAttribute("open")), "The lesson map stayed open after choosing a section");

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
  assert(afterScrollBack.readingProgress >= furthestProgress, "Reading progress decreased when the learner scrolled upward");

  await page.reload({waitUntil: "domcontentloaded"});
  await page.locator('[data-learning-experience="perfect-v3"]').waitFor({state: "visible", timeout: 10_000});
  const resume = page.getByRole("button", {name: "Vazhdo te seksioni i fundit"});
  await resume.waitFor({state: "visible"});
  await resume.click();
  await page.waitForFunction(() => {
    const heading = document.querySelector('h4[data-heading-source="numbered"]');
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
      && state.visited.length === 7;
  }, storageKey);
  const completedState = await savedState(page);
  assert(completedState.version === 3, "Learning progress was not migrated to storage version 3");
  assert(completedState.revision === "audit-revision-current", "Saved progress is not tied to the current Sanity revision");
  assert(completedState.completed === true, "Per-lesson completion was not saved locally");
  assert(completedState.signature === await page.locator("[data-learning-experience]").getAttribute("data-content-signature"), "Saved progress is not tied to the current lesson content");
  assert(Array.isArray(completedState.visited) && completedState.visited.length === 7, "Visited sections were not saved for every detected heading");

  await page.reload({waitUntil: "domcontentloaded"});
  await page.locator('[data-learning-experience="perfect-v3"]').waitFor({state: "visible", timeout: 10_000});
  const restored = page.getByRole("button", {name: "✓ Përfunduar"});
  await restored.waitFor({state: "visible"});
  assert(await restored.isDisabled(), "Completed state was not restored after reload");
  assert(await page.getByRole("button", {name: "Vazhdo te seksioni i fundit"}).count() === 0, "Resume control remained visible after completion");

  await context.close();
} finally {
  await browser.close();
}

console.log("Production future-Sanity hierarchy, exact text, revision reset, resume, monotonic progress and persistence passed in Chromium.");
