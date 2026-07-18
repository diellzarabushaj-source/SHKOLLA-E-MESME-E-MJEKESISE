import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const appDir = path.join(root, "app");
const failures = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`${relativePath}: skedari i detyrueshëm mungon.`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function requireTokens(label, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) failures.push(`${label}: mungon ${JSON.stringify(token)}.`);
  }
}

function hasHomeEscape(source) {
  return /href\s*=\s*(?:\{\s*)?["'`]\/["'`]/.test(source)
    || /window\.location\.(?:assign|replace)\(\s*["'`]\/["'`]/.test(source)
    || /router\.(?:push|replace)\(\s*["'`]\/["'`]/.test(source);
}

const layout = read("app/layout.tsx");
const mobileNavigation = read("app/MobileNavigation.tsx");
const navigationSafety = read("app/NavigationSafety.tsx");
const notFound = read("app/not-found.tsx");
const routeError = read("app/error.tsx");
const globalError = read("app/global-error.tsx");

requireTokens("Root layout", layout, [
  'href="/"',
  'href="/#klasat"',
  'href="/progress"',
  "<MobileNavigation />",
  "<NavigationSafety />",
  'className="desktop-navigation"',
  'aria-label="Portali Mësimor Mjekësi Pejë - Ballina"',
]);

requireTokens("Mobile navigation", mobileNavigation, [
  'href: "/"',
  'href: "/#klasat"',
  'href: "/progress"',
  'aria-label="Navigimi kryesor në telefon"',
  "aria-current",
  'window.addEventListener("hashchange"',
  'window.addEventListener("popstate"',
  'window.addEventListener("storage"',
  'window.addEventListener("medical-portal:navigation"',
]);

requireTokens("Navigation safety", navigationSafety, [
  'const HOME_EVENT = "medical-portal:home"',
  'const CLASSES_EVENT = "medical-portal:classes"',
  "window.localStorage.removeItem(SELECTED_GRADE_KEY)",
  'window.location.pathname !== "/"',
  "event.preventDefault()",
]);

for (const [label, source] of [
  ["404 boundary", notFound],
  ["Route error boundary", routeError],
  ["Global error boundary", globalError],
]) {
  if (source && !hasHomeEscape(source)) failures.push(`${label}: nuk ka rrugë daljeje drejt Ballinës.`);
}

requireTokens("Route error boundary", routeError, [
  'type="button"',
  "onClick={reset}",
]);
requireTokens("Global error boundary", globalError, [
  'type="button"',
  "onClick={reset}",
  '<html lang="sq">',
  "<body",
  'href="/"',
]);

if (failures.length) {
  console.error("\nNavigation boundary audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Navigation boundary audit passed: desktop, mobile, 404, route-error and global-error escape paths are present.");
