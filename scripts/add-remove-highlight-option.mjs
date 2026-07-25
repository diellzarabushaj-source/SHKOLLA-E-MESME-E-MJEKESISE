import { readFileSync, writeFileSync } from "node:fs";

const componentFile = "app/LessonAnnotations.tsx";
let component = readFileSync(componentFile, "utf8");

const markerV1 = "highlight-removal-option-v1";
const markerV2 = "highlight-removal-option-v2";

if (component.includes(markerV2)) {
  console.log("Resilient highlight removal option already installed.");
  process.exit(0);
}

if (!component.includes("annotation-mobile-safety-v2")) {
  throw new Error("Highlight removal must be installed after the mobile annotation hardener.");
}

function swap(label, find, replacement) {
  if (!component.includes(find)) throw new Error(`${label}: pattern missing`);
  component = component.replace(find, replacement);
}

const previousRemovalHandler = `  async function removeHighlightsFromSelection() {
    if (!selection) return;

    const matchingHighlights = annotations.filter((annotation) =>
      annotation.kind === "highlight"
      && annotation.blockKey === selection.blockKey
      && annotation.startOffset < selection.endOffset
      && annotation.endOffset > selection.startOffset
    );

    if (!matchingHighlights.length) {
      setNotice("Nuk ka highlighting në pjesën e zgjedhur.");
      clearSelection();
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const removedIds = await Promise.all(matchingHighlights.map(async (annotation) => {
        const response = await fetch(\`/api/annotations?id=\${encodeURIComponent(annotation.id)}\`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        const result = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(result.error || "ANNOTATION_FAILED");
        return annotation.id;
      }));

      const removed = new Set(removedIds);
      setAnnotations((current) => current.filter((annotation) => !removed.has(annotation.id)));
      setNotice(matchingHighlights.length === 1 ? "Highlighting-u u hoq." : \`\${matchingHighlights.length} highlighting-e u hoqën.\`);
      clearSelection();
    } catch (deleteError) {
      setError(messageFor(deleteError instanceof Error ? deleteError.message : "ANNOTATION_FAILED"));
      void loadAnnotations().catch(() => {});
    } finally {
      setBusy(false);
    }
  }`;

const resilientRemovalHandler = `  async function removeHighlightsFromSelection() {
    if (!selection) return;

    const article = articleRef.current;
    const blocks = article ? assignBlockKeys(article, body) : null;
    const selectedBlock = blocks?.get(selection.blockKey) || null;

    const matchingHighlights = annotations.filter((annotation) => {
      if (annotation.kind !== "highlight") return false;

      if (blocks && selectedBlock) {
        const resolved = resolveAnnotationRange(annotation, blocks);
        if (resolved && resolved.element === selectedBlock) {
          const liveStart = rangeOffset(
            selectedBlock,
            resolved.range.startContainer,
            resolved.range.startOffset,
          );
          const liveEnd = rangeOffset(
            selectedBlock,
            resolved.range.endContainer,
            resolved.range.endOffset,
          );
          return liveStart < selection.endOffset && liveEnd > selection.startOffset;
        }
      }

      return annotation.blockKey === selection.blockKey
        && annotation.startOffset < selection.endOffset
        && annotation.endOffset > selection.startOffset;
    });

    if (!matchingHighlights.length) {
      setNotice("Nuk ka highlighting në pjesën e zgjedhur.");
      clearSelection();
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const removedIds = await Promise.all(matchingHighlights.map(async (annotation) => {
        const response = await fetch(\`/api/annotations?id=\${encodeURIComponent(annotation.id)}\`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        const result = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(result.error || "ANNOTATION_FAILED");
        return annotation.id;
      }));

      const removed = new Set(removedIds);
      setAnnotations((current) => current.filter((annotation) => !removed.has(annotation.id)));
      setNotice(matchingHighlights.length === 1 ? "Highlighting-u u hoq." : \`\${matchingHighlights.length} highlighting-e u hoqën.\`);
      clearSelection();
    } catch (deleteError) {
      setError(messageFor(deleteError instanceof Error ? deleteError.message : "ANNOTATION_FAILED"));
      void loadAnnotations().catch(() => {});
    } finally {
      setBusy(false);
    }
  }`;

if (component.includes(markerV1)) {
  swap("upgrade highlight removal handler", previousRemovalHandler, resilientRemovalHandler);
  swap("upgrade highlight removal marker", `// ${markerV1}`, `// ${markerV2}`);
  writeFileSync(componentFile, component);
  console.log("Upgraded None removal to match the live rendered highlight position.");
  process.exit(0);
}

swap(
  "highlight removal styles",
  'import "./annotation-mobile-polish.css";',
  'import "./annotation-mobile-polish.css";\nimport "./highlight-removal.css";\n\n// highlight-removal-option-v2',
);

swap(
  "selection removal handler",
  `  function jumpTo(annotation: LessonAnnotation) {`,
  `${resilientRemovalHandler}

  function jumpTo(annotation: LessonAnnotation) {`,
);

swap(
  "None toolbar control",
  `          <span>Thekso:</span>
          {COLORS.map((color) => (`,
  `          <span>Thekso:</span>
          <button
            data-annotation-remove-highlight
            type="button"
            title="None — hiq highlighting-un"
            aria-label="Hiq highlighting-un nga teksti i zgjedhur"
            disabled={busy}
            onClick={() => void removeHighlightsFromSelection()}
          >
            <span aria-hidden="true">×</span>
            <span data-annotation-none-label>None</span>
          </button>
          {COLORS.map((color) => (`,
);

swap(
  "sticky note mobile label",
  `            className={styles.addNoteButton}
            type="button"`,
  `            className={styles.addNoteButton}
            data-annotation-add-note
            aria-label="+ Sticky note"
            type="button"`,
);

writeFileSync(componentFile, component);
console.log("Installed resilient None removal for live highlight positions.");
