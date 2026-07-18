import { existsSync, readFileSync } from "node:fs";

const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path} mungon.`);
    return "";
  }
  return readFileSync(path, "utf8");
}

function requireText(label, source, values) {
  for (const value of values) {
    if (!source.includes(value)) failures.push(`${label}: mungon ${JSON.stringify(value)}.`);
  }
}

const redirectHelper = read("lib/auth/redirect.ts");
const rootLayout = read("app/layout.tsx");
const authLayout = read("app/auth/layout.tsx");
const authTouchStyles = read("app/auth/auth-touch.css");
const signInPage = read("app/auth/sign-in/page.tsx");
const signInForm = read("app/auth/sign-in/SignInForm.tsx");
const signInAction = read("app/auth/sign-in/actions.ts");
const signUpPage = read("app/auth/sign-up/page.tsx");
const signUpForm = read("app/auth/sign-up/SignUpForm.tsx");
const signUpAction = read("app/auth/sign-up/actions.ts");
const authStyles = read("app/auth/auth.module.css");
const authBrowserAudit = read("scripts/e2e-auth.mjs");
const authBrowserIntegration = read("scripts/integrate-auth-e2e.mjs");
const serviceWorker = read("public/sw.js");
const packageJson = JSON.parse(read("package.json") || "{}");

requireText("Safe return paths", redirectHelper, [
  'candidate.startsWith("//")',
  'candidate.includes("\\\\")',
  "decodeURIComponent(candidate)",
  'normalized.startsWith("/api/")',
  "AUTH_PATHS.some",
  "encodeURIComponent(safePath)",
]);

requireText("Header session recognition", rootLayout, [
  "currentSessionUser",
  "const user = await currentSessionUser()",
  "AuthControls username={username}",
]);

for (const [label, page] of [["Sign-in page", signInPage], ["Sign-up page", signUpPage]]) {
  requireText(label, page, [
    "await auth.getSession()",
    "session.session?.user?.id",
    "safeReturnTo(params.returnTo)",
    "if (signedIn) redirect(returnTo)",
    'robots: { index: false, follow: false }',
  ]);
}

requireText("Sign-in action", signInAction, [
  'slice(0, 80)',
  "USERNAME_PATTERN.test(username)",
  "password.length < 8",
  "password.length > 128",
  "safeReturnTo",
  "success: true",
  "returnTo",
]);
requireText("Sign-up action", signUpAction, [
  'slice(0, 80)',
  "USERNAME_PATTERN.test(username)",
  "password.length < 8",
  "password.length > 128",
  "user_already_exists",
  "safeReturnTo",
  "success: true",
  "returnTo",
]);

requireText("Sign-in form", signInForm, [
  'name="returnTo"',
  'autoComplete="username"',
  'autoComplete="current-password"',
  'aria-live="assertive"',
  'aria-pressed={showPassword}',
  'provider: "google"',
  "callbackURL: returnTo",
  "Admini — Kyçu me Google",
  "window.location.replace(state.returnTo)",
  "Duke hapur portalin...",
  'href={returnTo}',
]);
requireText("Sign-up form", signUpForm, [
  'name="returnTo"',
  'autoComplete="username"',
  'autoComplete="new-password"',
  'aria-live="assertive"',
  'aria-pressed={showPassword}',
  "normalizeUsername(username)",
  "passwordStrength(password.length)",
  "window.location.replace(state.returnTo)",
  "Duke hapur portalin...",
  'href={returnTo}',
]);

if (/gmail\.com/i.test(signInForm) || /loginHint\s*:/.test(signInForm)) {
  failures.push("Identiteti i administratorit ose loginHint nuk duhet të ekspozohet në bundle-in publik.");
}
if (/auth\.signIn\.email/.test(signUpAction)) {
  failures.push("Regjistrimi nuk duhet të bëjë sign-in të dytë pas sign-up.");
}
if (/redirect\(returnTo\)/.test(signInAction) || /redirect\(returnTo\)/.test(signUpAction)) {
  failures.push("Server actions duhet t'ia kthejnë suksesin formës; navigimi i plotë bëhet në browser për sesion të freskët.");
}

requireText("Auth responsive styles", authStyles, [
  "100dvh",
  "env(safe-area-inset-bottom)",
  ".inputError",
  ".passwordStrength",
  ".spinner",
  ":focus-visible",
  "prefers-reduced-motion",
]);
requireText("Auth scoped layout", authLayout, ['import "./auth-touch.css"', "return children"]);
requireText("Auth switch touch targets", authTouchStyles, [
  'p[class*="switchText"] > a',
  "min-width: 40px",
  "min-height: 40px",
  "display: inline-flex",
]);
requireText("Auth browser audit", authBrowserAudit, [
  "auditSignIn(browser)",
  "auditSignUp(browser)",
  "auditMobile(browser)",
  "external returnTo was not rejected",
  "administrator email leaked",
]);
requireText("Auth browser integration", authBrowserIntegration, [
  'await import("./e2e-auth.mjs");',
  "Browser smoothness audit passed.",
]);
requireText("Private auth PWA handling", serviceWorker, ['const PRIVATE_PATHS = ["/api/", "/auth/", "/progress"]']);

const preparePortal = String(packageJson.scripts?.["prepare:portal"] || "");
const authAudit = String(packageJson.scripts?.["audit:auth"] || "");
const smoothnessAudit = String(packageJson.scripts?.["audit:smoothness"] || "");
const appAudit = String(packageJson.scripts?.["audit:app"] || "");
if (!preparePortal.includes("integrate-auth-e2e.mjs")) failures.push("prepare:portal nuk e integron auth browser audit.");
if (!authAudit.includes("scripts/audit-auth.mjs")) failures.push("package.json nuk ka audit:auth.");
if (!smoothnessAudit.includes("scripts/audit-auth.mjs")) failures.push("CI smoothness audit nuk e ekzekuton audit-auth.mjs.");
if (!appAudit.includes("audit:smoothness")) failures.push("audit:app nuk e ekzekuton audit:smoothness.");

if (failures.length) {
  console.error("\nAuthentication audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Authentication audit passed: safe redirects, shared session recognition, full-page auth handoff, Google-only admin entry and responsive forms.");
