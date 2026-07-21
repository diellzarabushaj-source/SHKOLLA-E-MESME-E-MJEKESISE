import {readFileSync, writeFileSync} from "node:fs";

const portalPaths = ["app/ClassicLearningPortal.tsx", "app/SchoolLearningPortal.tsx"];
const stylesPath = "app/globals.css";
const marker = "chapter-theme-illustrations-v1";

function replaceRequired(source, label, before, after) {
  if (!source.includes(before)) throw new Error(`${label}: source anchor was not found`);
  return source.replace(before, after);
}

function replaceOneOf(source, label, candidates, after) {
  const before = candidates.find((candidate) => source.includes(candidate));
  if (!before) throw new Error(`${label}: none of the supported source anchors were found`);
  return source.replace(before, after(before));
}

function patchPortal(path) {
  let portal = readFileSync(path, "utf8").replace(/\r\n?/g, "\n");

  if (!portal.includes("cardIllustrationLight?: SanityImage")) {
    portal = replaceRequired(
      portal,
      `${path} chapter image types`,
      `  coverImage?: SanityImage;\n  lessons: Lesson[];`,
      `  coverImage?: SanityImage;\n  cardIllustrationLight?: SanityImage;\n  cardIllustrationDark?: SanityImage;\n  lessons: Lesson[];`,
    );
  }

  if (!portal.includes("cardIllustrationLight {")) {
    portal = replaceOneOf(
      portal,
      `${path} chapter image query`,
      [
        `             "summary": coalesce(summary, description),\n             coverImage { alt, "asset": asset->{url} },\n             "lessons":`,
        `             summary,\n             coverImage { alt, "asset": asset->{url} },\n             "lessons":`,
      ],
      (before) => before.replace(
        `             "lessons":`,
        `             cardIllustrationLight {\n               alt,\n               crop,\n               hotspot,\n               "asset": asset->{url}\n             },\n             cardIllustrationDark {\n               alt,\n               crop,\n               hotspot,\n               "asset": asset->{url}\n             },\n             "lessons":`,
      ),
    );
  }

  if (!portal.includes("const lightIllustrationSource")) {
    portal = replaceRequired(
      portal,
      `${path} chapter illustration data`,
      `                const flashcardCount = getChapterFlashcardCount(chapter);\n                return (`,
      `                const flashcardCount = getChapterFlashcardCount(chapter);\n                const lightIllustrationSource = chapter.cardIllustrationLight?.asset?.url || chapter.cardIllustrationDark?.asset?.url || "";\n                const darkIllustrationSource = chapter.cardIllustrationDark?.asset?.url || chapter.cardIllustrationLight?.asset?.url || "";\n                const lightIllustrationUrl = lightIllustrationSource ? lightIllustrationSource + "?w=300&fit=max&auto=format" : "";\n                const darkIllustrationUrl = darkIllustrationSource ? darkIllustrationSource + "?w=300&fit=max&auto=format" : "";\n                const chapterIllustrationAlt = chapter.cardIllustrationLight?.alt || chapter.cardIllustrationDark?.alt || "";\n                return (`,
    );
  }

  if (!portal.includes('className="chapter-illustration"')) {
    portal = replaceRequired(
      portal,
      `${path} chapter illustration markup`,
      `                  <article className="chapter-row" key={chapter._id}>\n                    <span className="chapter-number">{String(index + 1).padStart(2, "0")}</span>`,
      `                  <article className="chapter-row chapter-row-illustrated" key={chapter._id}>\n                    <figure\n                      className="chapter-illustration"\n                      role={chapterIllustrationAlt ? "img" : undefined}\n                      aria-label={chapterIllustrationAlt || undefined}\n                      aria-hidden={chapterIllustrationAlt ? undefined : true}\n                    >\n                      {lightIllustrationUrl && <img className="chapter-illustration-light" src={lightIllustrationUrl} alt="" loading="lazy" decoding="async" />}\n                      {darkIllustrationUrl && <img className="chapter-illustration-dark" src={darkIllustrationUrl} alt="" loading="lazy" decoding="async" />}\n                      {!lightIllustrationUrl && !darkIllustrationUrl && <span className="chapter-illustration-placeholder" aria-hidden="true">✚</span>}\n                    </figure>\n                    <span className="chapter-number">{String(index + 1).padStart(2, "0")}</span>`,
    );
  }

  if (!portal.includes('"chapter-open-button"')) {
    portal = replaceRequired(
      portal,
      `${path} chapter button class`,
      `                    <button className={classic.openButton} onClick={() => chooseChapter(chapter)} type="button">`,
      `                    <button className={[classic.openButton, "chapter-open-button"].join(" ")} onClick={() => chooseChapter(chapter)} type="button">`,
    );
  }

  writeFileSync(path, portal);
}

for (const path of portalPaths) patchPortal(path);

let styles = readFileSync(stylesPath, "utf8").replace(/\r\n?/g, "\n");
if (!styles.includes(marker)) {
  styles += `

/* ${marker} */
.chapter-row.chapter-row-illustrated {
  min-height: 154px;
  grid-template-columns: 116px 44px minmax(0, 1fr) auto 150px;
  grid-template-areas: "image number copy count action";
  gap: 18px;
  overflow: hidden;
}

.chapter-row-illustrated .chapter-illustration {
  grid-area: image;
  position: relative;
  width: 116px;
  height: 126px;
  margin: 0;
  align-self: center;
  overflow: visible;
}

.chapter-row-illustrated .chapter-illustration img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  filter: drop-shadow(0 14px 20px color-mix(in srgb, var(--primary) 26%, transparent));
  transition: opacity 180ms ease;
}

.chapter-illustration-light { opacity: 0; }
.chapter-illustration-dark { opacity: 1; }
html[data-theme="light"] .chapter-illustration-light { opacity: 1; }
html[data-theme="light"] .chapter-illustration-dark { opacity: 0; }
html[data-theme="dark"] .chapter-illustration-light { opacity: 0; }
html[data-theme="dark"] .chapter-illustration-dark { opacity: 1; }

.chapter-illustration-placeholder {
  width: 84px;
  height: 84px;
  display: grid;
  place-items: center;
  position: absolute;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  border: 1px dashed var(--line);
  border-radius: 24px;
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  color: var(--muted-2);
  font-size: 34px;
}

.chapter-row-illustrated .chapter-number { grid-area: number; }
.chapter-row-illustrated .chapter-copy { grid-area: copy; min-width: 0; }
.chapter-row-illustrated .chapter-count { grid-area: count; }
.chapter-row-illustrated .chapter-open-button { grid-area: action; }

@media (max-width: 1000px) {
  .chapter-row.chapter-row-illustrated {
    grid-template-columns: 100px 40px minmax(0, 1fr) 145px;
    grid-template-areas: "image number copy action";
  }

  .chapter-row-illustrated .chapter-illustration {
    width: 100px;
    height: 112px;
  }
}

@media (max-width: 700px) {
  .chapter-row.chapter-row-illustrated {
    min-height: 170px;
    grid-template-columns: 88px minmax(0, 1fr) 32px;
    grid-template-areas:
      "image copy number"
      "image copy number"
      "action action action";
    gap: 12px;
    padding: 16px;
  }

  .chapter-row-illustrated .chapter-illustration {
    width: 88px;
    height: 118px;
    align-self: start;
  }

  .chapter-row-illustrated .chapter-number {
    align-self: start;
    justify-self: end;
  }

  .chapter-row-illustrated .chapter-open-button {
    width: 100%;
    min-height: 52px;
  }
}

@media (max-width: 440px) {
  .chapter-row.chapter-row-illustrated {
    grid-template-columns: 78px minmax(0, 1fr) 28px;
    gap: 10px;
  }

  .chapter-row-illustrated .chapter-illustration {
    width: 78px;
    height: 106px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chapter-row-illustrated .chapter-illustration img { transition: none; }
}
`;
}
writeFileSync(stylesPath, styles);

console.log("Installed Sanity-managed transparent chapter illustrations for light and dark mode.");
