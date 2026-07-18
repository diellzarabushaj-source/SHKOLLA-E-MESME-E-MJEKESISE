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
const signInPage = read("app/auth/sign-in/page.tsx");
const signInForm = read("app/auth/sign-in/SignInForm.tsx");
const signInAction = read("app/auth/sign-in/actions.ts");
const signUpPage = read("app/auth/sign-up/page.tsx");
const signUpForm = read("app/auth/sign-up/SignUpForm.tsx");
const signUpAction = read("app/auth/sign-up/actions.ts");
const authStyles = read("app/auth/auth.module.css");
const serviceWorker = read("public/sw.js");
const packageJson = JSON.parse(read("package.json") || "{}");

requireText("Safe return paths", redirectHelper, [
  'candidate.startsWith("//")',
  'candidate.includes("\\\\")',
  "decodeURIComponent(candidate)",
  'normalized.startsWith("/api/")',
  'AUTH_PATHS.some',
  "encodeURIComponent(safePath)",
]);

for (const [label, page] of [["Sign-in page", signInPage], ["Sign-up page", signUpPage]]) {
  requireText(label, page, [
    "await auth.getSession()",
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
  "redirect(returnTo)",
]);
requireText("Sign-up action", signUpAction, [
  'slice(0, 80)',
  "USERNAME_PATTERN.test(username)",
  "password.length < 8",
  "password.length > 128",
  "user_already_exists",
  "safeReturnTo",
  "redirect(returnTo)",
]);

requireText("Sign-in form", signInForm, [
  'name="returnTo"',
  'autoComplete="username"',
  'autoComplete="current-password"',
  'aria-live="assertive"',
  'aria-pressed={showPassword}',
  'provider: "google"',
  "callbackURL: returnTo",
  'Admini — Kyçu me Google',
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
  'href={returnTo}',
]);

if (/gmail\.com/i.test(signInForm) || /loginHint\s*:/.test(signInForm)) {
  failures.push("Identiteti i administratorit ose loginHint nuk duhet të ekspozohet në bundle-in publik.");
}
if (/auth\.signIn\.email/.test(signUpAction)) {
  failures.push("Regjistrimi nuk duhet të bëjë sign-in të dytë pas sign-up.");
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
requireText("Private auth PWA handling", serviceWorker, ['const PRIVATE_PATHS = ["/api/", "/auth/", "/progress"]']);

const authAudit = String(packageJson.scripts?.["audit:auth"] || "");
const appAudit = String(packageJson.scripts?.["audit:app"] || "");
if (!authAudit.includes("scripts/audit-auth.mjs")) failures.push("package.json nuk ka audit:auth.");
if (!appAudit.includes("audit:auth")) failures.push("audit:app nuk e ekzekuton audit:auth.");

if (failures.length) {
  console.error("\nAuthentication audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Authentication audit passed: safe redirects, session-aware pages, robust validation, Google-only admin entry and responsive forms.");
