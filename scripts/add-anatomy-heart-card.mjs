import { existsSync, readFileSync, writeFileSync } from "node:fs";

const portalPath = "app/ClassicLearningPortal.tsx";
const stylesPath = "app/globals.css";
const assetPath = "public/assets/anatomy-heart.webp";
const marker = "/* anatomy-heart-card */";

if (!existsSync(assetPath)) {
  throw new Error(`Missing anatomy heart asset: ${assetPath}`);
}

let portal = readFileSync(portalPath, "utf8");
const oldIcon = '<div className="subject-top"><span>{String(index + 1).padStart(2, "0")}</span><i>{subject.emoji || "✚"}</i></div>';
const newIcon = `<div className="subject-top"><span>{String(index + 1).padStart(2, "0")}</span><i className={/(anatomi|fiziolog)/i.test(\`${'${subject.slug} ${subject.title}'}\`) ? "subject-icon-anatomy" : undefined}>{/(anatomi|fiziolog)/i.test(\`${'${subject.slug} ${subject.title}'}\`) ? <img src="/assets/anatomy-heart.webp" alt="" aria-hidden="true" /> : subject.emoji || "✚"}</i></div>`;

if (!portal.includes("/assets/anatomy-heart.webp")) {
  if (!portal.includes(oldIcon)) {
    throw new Error("The subject-card icon anchor changed; anatomy heart was not installed.");
  }
  portal = portal.replace(oldIcon, newIcon);
  writeFileSync(portalPath, portal);
}

let styles = readFileSync(stylesPath, "utf8");
if (!styles.includes(marker)) {
  styles += `\n\n${marker}\n.subject-top i.subject-icon-anatomy {\n  overflow: visible;\n  background: transparent;\n  box-shadow: none;\n}\n\n.subject-top i.subject-icon-anatomy img {\n  width: 76px;\n  height: 92px;\n  max-width: none;\n  object-fit: contain;\n  pointer-events: none;\n  filter: drop-shadow(0 12px 18px color-mix(in srgb, var(--primary) 30%, transparent));\n}\n\n@media (max-width: 440px) {\n  .subject-top i.subject-icon-anatomy img {\n    width: 68px;\n    height: 84px;\n  }\n}\n`;
  writeFileSync(stylesPath, styles);
}

console.log("Installed the transparent anatomy heart without changing the rest of the subject card.");
