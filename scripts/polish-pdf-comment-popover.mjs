import { readFileSync, writeFileSync } from "node:fs";

const file = "app/LessonAnnotations.tsx";
let source = readFileSync(file, "utf8");

if (source.includes("pdf-comment-popover-v2")) {
  console.log("PDF-style comment popover already installed.");
  process.exit(0);
}

if (!source.includes("adobe-sticky-popover-v1")) {
  throw new Error("PDF comment refinement must run after the Adobe sticky popover installer.");
}

function swap(label, find, replacement) {
  if (!source.includes(find)) throw new Error(`${label}: pattern missing`);
  source = source.replace(find, replacement);
}

swap(
  "PDF comment stylesheet",
  'import "./adobe-sticky-toast.css";',
  'import "./adobe-sticky-toast.css";\nimport "./pdf-comment-popover.css";\n\n// pdf-comment-popover-v2',
);

swap(
  "comment date helper",
  `export default function LessonAnnotations({`,
  `function commentDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tani";
  return new Intl.DateTimeFormat("sq-AL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function LessonAnnotations({`,
);

swap(
  "comment editing state",
  `  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [popoverText, setPopoverText] = useState("");`,
  `  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [popoverText, setPopoverText] = useState("");
  const [popoverEditing, setPopoverEditing] = useState(false);`,
);

swap(
  "lesson reset",
  `    setOpenNoteId(null);
    setPopoverText("");
    setError("");`,
  `    setOpenNoteId(null);
    setPopoverText("");
    setPopoverEditing(false);
    setError("");`,
);

swap(
  "deleted comment cleanup",
  `    setOpenNoteId(null);
    setPopoverText("");
  }, [annotations, openNoteId]);

  const recalculate = useCallback(() => {`,
  `    setOpenNoteId(null);
    setPopoverText("");
    setPopoverEditing(false);
  }, [annotations, openNoteId]);

  useEffect(() => {
    if (!openNoteId) return;

    const onPointerDown = (event: PointerEvent) => {
      if (popoverEditing) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-pdf-comment-popover]")) return;
      const pin = target.closest<HTMLElement>("[data-pdf-comment-pin]");
      if (pin?.dataset.pdfCommentPin === openNoteId) return;
      setOpenNoteId(null);
      setPopoverText("");
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const active = annotations.find((annotation) => annotation.id === openNoteId);
      if (popoverEditing) {
        setPopoverText(active?.noteText || "");
        setPopoverEditing(false);
        return;
      }
      setOpenNoteId(null);
      setPopoverText("");
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [annotations, openNoteId, popoverEditing]);

  const recalculate = useCallback(() => {`,
);

swap(
  "open new comment automatically",
  `      setComposerOpen(false);
      setNoteText("");
      setNotice(kind === "note" ? "Sticky note u ruajt privatisht." : "Teksti u theksua dhe u ruajt privatisht.");`,
  `      setComposerOpen(false);
      setNoteText("");
      if (kind === "note") {
        setOpenNoteId(result.annotation.id);
        setPopoverText(result.annotation.noteText || "");
        setPopoverEditing(false);
      }
      setNotice(kind === "note" ? "Sticky note u ruajt privatisht." : "Teksti u theksua dhe u ruajt privatisht.");`,
);

swap(
  "boolean update result",
  `  async function updateAnnotation(annotation: LessonAnnotation, changes: { color?: AnnotationColor; noteText?: string }) {`,
  `  async function updateAnnotation(annotation: LessonAnnotation, changes: { color?: AnnotationColor; noteText?: string }): Promise<boolean> {`,
);

swap(
  "successful update result",
  `      setEditingText("");
      setNotice("Shënimi u përditësua.");
    } catch (updateError) {`,
  `      setEditingText("");
      setNotice("Shënimi u përditësua.");
      return true;
    } catch (updateError) {`,
);

swap(
  "failed update result",
  `    } catch (updateError) {
      setError(messageFor(updateError instanceof Error ? updateError.message : "ANNOTATION_FAILED"));
    } finally {`,
  `    } catch (updateError) {
      setError(messageFor(updateError instanceof Error ? updateError.message : "ANNOTATION_FAILED"));
      return false;
    } finally {`,
);

swap(
  "library closes comment",
  `          setOpenNoteId(null);
          setPopoverText("");
          setPanelOpen((open) => !open);`,
  `          setOpenNoteId(null);
          setPopoverText("");
          setPopoverEditing(false);
          setPanelOpen((open) => !open);`,
);

swap(
  "comment pin identity",
  `          data-color={annotation.color}
          key={annotation.id}`,
  `          data-color={annotation.color}
          data-pdf-comment-pin={annotation.id}
          key={annotation.id}`,
);

swap(
  "comment pin opening",
  `            setPanelOpen(false);
            setEditingId(null);
            setEditingText("");
            setNotice("");
            setError("");
            setPopoverText(annotation.noteText || "");
            setOpenNoteId((current) => current === annotation.id ? null : annotation.id);`,
  `            const opening = openNoteId !== annotation.id;
            setPanelOpen(false);
            setEditingId(null);
            setEditingText("");
            setNotice("");
            setError("");
            setPopoverEditing(false);
            setPopoverText(opening ? annotation.noteText || "" : "");
            setOpenNoteId(opening ? annotation.id : null);`,
);

swap(
  "open comment derivation",
  `  const openNotePin = openNoteId ? notePins.find(({ annotation }) => annotation.id === openNoteId) : undefined;`,
  `  const openNotePin = openNoteId ? notePins.find(({ annotation }) => annotation.id === openNoteId) : undefined;
  const openNoteDirty = Boolean(
    openNotePin
    && popoverText.trim() !== (openNotePin.annotation.noteText || "").trim()
  );`,
);

const popoverStart = source.indexOf("      {openNotePin && (\n        <aside");
const popoverEndMarker = "      )}\n\n      {selection && !composerOpen && (";
const popoverEnd = source.indexOf(popoverEndMarker, popoverStart);
if (popoverStart < 0 || popoverEnd < 0) {
  throw new Error("PDF comment markup: Adobe popover boundaries missing");
}

const pdfPopover = `      {openNotePin && (
        <aside
          data-annotation-ui
          data-adobe-note-popover
          data-pdf-comment-popover
          data-color={openNotePin.annotation.color}
          role="dialog"
          aria-modal="false"
          aria-labelledby="pdf-comment-title"
          aria-describedby="pdf-comment-quote"
          style={{ left: openNotePin.left, top: openNotePin.top }}
        >
          <header data-pdf-comment-header>
            <div data-pdf-comment-author>
              <span data-pdf-comment-avatar aria-hidden="true">▰</span>
              <div>
                <strong id="pdf-comment-title">Komenti im</strong>
                <time dateTime={openNotePin.annotation.updatedAt}>
                  {commentDate(openNotePin.annotation.updatedAt)}
                </time>
              </div>
            </div>
            <button
              type="button"
              aria-label="Mbyll komentin"
              onClick={() => {
                if (popoverEditing && openNoteDirty && !window.confirm("Të mbyllet komenti pa i ruajtur ndryshimet?")) return;
                setOpenNoteId(null);
                setPopoverText("");
                setPopoverEditing(false);
              }}
            >×</button>
          </header>

          <blockquote id="pdf-comment-quote">“{openNotePin.annotation.quote}”</blockquote>

          {popoverEditing ? (
            <div data-pdf-comment-editor>
              <textarea
                autoFocus
                maxLength={4_000}
                value={popoverText}
                onChange={(event) => setPopoverText(event.target.value)}
                placeholder="Shkruaj komentin tënd…"
                aria-label="Teksti i komentit"
              />
              <div data-pdf-comment-editor-meta>
                <span>{openNoteDirty ? "Ndryshime të paruajtura" : "Pa ndryshime"}</span>
                <span>{popoverText.length}/4000</span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              data-pdf-comment-body
              aria-label="Ndrysho komentin"
              onClick={() => setPopoverEditing(true)}
            >
              {openNotePin.annotation.noteText || <em>Preke për të shkruar një koment.</em>}
            </button>
          )}

          <div data-adobe-note-colors aria-label="Ndrysho ngjyrën e komentit">
            {COLORS.map((color) => (
              <button
                className={openNotePin.annotation.color === color ? styles.selectedColor : ""}
                data-color={color}
                key={color}
                type="button"
                title={COLOR_LABELS[color]}
                aria-label={COLOR_LABELS[color]}
                disabled={busy}
                onClick={() => void updateAnnotation(openNotePin.annotation, { color })}
              />
            ))}
          </div>

          <footer>
            <button
              type="button"
              data-adobe-note-delete
              disabled={busy}
              onClick={() => void removeAnnotation(openNotePin.annotation)}
            >Fshi</button>

            <div data-pdf-comment-actions>
              {popoverEditing ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setPopoverText(openNotePin.annotation.noteText || "");
                      setPopoverEditing(false);
                    }}
                  >Anulo</button>
                  <button
                    type="button"
                    data-adobe-note-save
                    disabled={busy || !popoverText.trim() || !openNoteDirty}
                    onClick={() => {
                      void updateAnnotation(openNotePin.annotation, { noteText: popoverText.trim() })
                        .then((saved) => {
                          if (saved) setPopoverEditing(false);
                        });
                    }}
                  >{busy ? "Duke ruajtur…" : "Ruaj"}</button>
                </>
              ) : (
                <button
                  type="button"
                  data-pdf-comment-edit
                  disabled={busy}
                  onClick={() => setPopoverEditing(true)}
                >Ndrysho</button>
              )}
            </div>
          </footer>
        </aside>
      )}

`;

source = `${source.slice(0, popoverStart)}${pdfPopover}${source.slice(popoverEnd + "      )}\n\n".length)}`;

writeFileSync(file, source);
console.log("Installed a PDF-style tap-to-open comment card with safe read and edit modes.");
