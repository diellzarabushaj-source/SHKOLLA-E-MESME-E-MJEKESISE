import { readFileSync } from "node:fs";

const layout = readFileSync("app/layout.tsx", "utf8");
const navigation = readFileSync("app/MobileNavigation.tsx", "utf8");
const styles = readFileSync("app/navigation-active.css", "utf8");

function requireText(source, value, label) {
  if (!source.includes(value)) throw new Error(`Active navigation audit failed: ${label}`);
}

for (const section of ["home", "classes", "progress"]) {
  requireText(layout, `data-navigation-section="${section}"`, `desktop ${section} target is missing`);
}
requireText(navigation, ".desktop-navigation [data-navigation-section]", "desktop navigation is not synchronized");
requireText(navigation, 'item.classList.toggle("is-active", active)', "active desktop class is not updated");
requireText(navigation, 'item.setAttribute("aria-current", "page")', "active desktop link lacks aria-current");
requireText(styles, '.tab[aria-current="page"]', "active desktop state is not visible");
requireText(styles, "background: var(--primary)", "active desktop state lacks a distinct surface");

console.log("Active navigation verified across desktop and mobile viewports.");
