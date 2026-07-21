import {readFileSync, writeFileSync} from "node:fs";

const portalPaths = ["app/ClassicLearningPortal.tsx", "app/SchoolLearningPortal.tsx"];
const stylesPath = "app/globals.css";
const marker = "chapter-sanity-image-v2";

function replacePatternRequired(source, label, pattern, replacement) {
  if (!pattern.test(source)) throw new Error(`${label}: source pattern was not found`);
  pattern.lastIndex = 0;
  return source.replace(pattern, replacement);
}

function patchPortal(path) {
  let portal = readFileSync(path, "utf8").replace(/\r\n?/g, "\n");

  if (!portal.includes("chapterImage?: SanityImage")) {
    portal = replacePatternRequired(
      portal,
      `${path} chapter image type`,
      /(type Chapter = \{[\s\S]*?\n\s*coverImage\?: SanityImage;\n)(\s*lessons: Lesson\[\];)/,
      `$1  chapterImage?: SanityImage;\n$2`,
    );
  }

  if (!portal.includes("chapterImage {")) {
    portal = replacePatternRequired(
      portal,
      `${path} chapter image query`,
      /(\s*coverImage \{ alt, "asset": asset->\{url\} \},\n)(\s*)"lessons":/,
      `$1$2chapterImage {\n$2  alt,\n$2  crop,\n$2  hotspot,\n$2  "asset": asset->{url}\n$2},\n$2"lessons":`,
    );
  }

  if (!portal.includes("const chapterImageSource")) {
    portal = replacePatternRequired(
      portal,
      `${path} chapter image data`,
      /(\s*)const flashcardCount = getChapterFlashcardCount\(chapter\);\n\s*return \(/,
      `$1const flashcardCount = getChapterFlashcardCount(chapter);\n$1const chapterImageSource = chapter.chapterImage?.asset?.url || "";\n$1const chapterImageUrl = chapterImageSource ? chapterImageSource + "?w=300&fit=max&auto=format" : "";\n$1const chapterImageAlt = chapter.chapterImage?.alt || chapter.title;\n$1return (`,
    );
  }

  if (!portal.includes('className="chapter-illustration"')) {
    portal = replacePatternRequired(
      portal,
      `${path} chapter image markup`,
      /<article className="chapter-row" key=\{chapter\._id\}>\s*<span className="chapter-number">/,
      `<article className="chapter-row chapter-row-illustrated" key={chapter._id}>\n                    <figure className="chapter-illustration">\n                      {chapterImageUrl ? (\n                        <img\n                          className="chapter-illustration-image"\n                          src={chapterImageUrl}\n                          alt={chapterImageAlt}\n                          loading="lazy"\n                          decoding="async"\n                        />\n                      ) : (\n                        <span className="chapter-illustration-placeholder" aria-hidden="true">✚</span>\n                      )}\n                    </figure>\n                    <span className="chapter-number">`,
    );
  }

  if (!portal.includes('"chapter-open-button"')) {
    portal = replacePatternRequired(
      portal,
      `${path} chapter button class`,
      /<button className=\{classic\.openButton\} onClick=\{\(\) => chooseChapter\(chapter\)\}([^>]*)>/,
      `<button className={[classic.openButton, "chapter-open-button"].join(" ")} onClick={() => chooseChapter(chapter)}$1>`,
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

.chapter-row-illustrated .chapter-illustration-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  filter: drop-shadow(0 14px 20px color-mix(in srgb, var(--primary) 26%, transparent));
}

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
`;
}
writeFileSync(stylesPath, styles);

console.log("Installed the Sanity chapterImage field on chapter cards with a responsive placeholder fallback.");
