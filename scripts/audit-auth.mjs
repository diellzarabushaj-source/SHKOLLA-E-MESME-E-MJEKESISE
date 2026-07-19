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
const serverAuth = read("lib/auth/server.ts");
const accountLookup = read("lib/auth/accounts.ts");
const authControls = read("app/AuthControls.tsx");
const authControlsStyles = read("app/AuthControls.module.css");
const authLayout = read("app/auth/layout.tsx");
const authTouchStyles = read("app/auth/auth-touch.css");
const signInPage = read("app/auth/sign-in/page.tsx");
const signInForm = read("app/auth/sign-in/SignInForm.tsx");
const signInAction = read("app/auth/sign-in/actions.ts");
const signUpPage = read("app/auth/sign-up/page.tsx");
const signUpForm = read("app/auth/sign-up/SignUpForm.tsx");
const signUpAction = read("app/auth/sign-up/actions.ts");
const googleButton = read("app/auth/GoogleAuthButton.tsx");
const forgotPage = read("app/auth/forgot-password/page.tsx");
const forgotForm = read("app/auth/forgot-password/ForgotPasswordForm.tsx");
const resetPage = read("app/auth/reset-password/page.tsx");
const resetForm = read("app/auth/reset-password/ResetPasswordForm.tsx");
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
  '"/auth/forgot-password"',
  '"/auth/reset-password"',
  "encodeURIComponent(safePath)",
]);

requireText("Fresh server sessions", serverAuth, [
  "createNeonAuth",
  "sessionDataTtl: 1",
  "NEON_AUTH_COOKIE_SECRET",
]);

requireText("Credential account lookup", accountLookup, [
  'import "server-only"',
  "credentialUsernameExists",
  "resolveCredentialEmail",
  'a."providerId" = \'credential\'',
  "usernameToEmail(username)",
]);

requireText("Live header session", authControls, [
  '"use client"',
  "authClient.useSession()",
  "signedOut ? null : isPending ? initialUsername : liveUsername",
  "signOutAction",
]);

requireText("Immediate logout", authControls, [
  "onSubmit={handleSignOut}",
  "await authClient.signOut()",
  "setSignedOut(true)",
  'window.location.replace("/")',
  'window.dispatchEvent(new Event("medical-portal:auth-changed"))',
  "Po del…",
]);

requireText("Logout interaction states", authControlsStyles, [
  ".logout:disabled",
  "cursor: wait",
  ".logoutError",
  "prefers-reduced-motion",
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
  "resolveCredentialEmail(identifier)",
  "password.length < 8",
  "password.length > 128",
  "auth.signIn.email",
  "success: true",
  "returnTo",
]);

requireText("Sign-up action", signUpAction, [
  "credentialUsernameExists(username)",
  "isValidEmail(email)",
  "email || usernameToEmail(username)",
  "password !== confirmPassword",
  "auth.signUp.email",
  "success: true",
]);

requireText("Shared Google authentication", googleButton, [
  'provider: "google"',
  "callbackURL: returnTo",
  'mode === "sign-up"',
  "Regjistrohu me Google",
  "Vazhdo me Google",
]);

requireText("Sign-in form", signInForm, [
  'name="identifier"',
  'autoComplete="username"',
  'autoComplete="current-password"',
  "GoogleAuthButton",
  '"/auth/forgot-password"',
  "window.location.replace(state.returnTo)",
]);

requireText("Sign-up form", signUpForm, [
  'name="email"',
  'type="email"',
  "(opsional)",
  "GoogleAuthButton",
  "normalizeUsername(username)",
  "passwordStrength(password.length)",
  "window.location.replace(state.returnTo)",
]);

requireText("Password reset request", forgotForm, [
  "authClient.requestPasswordReset",
  '"/auth/reset-password"',
  "window.location.origin",
  "Nëse emaili lidhet me një llogari",
]);
requireText("Password reset completion", resetForm, [
  "authClient.resetPassword",
  "newPassword: password",
  "token",
  "reset=1",
]);
requireText("Password recovery pages", forgotPage + resetPage, [
  'robots: { index: false, follow: false }',
  "safeReturnTo(params.returnTo)",
]);

if (/gmail\.com/i.test(signInForm + signUpForm + googleButton) || /loginHint\s*:/.test(googleButton)) {
  failures.push("Identiteti i administratorit ose loginHint nuk duhet të ekspozohet në bundle-in publik.");
}
if (/auth\.signIn\.email/.test(signUpAction)) failures.push("Regjistrimi nuk duhet të bëjë sign-in të dytë pas sign-up.");
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
  "auditRecovery(browser)",
  "auditInstantSignOut(browser)",
  "auditMobile(browser)",
  '"**/api/auth/sign-out*"',
  "logout updates the header and session immediately without manual refresh",
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

console.log("Authentication audit passed: fresh sessions, instant logout, username/email login, optional recovery email, Google for everyone and server-only admin authorization.");
