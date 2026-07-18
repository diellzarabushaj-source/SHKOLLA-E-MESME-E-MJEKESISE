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
    const main = page.locator("main");
    await main.getByRole("heading", { name: "Kyçu", exact: true }).waitFor({ state: "visible" });

    assert(await main.locator('input[name="returnTo"]').inputValue() === "/#klasat", "sign-in returnTo was not preserved");
    assert((await main.getByRole("status").textContent())?.includes("Sesioni yt ka përfunduar"), "expired-session notice is missing");
    assert(await main.getByRole("link", { name: /Kthehu në portal/ }).getAttribute("href") === "/#klasat", "sign-in back link does not return safely");
    assert(await main.getByRole("link", { name: "Vazhdo pa llogari" }).getAttribute("href") === "/#klasat", "guest link lost returnTo");

    const username = main.getByLabel("Username");
    await username.fill("Alkëta 03");
    await main.getByText("@alketa-03", { exact: false }).waitFor({ state: "visible" });

    const password = main.getByLabel("Password", { exact: true });
    assert(await password.getAttribute("type") === "password", "sign-in password is visible by default");
    await main.getByRole("button", { name: "Shfaq password-in" }).click();
    assert(await password.getAttribute("type") === "text", "sign-in password toggle did not reveal the field");
    await main.getByRole("button", { name: "Fshehe password-in" }).click();
    assert(await password.getAttribute("type") === "password", "sign-in password toggle did not hide the field");

    const google = main.getByRole("button", { name: /Admini.*Google/ });
    await google.waitFor({ state: "visible" });
    assert((await main.textContent() || "").includes("Qasja e administratorit verifikohet"), "server-side admin verification note is missing");
    assert(!/gmail\.com/i.test((await main.textContent()) || ""), "administrator email leaked into the public sign-in page");

    const signUpHref = await main.getByRole("link", { name: "Regjistrohu", exact: true }).getAttribute("href");
    assert(signUpHref?.includes("/auth/sign-up?returnTo=%2F%23klasat"), `sign-up link lost returnTo: ${signUpHref}`);

    await page.goto(`${baseURL}/auth/sign-in?returnTo=https%3A%2F%2Fevil.example%2Fsteal`, { waitUntil: "domcontentloaded" });
    const safeMain = page.locator("main");
    await safeMain.getByRole("heading", { name: "Kyçu", exact: true }).waitFor({ state: "visible" });
    assert(await safeMain.locator('input[name="returnTo"]').inputValue() === "/", "external returnTo was not rejected");
    assert(await safeMain.getByRole("link", { name: /Kthehu në portal/ }).getAttribute("href") === "/", "unsafe back link escaped the site");

    console.log("✓ sign-in return paths, notices, normalization, password visibility and admin entry");
  } finally {
    await context.close();
  }
}

async function auditSignUp(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1100 }, serviceWorkers: "block" });
  const page = await context.newPage();
  watch(page, "sign up");

  try {
    await page.goto(`${baseURL}/auth/sign-up?returnTo=%2Fprogress`, { waitUntil: "domcontentloaded" });
    const main = page.locator("main");
    await main.getByRole("heading", { name: "Krijo llogari", exact: true }).waitFor({ state: "visible" });

    assert(await main.locator('input[name="returnTo"]').inputValue() === "/progress", "sign-up returnTo was not preserved");
    const username = main.getByLabel("Zgjidh username-in");
    await username.fill("Alkëta 03");
    await main.getByText("@alketa-03", { exact: false }).waitFor({ state: "visible" });

    const password = main.getByLabel("Krijo password-in");
    const confirmation = main.getByLabel("Përsërite password-in");
    await password.fill("1234567");
    const shortValidity = await password.evaluate((input) => input.validity.valid);
    assert(shortValidity === false, "sign-up accepted a password shorter than eight characters");
    assert((await main.locator('[data-level="short"]').textContent())?.includes("karaktere edhe"), "short-password guidance is missing");

    await password.fill("password-shume-i-mire");
    const validPassword = await password.evaluate((input) => input.validity.valid);
    assert(validPassword === true, "valid sign-up password was rejected by browser validation");
    assert((await main.locator('[data-level="strong"]').textContent())?.includes("I fortë"), "password strength feedback did not update");

    await confirmation.fill("password-tjeter");
    const mismatchValidity = await confirmation.evaluate((input) => input.validity.valid);
    assert(mismatchValidity === false, "registration accepted mismatched passwords");
    assert((await main.locator("#password-match").textContent())?.includes("nuk përputhen"), "password mismatch guidance is missing");

    await confirmation.fill("password-shume-i-mire");
    const matchValidity = await confirmation.evaluate((input) => input.validity.valid);
    assert(matchValidity === true, "matching registration passwords stayed invalid");
    assert((await main.locator("#password-match").textContent())?.includes("përputhen"), "password match confirmation is missing");

    await main.getByRole("button", { name: "Shfaqi password-at" }).click();
    assert(await password.getAttribute("type") === "text", "sign-up password toggle did not reveal the first field");
    assert(await confirmation.getAttribute("type") === "text", "sign-up password toggle did not reveal confirmation");
    await main.getByRole("button", { name: "Fshehi password-at" }).click();
    assert(await password.getAttribute("type") === "password", "sign-up password toggle did not hide the first field");
    assert(await confirmation.getAttribute("type") === "password", "sign-up password toggle did not hide confirmation");

    const signInHref = await main.getByRole("link", { name: "Kyçu", exact: true }).getAttribute("href");
    assert(signInHref?.includes("/auth/sign-in?returnTo=%2Fprogress"), `sign-in link lost returnTo: ${signInHref}`);
    assert(await main.getByRole("link", { name: "Vazhdo pa llogari" }).getAttribute("href") === "/progress", "sign-up guest link lost returnTo");
    assert((await main.textContent() || "").includes("nuk mund të rikuperohet automatikisht"), "password recovery limitation is not explained");

    console.log("✓ registration normalization, confirmed passwords, strength feedback and return flow");
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
          const inlineLink = Boolean(element.closest('p[class*="switchText"]'));
          return {
            label: element.getAttribute("aria-label") || element.textContent?.trim() || "control",
            width: rect.width,
            height: rect.height,
            minimum: inlineLink ? 24 : 40,
          };
        }));
      for (const target of targets) {
        assert(target.width >= target.minimum && target.height >= target.minimum, `${path} touch target is too small: ${JSON.stringify(target)}`);
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
