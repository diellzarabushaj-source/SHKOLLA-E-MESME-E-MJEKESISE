import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const failures = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function watch(page, label) {
  page.on("pageerror", (error) => failures.push(`${label}: browser error: ${error.message}`));
}

async function auditSignIn(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 960 }, serviceWorkers: "block" });
  const page = await context.newPage();
  watch(page, "sign in");

  try {
    await page.goto(`${baseURL}/auth/sign-in?returnTo=%2F%23klasat&reason=session-expired`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Kyçu", exact: true }).waitFor({ state: "visible" });

    assert(await page.locator('input[name="returnTo"]').inputValue() === "/#klasat", "sign-in returnTo was not preserved");
    assert((await page.getByRole("status").textContent())?.includes("Sesioni yt ka përfunduar"), "expired-session notice is missing");
    assert(await page.getByRole("link", { name: /Kthehu në portal/ }).getAttribute("href") === "/#klasat", "sign-in back link does not return safely");
    assert(await page.getByRole("link", { name: "Vazhdo pa llogari" }).getAttribute("href") === "/#klasat", "guest link lost returnTo");

    const username = page.getByLabel("Username");
    await username.fill("Alkëta 03");
    await page.getByText("@alketa-03", { exact: false }).waitFor({ state: "visible" });

    const password = page.getByLabel("Password", { exact: true });
    assert(await password.getAttribute("type") === "password", "sign-in password is visible by default");
    await page.getByRole("button", { name: "Shfaq password-in" }).click();
    assert(await password.getAttribute("type") === "text", "sign-in password toggle did not reveal the field");
    await page.getByRole("button", { name: "Fshehe password-in" }).click();
    assert(await password.getAttribute("type") === "password", "sign-in password toggle did not hide the field");

    const google = page.getByRole("button", { name: /Admini.*Google/ });
    await google.waitFor({ state: "visible" });
    assert((await page.locator("body").textContent() || "").includes("Qasja e administratorit verifikohet"), "server-side admin verification note is missing");
    assert(!/gmail\.com/i.test((await page.locator("body").textContent()) || ""), "administrator email leaked into the public sign-in page");

    const signUpHref = await page.getByRole("link", { name: "Regjistrohu" }).getAttribute("href");
    assert(signUpHref?.includes("/auth/sign-up?returnTo=%2F%23klasat"), `sign-up link lost returnTo: ${signUpHref}`);

    await page.goto(`${baseURL}/auth/sign-in?returnTo=https%3A%2F%2Fevil.example%2Fsteal`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Kyçu", exact: true }).waitFor({ state: "visible" });
    assert(await page.locator('input[name="returnTo"]').inputValue() === "/", "external returnTo was not rejected");
    assert(await page.getByRole("link", { name: /Kthehu në portal/ }).getAttribute("href") === "/", "unsafe back link escaped the site");

    console.log("✓ sign-in return paths, notices, normalization, password visibility and admin entry");
  } finally {
    await context.close();
  }
}

async function auditSignUp(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, serviceWorkers: "block" });
  const page = await context.newPage();
  watch(page, "sign up");

  try {
    await page.goto(`${baseURL}/auth/sign-up?returnTo=%2Fprogress`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Krijo llogari", exact: true }).waitFor({ state: "visible" });

    assert(await page.locator('input[name="returnTo"]').inputValue() === "/progress", "sign-up returnTo was not preserved");
    const username = page.getByLabel("Zgjidh username-in");
    await username.fill("Alkëta 03");
    await page.getByText("@alketa-03", { exact: false }).waitFor({ state: "visible" });

    const password = page.getByLabel("Krijo password-in");
    await password.fill("1234567");
    const shortValidity = await password.evaluate((input) => input.validity.valid);
    assert(shortValidity === false, "sign-up accepted a password shorter than eight characters");
    assert((await page.locator('[data-level="short"]').textContent())?.includes("karaktere edhe"), "short-password guidance is missing");

    await password.fill("password-shume-i-mire");
    const validPassword = await password.evaluate((input) => input.validity.valid);
    assert(validPassword === true, "valid sign-up password was rejected by browser validation");
    assert((await page.locator('[data-level="strong"]').textContent())?.includes("I fortë"), "password strength feedback did not update");

    await page.getByRole("button", { name: "Shfaq password-in" }).click();
    assert(await password.getAttribute("type") === "text", "sign-up password toggle did not reveal the field");
    await page.getByRole("button", { name: "Fshehe password-in" }).click();

    const signInHref = await page.getByRole("link", { name: "Kyçu", exact: true }).getAttribute("href");
    assert(signInHref?.includes("/auth/sign-in?returnTo=%2Fprogress"), `sign-in link lost returnTo: ${signInHref}`);
    assert(await page.getByRole("link", { name: "Vazhdo pa llogari" }).getAttribute("href") === "/progress", "sign-up guest link lost returnTo");

    console.log("✓ registration normalization, browser validation, strength feedback and return flow");
  } finally {
    await context.close();
  }
}

async function auditMobile(browser) {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  const page = await context.newPage();
  watch(page, "mobile auth");

  try {
    for (const path of ["/auth/sign-in", "/auth/sign-up"]) {
      await page.goto(`${baseURL}${path}`, { waitUntil: "domcontentloaded" });
      await page.locator("main").waitFor({ state: "visible" });
      const geometry = await page.evaluate(() => ({
        viewport: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
      }));
      assert(geometry.documentWidth <= geometry.viewport + 2, `${path} overflows horizontally: ${JSON.stringify(geometry)}`);
      assert(geometry.bodyWidth <= geometry.viewport + 2, `${path} body overflows horizontally: ${JSON.stringify(geometry)}`);

      const targets = await page.locator("main a, main button").evaluateAll((elements) => elements
        .filter((element) => {
          const style = getComputedStyle(element);
          return style.display !== "none" && style.visibility !== "hidden";
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { label: element.getAttribute("aria-label") || element.textContent?.trim() || "control", width: rect.width, height: rect.height };
        }));
      for (const target of targets) {
        assert(target.width >= 40 && target.height >= 40, `${path} touch target is too small: ${JSON.stringify(target)}`);
      }
    }

    console.log("✓ mobile auth overflow, safe-area layout and touch targets");
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  await auditSignIn(browser).catch((error) => failures.push(error instanceof Error ? error.message : "sign-in audit failed"));
  await auditSignUp(browser).catch((error) => failures.push(error instanceof Error ? error.message : "sign-up audit failed"));
  await auditMobile(browser).catch((error) => failures.push(error instanceof Error ? error.message : "mobile auth audit failed"));
} finally {
  await browser.close();
}

if (failures.length) {
  console.error("\nAuthentication browser audit failed:");
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Authentication browser audit passed.");
