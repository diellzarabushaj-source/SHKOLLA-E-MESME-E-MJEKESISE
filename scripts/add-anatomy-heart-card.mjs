import { existsSync, readFileSync, writeFileSync } from "node:fs";

const portalPaths = ["app/ClassicLearningPortal.tsx", "app/SchoolLearningPortal.tsx"];
const stylesPath = "app/globals.css";
const fallbackAssetPath = "public/assets/anatomy-heart.webp";
const marker = "/* subject-card-illustrations */";

if (!existsSync(fallbackAssetPath)) {
  throw new Error(`Missing anatomy fallback asset: ${fallbackAssetPath}`);
}

function replaceOnce(source, before, after, resultMarker, label) {
  if (source.includes(resultMarker)) return source;
  if (!source.includes(before)) {
    throw new Error(`${label} anchor changed; subject illustrations were not installed.`);
  }
  return source.replace(before, after);
}

function replaceOneOf(source, candidates, after, resultMarker, label) {
  if (source.includes(resultMarker)) return source;
  const before = candidates.find((candidate) => source.includes(candidate));
  if (!before) {
    throw new Error(`${label} anchor changed; subject illustrations were not installed.`);
  }
  return source.replace(before, after);
}

function patchPortal(portalPath) {
  if (!existsSync(portalPath)) throw new Error(`Missing portal source: ${portalPath}`);
  let portal = readFileSync(portalPath, "utf8").replace(/\r\n?/g, "\n");

  portal = replaceOnce(
    portal,
    `  shortDescription?: string;\n  emoji?: string;\n  chapters: Chapter[];`,
    `  shortDescription?: string;\n  emoji?: string;\n  cardIllustration?: SanityImage;\n  chapters: Chapter[];`,
    "cardIllustration?: SanityImage",
    `${portalPath} Subject type`,
  );

  portal = replaceOneOf(
    portal,
    [
      `        shortDescription,\n        emoji,\n        "chapters":`,
      `        "shortDescription": coalesce(shortDescription, description),\n        emoji,\n        "chapters":`,
    ],
    `        "shortDescription": coalesce(shortDescription, description),\n        emoji,\n        cardIllustration {\n          alt,\n          crop,\n          hotspot,\n          "asset": asset->{url}\n        },\n        "chapters":`,
    "cardIllustration {",
    `${portalPath} Subject query`,
  );

  portal = replaceOnce(
    portal,
    `                const stats = getSubjectStats(subject);\n                return (`,
    `                const stats = getSubjectStats(subject);\n                const isAnatomySubject = /(anatomi|fiziolog)/i.test(\`${"${subject.slug} ${subject.title}"}\`);\n                const sanityIllustrationUrl = subject.cardIllustration?.asset?.url;\n                const cardIllustrationUrl = sanityIllustrationUrl\n                  ? \`${"${sanityIllustrationUrl}?w=240&fit=max&auto=format"}\`\n                  : isAnatomySubject\n                    ? "/assets/anatomy-heart.webp"\n                    : "";\n                const cardIllustrationAlt = subject.cardIllustration?.alt || "";\n                return (`,
    "subject.cardIllustration?.asset?.url",
    `${portalPath} Subject card data`,
  );

  portal = replaceOnce(
    portal,
    `<div className="subject-top"><span>{String(index + 1).padStart(2, "0")}</span><i>{subject.emoji || "✚"}</i></div>`,
    `<div className="subject-top"><span>{String(index + 1).padStart(2, "0")}</span><i className={cardIllustrationUrl ? "subject-icon-illustration" : undefined}>{cardIllustrationUrl ? <img src={cardIllustrationUrl} alt={cardIllustrationAlt} aria-hidden={cardIllustrationAlt ? undefined : true} loading="lazy" decoding="async" /> : subject.emoji || "✚"}</i></div>`,
    "subject-icon-illustration",
    `${portalPath} Subject card icon`,
  );

  writeFileSync(portalPath, portal);
}

for (const portalPath of portalPaths) patchPortal(portalPath);

let styles = readFileSync(stylesPath, "utf8").replace(/\r\n?/g, "\n");
const legacyBlock = `\n\n/* anatomy-heart-card */\n.subject-top i.subject-icon-anatomy {\n  overflow: visible;\n  background: transparent;\n  box-shadow: none;\n}\n\n.subject-top i.subject-icon-anatomy img {\n  width: 76px;\n  height: 92px;\n  max-width: none;\n  object-fit: contain;\n  pointer-events: none;\n  filter: drop-shadow(0 12px 18px color-mix(in srgb, var(--primary) 30%, transparent));\n}\n\n@media (max-width: 440px) {\n  .subject-top i.subject-icon-anatomy img {\n    width: 68px;\n    height: 84px;\n  }\n}\n`;

if (styles.includes(legacyBlock)) styles = styles.replace(legacyBlock, "");

if (!styles.includes(marker)) {
  styles += `\n\n${marker}\n.subject-top i.subject-icon-illustration {\n  overflow: visible;\n  background: transparent;\n  box-shadow: none;\n}\n\n.subject-top i.subject-icon-illustration img {\n  width: 76px;\n  height: 92px;\n  max-width: none;\n  object-fit: contain;\n  pointer-events: none;\n  filter: drop-shadow(0 12px 18px color-mix(in srgb, var(--primary) 30%, transparent));\n}\n\n@media (max-width: 440px) {\n  .subject-top i.subject-icon-illustration img {\n    width: 68px;\n    height: 84px;\n  }\n}\n`;
}

writeFileSync(stylesPath, styles);
console.log("Installed Sanity-managed subject card illustrations in both the source and generated production portal.");
