"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./LessonAnnotations.module.css";

type AnnotationKind = "highlight" | "note";
type AnnotationColor = "yellow" | "green" | "blue" | "pink";

type PortableNode = {
  _key?: string;
  _type?: string;
  children?: Array<{ text?: string }>;
};

type LessonAnnotation = {
  id: string;
  lessonId: string;
  contentRevision: string | null;
  kind: AnnotationKind;
  blockKey: string;
  startOffset: number;
  endOffset: number;
  quote: string;
  prefix: string;
  suffix: string;
  color: AnnotationColor;
  noteText: string | null;
  createdAt: string;
  updatedAt: string;
};

type SelectionDraft = {
  blockKey: string;
  startOffset: number;
  endOffset: number;
  quote: string;
  prefix: string;
  suffix: string;
  left: number;
  top: number;
};

type PaintRect = {
  key: string;
  annotationId: string;
  left: number;
  top: number;
  width: number;
  height: number;
  color: AnnotationColor;
  kind: AnnotationKind;
};

type NotePin = {
  annotation: LessonAnnotation;
  left: number;
  top: number;
};

type Props = {
  enabled: boolean;
  lessonId: string;
  contentRevision?: string;
  body?: PortableNode[];
  articleClassName: string;
  children: ReactNode;
};

const COLORS: AnnotationColor[] = ["yellow", "green", "blue", "pink"];
const COLOR_LABELS: Record<AnnotationColor, string> = {
  yellow: "E verdhë",
  green: "E gjelbër",
  blue: "E kaltër",
  pink: "Rozë",
};

function messageFor(error: string): string {
  if (error === "AUTH_REQUIRED") return "Sesioni ka përfunduar. Kyçu përsëri për t'i ruajtur shënimet.";
  if (error === "ANNOTATION_LIMIT_REACHED") return "Ke arritur kufirin e shënimeve për këtë mësim.";
  if (error === "ANNOTATION_NOT_FOUND") return "Shënimi nuk ekziston më. Lista u rifreskua.";
  return "Shënimi nuk u ruajt. Kontrollo internetin dhe provo përsëri.";
}

function plainBlockText(block: PortableNode): string {
  return Array.isArray(block.children)
    ? block.children.map((child) => typeof child.text === "string" ? child.text : "").join("")
    : "";
}

function normalizedText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function textNodesInside(element: HTMLElement): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

function rangePoint(element: HTMLElement, requestedOffset: number): { node: Text; offset: number } | null {
  const nodes = textNodesInside(element);
  let remaining = Math.max(0, requestedOffset);
  for (const node of nodes) {
    const length = node.data.length;
    if (remaining <= length) return { node, offset: remaining };
    remaining -= length;
  }
  const last = nodes.at(-1);
  return last ? { node: last, offset: last.data.length } : null;
}

function rangeForOffsets(element: HTMLElement, startOffset: number, endOffset: number): Range | null {
  const start = rangePoint(element, startOffset);
  const end = rangePoint(element, endOffset);
  if (!start || !end) return null;
  const range = document.createRange();
  try {
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    return range.collapsed ? null : range;
  } catch {
    return null;
  }
}

function rangeOffset(element: HTMLElement, node: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.setEnd(node, offset);
  return range.toString().length;
}

function quotePosition(text: string, annotation: LessonAnnotation): number | null {
  const direct = text.slice(annotation.startOffset, annotation.endOffset);
  if (direct === annotation.quote) return annotation.startOffset;

  const positions: number[] = [];
  let cursor = text.indexOf(annotation.quote);
  while (cursor >= 0 && positions.length < 100) {
    positions.push(cursor);
    cursor = text.indexOf(annotation.quote, cursor + 1);
  }
  if (!positions.length) return null;
  if (positions.length === 1) return positions[0];

  let best = positions[0];
  let bestScore = -1;
  for (const position of positions) {
    const before = text.slice(Math.max(0, position - annotation.prefix.length), position);
    const after = text.slice(position + annotation.quote.length, position + annotation.quote.length + annotation.suffix.length);
    let score = 0;
    for (let index = 1; index <= Math.min(before.length, annotation.prefix.length); index += 1) {
      if (before.at(-index) !== annotation.prefix.at(-index)) break;
      score += 1;
    }
    for (let index = 0; index < Math.min(after.length, annotation.suffix.length); index += 1) {
      if (after[index] !== annotation.suffix[index]) break;
      score += 1;
    }
    if (score > bestScore) {
      best = position;
      bestScore = score;
    }
  }
  return best;
}

function assignBlockKeys(article: HTMLElement, body: PortableNode[]): Map<string, HTMLElement> {
  const candidates = Array.from(article.querySelectorAll<HTMLElement>("p,h2,h3,h4,blockquote,li"))
    .filter((element) => !element.closest("figure"));
  for (const candidate of candidates) delete candidate.dataset.annotationBlockKey;

  const result = new Map<string, HTMLElement>();
  const blocks = body.filter((node) => node._type === "block" && typeof node._key === "string");
  let cursor = 0;

  for (const block of blocks) {
    const key = block._key as string;
    const expected = normalizedText(plainBlockText(block));
    let candidateIndex = -1;
    for (let index = cursor; index < candidates.length; index += 1) {
      if (normalizedText(candidates[index].textContent || "") === expected) {
        candidateIndex = index;
        break;
      }
    }
    if (candidateIndex < 0 && cursor < candidates.length) candidateIndex = cursor;
    if (candidateIndex < 0) continue;
    const candidate = candidates[candidateIndex];
    candidate.dataset.annotationBlockKey = key;
    result.set(key, candidate);
    cursor = candidateIndex + 1;
  }

  return result;
}

function resolveAnnotationRange(
  annotation: LessonAnnotation,
  blocks: Map<string, HTMLElement>,
): { range: Range; element: HTMLElement } | null {
  const preferred = blocks.get(annotation.blockKey);
  const candidates = preferred
    ? [preferred, ...Array.from(blocks.values()).filter((element) => element !== preferred)]
    : Array.from(blocks.values());

  for (const element of candidates) {
    const text = element.textContent || "";
    const start = quotePosition(text, annotation);
    if (start === null) continue;
    const range = rangeForOffsets(element, start, start + annotation.quote.length);
    if (range) return { range, element };
  }
  return null;
}

export default function LessonAnnotations({
  enabled,
  lessonId,
  contentRevision,
  body = [],
  articleClassName,
  children,
}: Props) {
  const wrapperRef = useRef<HTMLElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const [annotations, setAnnotations] = useState<LessonAnnotation[]>([]);
  const [paintRects, setPaintRects] = useState<PaintRect[]>([]);
  const [notePins, setNotePins] = useState<NotePin[]>([]);
  const [selection, setSelection] = useState<SelectionDraft | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteColor, setNoteColor] = useState<AnnotationColor>("yellow");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAnnotations = useCallback(async () => {
    if (!enabled) return;
    const response = await fetch(`/api/annotations?lessonId=${encodeURIComponent(lessonId)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const result = await response.json() as { annotations?: LessonAnnotation[]; error?: string };
    if (!response.ok) throw new Error(result.error || "ANNOTATION_FAILED");
    setAnnotations(Array.isArray(result.annotations) ? result.annotations : []);
  }, [enabled, lessonId]);

  useEffect(() => {
    setAnnotations([]);
    setSelection(null);
    setPanelOpen(false);
    setComposerOpen(false);
    setEditingId(null);
    setError("");
    setNotice("");
    if (!enabled) return;

    let cancelled = false;
    void loadAnnotations().catch((loadError) => {
      if (!cancelled) setError(messageFor(loadError instanceof Error ? loadError.message : "ANNOTATION_FAILED"));
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, lessonId, loadAnnotations]);

  const recalculate = useCallback(() => {
    const wrapper = wrapperRef.current;
    const article = articleRef.current;
    if (!wrapper || !article) return;

    const blocks = assignBlockKeys(article, body);
    const wrapperBox = wrapper.getBoundingClientRect();
    const articleBox = article.getBoundingClientRect();
    const nextRects: PaintRect[] = [];
    const nextPins: NotePin[] = [];
    const usedPinRows = new Map<number, number>();

    for (const annotation of annotations) {
      const resolved = resolveAnnotationRange(annotation, blocks);
      if (!resolved) continue;
      const rectangles = Array.from(resolved.range.getClientRects()).filter((rect) => rect.width > 1 && rect.height > 1);
      rectangles.forEach((rect, index) => {
        nextRects.push({
          key: `${annotation.id}-${index}`,
          annotationId: annotation.id,
          left: rect.left - wrapperBox.left,
          top: rect.top - wrapperBox.top,
          width: rect.width,
          height: rect.height,
          color: annotation.color,
          kind: annotation.kind,
        });
      });

      if (annotation.kind === "note" && rectangles.length) {
        const last = rectangles.at(-1) as DOMRect;
        const row = Math.round(last.top);
        const stack = usedPinRows.get(row) || 0;
        usedPinRows.set(row, stack + 1);
        nextPins.push({
          annotation,
          left: Math.max(articleBox.left - wrapperBox.left + 8, articleBox.right - wrapperBox.left - 42 - stack * 34),
          top: last.top - wrapperBox.top - 5,
        });
      }
    }

    setPaintRects(nextRects);
    setNotePins(nextPins);
  }, [annotations, body]);

  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const frame = window.requestAnimationFrame(recalculate);
    const delayed = window.setTimeout(recalculate, 300);
    const observer = new ResizeObserver(() => window.requestAnimationFrame(recalculate));
    observer.observe(article);
    const mutationObserver = new MutationObserver(() => window.requestAnimationFrame(recalculate));
    mutationObserver.observe(article, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", recalculate);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(delayed);
      observer.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", recalculate);
    };
  }, [recalculate, contentRevision]);

  const captureSelection = useCallback(() => {
    if (!enabled || busy || composerOpen) return;
    const article = articleRef.current;
    const browserSelection = window.getSelection();
    if (!article || !browserSelection || browserSelection.rangeCount === 0 || browserSelection.isCollapsed) {
      setSelection(null);
      return;
    }

    const range = browserSelection.getRangeAt(0);
    const startElement = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
    const endElement = range.endContainer instanceof Element ? range.endContainer : range.endContainer.parentElement;
    const startBlock = startElement?.closest<HTMLElement>("[data-annotation-block-key]") || null;
    const endBlock = endElement?.closest<HTMLElement>("[data-annotation-block-key]") || null;
    if (!startBlock || !endBlock || startBlock !== endBlock || !article.contains(startBlock)) {
      setSelection(null);
      setNotice("Zgjidh tekst vetëm brenda një paragrafi ose titulli.");
      return;
    }

    const rawQuote = range.toString();
    const leading = rawQuote.length - rawQuote.trimStart().length;
    const trailing = rawQuote.length - rawQuote.trimEnd().length;
    const quote = rawQuote.slice(leading, rawQuote.length - trailing);
    if (!quote || quote.length > 1_000) {
      setSelection(null);
      setNotice(quote.length > 1_000 ? "Zgjedhja është tepër e gjatë." : "Zgjidh një pjesë të tekstit.");
      return;
    }

    const startOffset = rangeOffset(startBlock, range.startContainer, range.startOffset) + leading;
    const endOffset = rangeOffset(startBlock, range.endContainer, range.endOffset) - trailing;
    const blockText = startBlock.textContent || "";
    const rect = range.getBoundingClientRect();
    setNotice("");
    setSelection({
      blockKey: startBlock.dataset.annotationBlockKey as string,
      startOffset,
      endOffset,
      quote,
      prefix: blockText.slice(Math.max(0, startOffset - 64), startOffset),
      suffix: blockText.slice(endOffset, endOffset + 64),
      left: Math.min(window.innerWidth - 150, Math.max(150, rect.left + rect.width / 2)),
      top: Math.min(window.innerHeight - 72, Math.max(72, rect.bottom + 12)),
    });
  }, [busy, composerOpen, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onPointerUp = () => window.setTimeout(captureSelection, 0);
    document.addEventListener("mouseup", onPointerUp);
    document.addEventListener("touchend", onPointerUp, { passive: true });
    return () => {
      document.removeEventListener("mouseup", onPointerUp);
      document.removeEventListener("touchend", onPointerUp);
    };
  }, [captureSelection, enabled]);

  function clearSelection() {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }

  async function createAnnotation(kind: AnnotationKind, color: AnnotationColor, text: string | null) {
    if (!selection) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          contentRevision: contentRevision || null,
          kind,
          color,
          noteText: text,
          blockKey: selection.blockKey,
          startOffset: selection.startOffset,
          endOffset: selection.endOffset,
          quote: selection.quote,
          prefix: selection.prefix,
          suffix: selection.suffix,
        }),
      });
      const result = await response.json() as { annotation?: LessonAnnotation; error?: string };
      if (!response.ok || !result.annotation) throw new Error(result.error || "ANNOTATION_FAILED");
      setAnnotations((current) => {
        const remaining = current.filter((item) => item.id !== result.annotation?.id
          && !(item.kind === result.annotation?.kind
            && item.blockKey === result.annotation?.blockKey
            && item.startOffset === result.annotation?.startOffset
            && item.endOffset === result.annotation?.endOffset));
        return [...remaining, result.annotation as LessonAnnotation].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
      });
      setComposerOpen(false);
      setNoteText("");
      setNotice(kind === "note" ? "Sticky note u ruajt privatisht." : "Teksti u theksua dhe u ruajt privatisht.");
      clearSelection();
    } catch (saveError) {
      setError(messageFor(saveError instanceof Error ? saveError.message : "ANNOTATION_FAILED"));
    } finally {
      setBusy(false);
    }
  }

  async function updateAnnotation(annotation: LessonAnnotation, changes: { color?: AnnotationColor; noteText?: string }) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/annotations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: annotation.id, ...changes }),
      });
      const result = await response.json() as { annotation?: LessonAnnotation; error?: string };
      if (!response.ok || !result.annotation) throw new Error(result.error || "ANNOTATION_FAILED");
      setAnnotations((current) => current.map((item) => item.id === annotation.id ? result.annotation as LessonAnnotation : item));
      setEditingId(null);
      setEditingText("");
      setNotice("Shënimi u përditësua.");
    } catch (updateError) {
      setError(messageFor(updateError instanceof Error ? updateError.message : "ANNOTATION_FAILED"));
    } finally {
      setBusy(false);
    }
  }

  async function removeAnnotation(annotation: LessonAnnotation) {
    if (!window.confirm(annotation.kind === "note" ? "Të fshihet ky sticky note?" : "Të hiqet ky highlight?")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/annotations?id=${encodeURIComponent(annotation.id)}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "ANNOTATION_FAILED");
      setAnnotations((current) => current.filter((item) => item.id !== annotation.id));
      setNotice("Shënimi u fshi.");
    } catch (deleteError) {
      setError(messageFor(deleteError instanceof Error ? deleteError.message : "ANNOTATION_FAILED"));
      void loadAnnotations().catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  function jumpTo(annotation: LessonAnnotation) {
    const article = articleRef.current;
    if (!article) return;
    const blocks = assignBlockKeys(article, body);
    const resolved = resolveAnnotationRange(annotation, blocks);
    resolved?.element.scrollIntoView({ behavior: "smooth", block: "center" });
    setPanelOpen(false);
  }

  if (!enabled) {
    return <article ref={articleRef} className={articleClassName}>{children}</article>;
  }

  const noteCount = annotations.filter((annotation) => annotation.kind === "note").length;

  return (
    <section ref={wrapperRef} className={styles.workspace} data-lesson-annotations>
      <article ref={articleRef} className={articleClassName}>{children}</article>

      <div className={styles.paintLayer} aria-hidden="true">
        {paintRects.map((rect) => (
          <span
            className={`${styles.paint} ${rect.kind === "note" ? styles.notePaint : ""}`}
            data-color={rect.color}
            key={rect.key}
            style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
          />
        ))}
      </div>

      <button
        className={styles.libraryButton}
        type="button"
        onClick={() => setPanelOpen((open) => !open)}
        aria-expanded={panelOpen}
        aria-controls="lesson-annotation-library"
      >
        <span aria-hidden="true">✎</span>
        <span>Shënimet e mia</span>
        <b>{annotations.length}</b>
      </button>

      {notePins.map(({ annotation, left, top }) => (
        <button
          className={styles.notePin}
          data-color={annotation.color}
          key={annotation.id}
          style={{ left, top }}
          type="button"
          aria-label={`Hape sticky note: ${annotation.noteText || annotation.quote}`}
          onClick={() => {
            setPanelOpen(true);
            setEditingId(annotation.id);
            setEditingText(annotation.noteText || "");
          }}
        >
          <span aria-hidden="true">▰</span>
        </button>
      ))}

      {selection && !composerOpen && (
        <div className={styles.selectionToolbar} style={{ left: selection.left, top: selection.top }} role="toolbar" aria-label="Veglat e tekstit të zgjedhur">
          <span>Thekso:</span>
          {COLORS.map((color) => (
            <button
              className={styles.colorButton}
              data-color={color}
              key={color}
              type="button"
              title={COLOR_LABELS[color]}
              aria-label={`Thekso ${COLOR_LABELS[color].toLowerCase()}`}
              disabled={busy}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => void createAnnotation("highlight", color, null)}
            />
          ))}
          <button
            className={styles.addNoteButton}
            type="button"
            disabled={busy}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setNoteText("");
              setNoteColor("yellow");
              setComposerOpen(true);
            }}
          >
            + Sticky note
          </button>
        </div>
      )}

      {composerOpen && selection && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busy) setComposerOpen(false);
        }}>
          <section className={styles.composer} role="dialog" aria-modal="true" aria-labelledby="sticky-note-title">
            <span className={styles.modalEyebrow}>Vetëm për ty</span>
            <h2 id="sticky-note-title">Shto sticky note</h2>
            <blockquote>“{selection.quote}”</blockquote>
            <textarea
              autoFocus
              maxLength={4_000}
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder="Shkruaj shënimin tënd…"
            />
            <div className={styles.composerColors} aria-label="Ngjyra e sticky note">
              {COLORS.map((color) => (
                <button
                  className={noteColor === color ? styles.selectedColor : ""}
                  data-color={color}
                  key={color}
                  type="button"
                  aria-label={COLOR_LABELS[color]}
                  onClick={() => setNoteColor(color)}
                />
              ))}
            </div>
            <div className={styles.modalActions}>
              <button type="button" onClick={() => setComposerOpen(false)} disabled={busy}>Anulo</button>
              <button type="button" onClick={() => void createAnnotation("note", noteColor, noteText.trim())} disabled={busy || !noteText.trim()}>
                {busy ? "Duke ruajtur…" : "Ruaj sticky note"}
              </button>
            </div>
          </section>
        </div>
      )}

      {panelOpen && (
        <aside className={styles.library} id="lesson-annotation-library" aria-label="Shënimet private të mësimit">
          <header>
            <div>
              <span>Private për llogarinë tënde</span>
              <h2>Shënimet e mia</h2>
              <p>{annotations.length} gjithsej · {noteCount} sticky notes</p>
            </div>
            <button type="button" onClick={() => setPanelOpen(false)} aria-label="Mbyll shënimet">×</button>
          </header>

          <div className={styles.libraryList}>
            {annotations.length ? annotations.map((annotation) => (
              <article className={styles.annotationCard} data-color={annotation.color} key={annotation.id}>
                <div className={styles.annotationType}>
                  <span>{annotation.kind === "note" ? "Sticky note" : "Highlight"}</span>
                  <time dateTime={annotation.updatedAt}>{new Intl.DateTimeFormat("sq-AL", { day: "2-digit", month: "short" }).format(new Date(annotation.updatedAt))}</time>
                </div>
                <blockquote>“{annotation.quote}”</blockquote>
                {annotation.kind === "note" && (
                  editingId === annotation.id ? (
                    <div className={styles.noteEditor}>
                      <textarea maxLength={4_000} value={editingText} onChange={(event) => setEditingText(event.target.value)} />
                      <div>
                        <button type="button" onClick={() => setEditingId(null)} disabled={busy}>Anulo</button>
                        <button type="button" onClick={() => void updateAnnotation(annotation, { noteText: editingText.trim() })} disabled={busy || !editingText.trim()}>Ruaj</button>
                      </div>
                    </div>
                  ) : <p>{annotation.noteText}</p>
                )}
                <div className={styles.annotationColors} aria-label="Ndrysho ngjyrën">
                  {COLORS.map((color) => (
                    <button
                      className={annotation.color === color ? styles.selectedColor : ""}
                      data-color={color}
                      key={color}
                      type="button"
                      title={COLOR_LABELS[color]}
                      onClick={() => void updateAnnotation(annotation, { color })}
                      disabled={busy}
                    />
                  ))}
                </div>
                <footer>
                  <button type="button" onClick={() => jumpTo(annotation)}>Shko te teksti</button>
                  {annotation.kind === "note" && editingId !== annotation.id && (
                    <button type="button" onClick={() => {
                      setEditingId(annotation.id);
                      setEditingText(annotation.noteText || "");
                    }}>Ndrysho</button>
                  )}
                  <button className={styles.deleteButton} type="button" onClick={() => void removeAnnotation(annotation)} disabled={busy}>Fshi</button>
                </footer>
              </article>
            )) : (
              <div className={styles.emptyLibrary}>
                <strong>Ende nuk ke shënime.</strong>
                <span>Zgjidh një pjesë të tekstit për ta theksuar ose për t'i shtuar sticky note.</span>
              </div>
            )}
          </div>
        </aside>
      )}

      {(error || notice) && (
        <div className={error ? styles.errorToast : styles.noticeToast} role={error ? "alert" : "status"}>
          {error || notice}
          <button type="button" aria-label="Mbyll mesazhin" onClick={() => { setError(""); setNotice(""); }}>×</button>
        </div>
      )}
    </section>
  );
}
