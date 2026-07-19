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

    const identifier = main.getByLabel("Username ose email");
    await identifier.fill("alketa03@example.com");
    const password = main.getByLabel("Password", { exact: true });
    assert(await password.getAttribute("type") === "password", "sign-in password is visible by default");
    await main.getByRole("button", { name: "Shfaq password-in" }).click();
    assert(await password.getAttribute("type") === "text", "sign-in password toggle did not reveal the field");
    await main.getByRole("button", { name: "Fshehe password-in" }).click();
    assert(await password.getAttribute("type") === "password", "sign-in password toggle did not hide the field");

    await main.getByRole("button", { name: "Vazhdo me Google" }).waitFor({ state: "visible" });
    const forgotHref = await main.getByRole("link", { name: "E harrove password-in?" }).getAttribute("href");
    assert(forgotHref?.includes("/auth/forgot-password?returnTo=%2F%23klasat"), `forgot-password link lost returnTo: ${forgotHref}`);
    assert(!/gmail\.com/i.test((await main.textContent()) || ""), "administrator email leaked into the public sign-in page");
    assert((await main.textContent() || "").includes("Administratori njihet vetëm"), "server-side administrator boundary is not explained");

    await page.goto(`${baseURL}/auth/sign-in?returnTo=https%3A%2F%2Fevil.example%2Fsteal`, { waitUntil: "domcontentloaded" });
    const safeMain = page.locator("main");
    await safeMain.getByRole("heading", { name: "Kyçu", exact: true }).waitFor({ state: "visible" });
    assert(await safeMain.locator('input[name="returnTo"]').inputValue() === "/", "external returnTo was not rejected");
    assert(await safeMain.getByRole("link", { name: /Kthehu në portal/ }).getAttribute("href") === "/", "unsafe back link escaped the site");
    console.log("✓ sign-in username/email, Google, recovery and safe return paths");
  } finally {
    await context.close();
  }
}

async function auditSignUp(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1180 }, serviceWorkers: "block" });
  const page = await context.newPage();
  watch(page, "sign up");
  try {
    await page.goto(`${baseURL}/auth/sign-up?returnTo=%2Fprogress`, { waitUntil: "domcontentloaded" });
    const main = page.locator("main");
    await main.getByRole("heading", { name: "Regjistrohu", exact: true }).waitFor({ state: "visible" });
    assert(await main.locator('input[name="returnTo"]').inputValue() === "/progress", "sign-up returnTo was not preserved");
    await main.getByRole("button", { name: "Regjistrohu me Google" }).waitFor({ state: "visible" });

    const username = main.getByLabel("Username", { exact: true });
    await username.fill("Alkëta 03");
    await main.getByText("@alketa-03", { exact: false }).waitFor({ state: "visible" });
    const email = main.getByLabel(/Email/);
    assert(await email.getAttribute("required") === null, "optional recovery email became required");
    await email.fill("alketa@example.com");

    const password = main.getByLabel("Krijo password-in");
    const confirmation = main.getByLabel("Përsërite password-in");
    await password.fill("1234567");
    assert(await password.evaluate((input) => input.validity.valid) === false, "sign-up accepted a short password");
    await password.fill("password-shume-i-mire");
    assert((await main.locator('[data-level="strong"]').textContent())?.includes("I fortë"), "password strength feedback did not update");
    await confirmation.fill("password-tjeter");
    assert(await confirmation.evaluate((input) => input.validity.valid) === false, "registration accepted mismatched passwords");
    await confirmation.fill("password-shume-i-mire");
    assert(await confirmation.evaluate((input) => input.validity.valid) === true, "matching passwords stayed invalid");

    await main.getByRole("button", { name: "Shfaqi password-at" }).click();
    assert(await password.getAttribute("type") === "text", "password toggle did not reveal the first field");
    assert(await confirmation.getAttribute("type") === "text", "password toggle did not reveal confirmation");
    await main.getByRole("button", { name: "Fshehi password-at" }).click();

    const signInHref = await main.getByRole("link", { name: "Kyçu", exact: true }).getAttribute("href");
    assert(signInHref?.includes("/auth/sign-in?returnTo=%2Fprogress"), `sign-in link lost returnTo: ${signInHref}`);
    assert((await main.textContent() || "").includes("rikthesh password-in me email"), "optional recovery email purpose is not explained");
    console.log("✓ Google registration, optional email, username and confirmed password flow");
  } finally {
    await context.close();
  }
}

async function auditRecovery(browser) {
  const context = await browser.newContext({ viewport: { width: 900, height: 900 }, serviceWorkers: "block" });
  const page = await context.newPage();
  watch(page, "password recovery");
  try {
    await page.goto(`${baseURL}/auth/forgot-password?returnTo=%2Fprogress`, { waitUntil: "domcontentloaded" });
    const main = page.locator("main");
    await main.getByRole("heading", { name: "Rikthe password-in" }).waitFor({ state: "visible" });
    assert(await main.getByLabel("Emaili i llogarisë").getAttribute("type") === "email", "recovery field is not email-specific");
    assert((await main.textContent() || "").includes("pa email nuk mund të rikuperohen"), "no-email recovery limitation is unclear");

    await page.goto(`${baseURL}/auth/reset-password?returnTo=%2Fprogress`, { waitUntil: "domcontentloaded" });
    const resetMain = page.locator("main");
    await resetMain.getByRole("heading", { name: "Password i ri" }).waitFor({ state: "visible" });
    assert((await resetMain.textContent() || "").includes("Linku nuk është i vlefshëm"), "invalid reset token is not handled safely");
    console.log("✓ password recovery request and invalid-token handling");
  } finally {
    await context.close();
  }
}

async function auditInstantSignOut(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  let signedOut = false;
  let signOutRequests = 0;

  await context.route("**/api/auth/get-session*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(signedOut ? null : {
        session: { id: "audit-session", userId: "audit-user", expiresAt: new Date(Date.now() + 3_600_000).toISOString() },
        user: { id: "audit-user", name: "audit-user", email: "audit@example.com", emailVerified: true },
      }),
    });
  });

  await context.route("**/api/auth/sign-out*", async (route) => {
    signOutRequests += 1;
    signedOut = true;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
  });

  const page = await context.newPage();
  watch(page, "instant sign out");
  try {
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    const logout = page.getByRole("button", { name: "Dil nga llogaria" });
    await logout.waitFor({ state: "visible", timeout: 10_000 });
    await logout.click();

    await page.getByRole("link", { name: "Kyçu", exact: true }).waitFor({ state: "visible", timeout: 10_000 });
    assert(signOutRequests === 1, `logout sent ${signOutRequests} sign-out requests instead of one`);
    assert(new URL(page.url()).pathname === "/", `logout did not finish on the home page: ${page.url()}`);
    assert(await page.getByRole("button", { name: "Dil nga llogaria" }).count() === 0, "logout button remained visible after sign-out");
    console.log("✓ logout updates the header and session immediately without manual refresh");
  } finally {
    await context.close();
  }
}

async function auditMobile(browser) {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  const page = await context.newPage();
  watch(page, "mobile auth");
  try {
    for (const path of ["/auth/sign-in", "/auth/sign-up", "/auth/forgot-password", "/auth/reset-password"]) {
      await page.goto(`${baseURL}${path}`, { waitUntil: "domcontentloaded" });
      await page.locator("main").waitFor({ state: "visible" });
      const geometry = await page.evaluate(() => ({ viewport: window.innerWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth }));
      assert(geometry.documentWidth <= geometry.viewport + 2, `${path} overflows horizontally: ${JSON.stringify(geometry)}`);
      assert(geometry.bodyWidth <= geometry.viewport + 2, `${path} body overflows horizontally: ${JSON.stringify(geometry)}`);
    }
    console.log("✓ mobile authentication and recovery layouts");
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  await auditSignIn(browser).catch((error) => failures.push(error instanceof Error ? error.message : "sign-in audit failed"));
  await auditSignUp(browser).catch((error) => failures.push(error instanceof Error ? error.message : "sign-up audit failed"));
  await auditRecovery(browser).catch((error) => failures.push(error instanceof Error ? error.message : "recovery audit failed"));
  await auditInstantSignOut(browser).catch((error) => failures.push(error instanceof Error ? error.message : "sign-out audit failed"));
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
