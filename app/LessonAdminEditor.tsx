"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type MouseEvent,
} from "react";
import styles from "./LessonAdminEditor.module.css";

type PortableSpan = {
  _key?: string;
  _type?: string;
  text?: string;
  marks?: string[];
};

type PortableMarkDef = {
  _key?: string;
  _type?: string;
  href?: string;
  [key: string]: unknown;
};

type PortableNode = {
  _key?: string;
  _type?: string;
  style?: string;
  listItem?: string;
  level?: number;
  markDefs?: PortableMarkDef[];
  children?: PortableSpan[];
  alt?: string;
  caption?: string;
  assetUrl?: string;
  asset?: { url?: string };
  [key: string]: unknown;
};

export type AdminEditableLesson = {
  _id: string;
  _rev?: string;
  title: string;
  body?: PortableNode[];
};

type Props = {
  lesson: AdminEditableLesson;
  onSaved: (lesson: AdminEditableLesson) => void;
};

const BLOCK_TAGS = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "BLOCKQUOTE"]);
const SAFE_PASTE_TAGS = new Set([
  "P", "DIV", "H1", "H2", "H3", "H4", "BLOCKQUOTE",
  "UL", "OL", "LI", "STRONG", "B", "EM", "I", "U", "CODE",
  "MARK", "A", "BR", "SPAN",
]);

function keyFor(prefix: string): string {
  const uuid = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replaceAll("-", "")
    : `${Date.now()}${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${uuid.slice(0, 20)}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const href = value.trim();
  if (!href || href.length > 2048) return null;
  if (href.startsWith("/") || href.startsWith("#")) return href;

  try {
    const parsed = new URL(href);
    return ["http:", "https:", "mailto:"].includes(parsed.protocol) ? href : null;
  } catch {
    return null;
  }
}

function messageFor(error: string): string {
  if (error === "LESSON_CHANGED_RELOAD") return "Mësimi është ndryshuar në Sanity. Rifreskoje përmbajtjen dhe provo përsëri.";
  if (error === "EDITOR_NOT_CONFIGURED") return "Editorit i mungon lidhja e sigurt me Sanity në Vercel.";
  if (error === "AUTH_REQUIRED" || error === "ADMIN_REQUIRED") return "Sesioni yt nuk ka të drejtë administratori.";
  if (error === "LESSON_BODY_TOO_LARGE") return "Teksti është tepër i madh për një ruajtje të vetme.";
  if (error === "LESSON_NOT_FOUND") return "Mësimi nuk u gjet në Sanity.";
  return "Ndryshimet nuk u ruajtën. Provo përsëri.";
}

function renderSpan(span: PortableSpan, markDefs: PortableMarkDef[]): string {
  let html = escapeHtml(typeof span.text === "string" ? span.text : "").replaceAll("\n", "<br>");
  const marks = Array.isArray(span.marks) ? span.marks : [];

  for (const mark of marks) {
    if (mark === "strong") html = `<strong>${html}</strong>`;
    else if (mark === "em") html = `<em>${html}</em>`;
    else if (mark === "underline") html = `<u>${html}</u>`;
    else if (mark === "code") html = `<code>${html}</code>`;
    else if (mark === "highlight") html = `<mark>${html}</mark>`;
    else {
      const definition = markDefs.find((item) => item._key === mark);
      const href = definition?._type === "link" ? safeHref(definition.href) : null;
      if (href) {
        html = `<a href="${escapeHtml(href)}" data-mark-key="${escapeHtml(mark)}">${html}</a>`;
      }
    }
  }

  return html;
}

function renderTextBlock(node: PortableNode, tagName?: string): string {
  const key = typeof node._key === "string" ? node._key : keyFor("block");
  const markDefs = Array.isArray(node.markDefs) ? node.markDefs : [];
  const content = Array.isArray(node.children)
    ? node.children.map((span) => renderSpan(span, markDefs)).join("")
    : "";
  const tag = tagName || (
    node.style === "h2" ? "h2"
      : node.style === "h3" ? "h3"
        : node.style === "h4" ? "h4"
          : node.style === "blockquote" ? "blockquote"
            : "p"
  );

  return `<${tag} data-portable-key="${escapeHtml(key)}">${content || "<br>"}</${tag}>`;
}

function renderImmutable(node: PortableNode): string {
  const key = typeof node._key === "string" ? node._key : keyFor("node");
  const type = typeof node._type === "string" ? node._type : "element";
  const imageUrl = node.assetUrl || node.asset?.url;
  const title = node.caption || node.alt || (type === "image" ? "Fotografi e mësimit" : `Element ${type}`);

  if (type === "image" && imageUrl) {
    return `<figure data-portable-immutable="true" data-portable-key="${escapeHtml(key)}" contenteditable="false">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(node.alt || title)}">
      <figcaption><strong>Fotografi nga Sanity</strong><span>${escapeHtml(title)}</span></figcaption>
    </figure>`;
  }

  return `<div data-portable-immutable="true" data-portable-key="${escapeHtml(key)}" contenteditable="false">
    <strong>${escapeHtml(title)}</strong><span>Ky element ruhet i pandryshuar.</span>
  </div>`;
}

function portableToHtml(body: PortableNode[]): string {
  if (!body.length) return "<p><br></p>";

  const html: string[] = [];
  for (let index = 0; index < body.length; index += 1) {
    const node = body[index];

    if (node._type !== "block") {
      html.push(renderImmutable(node));
      continue;
    }

    if (node.listItem === "bullet" || node.listItem === "number") {
      const listType = node.listItem;
      const listTag = listType === "number" ? "ol" : "ul";
      const items: string[] = [];
      let cursor = index;

      while (cursor < body.length) {
        const item = body[cursor];
        if (item._type !== "block" || item.listItem !== listType) break;
        const key = typeof item._key === "string" ? item._key : keyFor("block");
        const content = Array.isArray(item.children)
          ? item.children.map((span) => renderSpan(span, Array.isArray(item.markDefs) ? item.markDefs : [])).join("")
          : "";
        items.push(`<li data-portable-key="${escapeHtml(key)}" data-list-level="${Number(item.level) || 1}">${content || "<br>"}</li>`);
        cursor += 1;
      }

      html.push(`<${listTag}>${items.join("")}</${listTag}>`);
      index = cursor - 1;
      continue;
    }

    html.push(renderTextBlock(node));
  }

  return html.join("");
}

function sameMarks(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((mark, index) => mark === right[index]);
}

function mergeSpans(spans: PortableSpan[]): PortableSpan[] {
  const merged: PortableSpan[] = [];

  for (const span of spans) {
    const text = typeof span.text === "string" ? span.text : "";
    const marks = Array.isArray(span.marks) ? span.marks : [];
    const previous = merged.at(-1);
    const previousMarks = Array.isArray(previous?.marks) ? previous.marks : [];

    if (previous && sameMarks(previousMarks, marks)) {
      previous.text = `${previous.text || ""}${text}`;
    } else {
      merged.push({
        _key: span._key || keyFor("span"),
        _type: "span",
        text,
        marks,
      });
    }
  }

  return merged.length
    ? merged
    : [{ _key: keyFor("span"), _type: "span", text: "", marks: [] }];
}

function inlineContent(
  parent: Node,
  inheritedMarks: string[],
  markDefs: PortableMarkDef[],
): PortableSpan[] {
  const spans: PortableSpan[] = [];

  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      spans.push({
        _key: keyFor("span"),
        _type: "span",
        text: node.textContent || "",
        marks: inheritedMarks,
      });
      continue;
    }

    if (!(node instanceof HTMLElement)) continue;
    if (node.tagName === "BR") {
      spans.push({ _key: keyFor("span"), _type: "span", text: "\n", marks: inheritedMarks });
      continue;
    }
    if (node.tagName === "UL" || node.tagName === "OL") continue;
    if (node.dataset.portableImmutable === "true") continue;

    const marks = [...inheritedMarks];
    const addMark = (mark: string) => {
      if (!marks.includes(mark)) marks.push(mark);
    };

    if (node.matches("strong,b") || Number.parseInt(node.style.fontWeight || "0", 10) >= 600) addMark("strong");
    if (node.matches("em,i") || node.style.fontStyle === "italic") addMark("em");
    if (node.matches("u") || node.style.textDecoration.includes("underline")) addMark("underline");
    if (node.matches("code")) addMark("code");
    if (node.matches("mark") || Boolean(node.style.backgroundColor)) addMark("highlight");

    if (node.matches("a")) {
      const href = safeHref(node.getAttribute("href"));
      if (href) {
        const existingKey = node.dataset.markKey;
        const markKey = existingKey || keyFor("link");
        if (!markDefs.some((definition) => definition._key === markKey)) {
          markDefs.push({ _key: markKey, _type: "link", href });
        }
        addMark(markKey);
      }
    }

    spans.push(...inlineContent(node, marks, markDefs));
  }

  return spans;
}

function blockFromElement(
  element: HTMLElement,
  style: string,
  listItem?: "bullet" | "number",
  level = 1,
): PortableNode {
  const markDefs: PortableMarkDef[] = [];
  const children = mergeSpans(inlineContent(element, [], markDefs));

  return {
    _key: element.dataset.portableKey || keyFor("block"),
    _type: "block",
    style,
    ...(listItem ? { listItem, level: Math.min(4, Math.max(1, level)) } : {}),
    markDefs,
    children,
  };
}

function editorToPortable(root: HTMLElement, sourceBody: PortableNode[]): PortableNode[] {
  const immutableByKey = new Map(
    sourceBody
      .filter((node) => node._type !== "block" && typeof node._key === "string")
      .map((node) => [node._key as string, node]),
  );
  const result: PortableNode[] = [];

  const addList = (list: HTMLElement, level = 1) => {
    const listItem = list.tagName === "OL" ? "number" : "bullet";
    for (const child of Array.from(list.children)) {
      if (!(child instanceof HTMLElement) || child.tagName !== "LI") continue;
      result.push(blockFromElement(child, "normal", listItem, Number(child.dataset.listLevel) || level));
      for (const nested of Array.from(child.children)) {
        if (nested instanceof HTMLElement && (nested.tagName === "UL" || nested.tagName === "OL")) {
          addList(nested, level + 1);
        }
      }
    }
  };

  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || "";
      if (!text.trim()) continue;
      const wrapper = document.createElement("p");
      wrapper.textContent = text;
      result.push(blockFromElement(wrapper, "normal"));
      continue;
    }

    if (!(child instanceof HTMLElement)) continue;

    if (child.dataset.portableImmutable === "true") {
      const original = child.dataset.portableKey ? immutableByKey.get(child.dataset.portableKey) : null;
      if (original) result.push(structuredClone(original));
      continue;
    }

    if (child.tagName === "UL" || child.tagName === "OL") {
      addList(child);
      continue;
    }

    if (!BLOCK_TAGS.has(child.tagName)) {
      if (child.textContent?.trim()) result.push(blockFromElement(child, "normal"));
      continue;
    }

    const style = child.tagName === "H1" || child.tagName === "H2"
      ? "h2"
      : child.tagName === "H3"
        ? "h3"
        : child.tagName === "H4"
          ? "h4"
          : child.tagName === "BLOCKQUOTE"
            ? "blockquote"
            : "normal";
    result.push(blockFromElement(child, style));
  }

  return result.length ? result : [{
    _key: keyFor("block"),
    _type: "block",
    style: "normal",
    markDefs: [],
    children: [{ _key: keyFor("span"), _type: "span", text: "", marks: [] }],
  }];
}

function sanitizePastedHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(html, "text/html");

  const sanitizeNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent || "");
    if (!(node instanceof HTMLElement)) return "";

    const tag = node.tagName;
    if (["SCRIPT", "STYLE", "META", "LINK", "IFRAME", "OBJECT"].includes(tag)) return "";
    const content = Array.from(node.childNodes).map(sanitizeNode).join("");

    if (!SAFE_PASTE_TAGS.has(tag)) return content;
    if (tag === "BR") return "<br>";

    if (tag === "A") {
      const href = safeHref(node.getAttribute("href"));
      return href ? `<a href="${escapeHtml(href)}">${content}</a>` : content;
    }

    if (tag === "SPAN") {
      let wrapped = content;
      const weight = Number.parseInt(node.style.fontWeight || "0", 10);
      if (weight >= 600 || node.style.fontWeight === "bold") wrapped = `<strong>${wrapped}</strong>`;
      if (node.style.fontStyle === "italic") wrapped = `<em>${wrapped}</em>`;
      if (node.style.textDecoration.includes("underline")) wrapped = `<u>${wrapped}</u>`;
      if (node.style.backgroundColor) wrapped = `<mark>${wrapped}</mark>`;
      return wrapped;
    }

    const normalizedTag = tag === "H1" ? "h2" : tag.toLowerCase();
    return `<${normalizedTag}>${content}</${normalizedTag}>`;
  };

  return Array.from(parsed.body.childNodes).map(sanitizeNode).join("");
}

function plainTextToHtml(text: string): string {
  return text
    .replaceAll("\r\n", "\n")
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

export default function LessonAdminEditor({ lesson, onSaved }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [currentLesson, setCurrentLesson] = useState<AdminEditableLesson>(lesson);
  const [sourceBody, setSourceBody] = useState<PortableNode[]>(() => structuredClone(lesson.body || []));
  const [editing, setEditing] = useState(false);
  const [loadingEditor, setLoadingEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editorVersion, setEditorVersion] = useState(0);

  useEffect(() => {
    if (editing) return;
    setCurrentLesson(lesson);
    setSourceBody(structuredClone(lesson.body || []));
  }, [editing, lesson]);

  const initialHtml = useMemo(() => portableToHtml(sourceBody), [sourceBody, editorVersion]);

  async function readLatestFromSanity(showNotice = false): Promise<AdminEditableLesson> {
    const response = await fetch(`/api/admin/lessons/${encodeURIComponent(lesson._id)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const result = await response.json() as { lesson?: AdminEditableLesson; error?: string };
    if (!response.ok || !result.lesson) throw new Error(result.error || "LESSON_UPDATE_FAILED");

    setCurrentLesson(result.lesson);
    setSourceBody(structuredClone(result.lesson.body || []));
    setEditorVersion((version) => version + 1);
    setDirty(false);
    onSaved(result.lesson);
    if (showNotice) setNotice("U ngarkua versioni më i ri nga Sanity.");
    return result.lesson;
  }

  async function startEditing() {
    setLoadingEditor(true);
    setError("");
    setNotice("");

    try {
      await readLatestFromSanity();
      setEditing(true);
    } catch (loadError) {
      setError(messageFor(loadError instanceof Error ? loadError.message : "LESSON_UPDATE_FAILED"));
    } finally {
      setLoadingEditor(false);
    }
  }

  async function refreshFromSanity() {
    if (dirty && !window.confirm("Ke ndryshime të paruajtura. Të ngarkohet versioni nga Sanity dhe të humben këto ndryshime?")) {
      return;
    }

    setLoadingEditor(true);
    setError("");
    setNotice("");
    try {
      await readLatestFromSanity(true);
    } catch (loadError) {
      setError(messageFor(loadError instanceof Error ? loadError.message : "LESSON_UPDATE_FAILED"));
    } finally {
      setLoadingEditor(false);
    }
  }

  function cancel() {
    setEditing(false);
    setDirty(false);
    setError("");
    setNotice("");
    setSourceBody(structuredClone(currentLesson.body || []));
    setEditorVersion((version) => version + 1);
  }

  function runCommand(event: MouseEvent<HTMLButtonElement>, command: string, value?: string) {
    event.preventDefault();
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setDirty(true);
    setNotice("");
    setError("");
  }

  function onPaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const safeHtml = html ? sanitizePastedHtml(html) : plainTextToHtml(text);
    document.execCommand("insertHTML", false, safeHtml);
    setDirty(true);
    setNotice("");
    setError("");
  }

  async function save() {
    if (!currentLesson._rev || !editorRef.current) {
      setError("Mësimi duhet të rifreskohet para editimit.");
      return;
    }

    const body = editorToPortable(editorRef.current, sourceBody);
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/admin/lessons/${encodeURIComponent(currentLesson._id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision: currentLesson._rev, body }),
      });
      const result = await response.json() as { lesson?: AdminEditableLesson; error?: string };
      if (!response.ok || !result.lesson) throw new Error(result.error || "LESSON_UPDATE_FAILED");

      setCurrentLesson(result.lesson);
      setSourceBody(structuredClone(result.lesson.body || []));
      setEditorVersion((version) => version + 1);
      setDirty(false);
      setNotice("Teksti u ruajt dhe u publikua në Sanity.");
      onSaved(result.lesson);
    } catch (saveError) {
      setError(messageFor(saveError instanceof Error ? saveError.message : "LESSON_UPDATE_FAILED"));
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <section className={styles.adminBar} aria-label="Veglat e administratorit">
        <div>
          <span className={styles.badge}>Vetëm administratori</span>
          <strong>Edito përmbajtjen e këtij mësimi</strong>
          <small>Editor i vetëm rich-text, i sinkronizuar drejtpërdrejt me Sanity.</small>
          {error && <p className={styles.inlineError} role="alert">{error}</p>}
          {notice && <p className={styles.success} role="status">{notice}</p>}
        </div>
        <button type="button" onClick={() => void startEditing()} disabled={loadingEditor}>
          {loadingEditor ? "Duke hapur…" : "Edito mësimin"}
        </button>
      </section>
    );
  }

  return (
    <section className={styles.editor} aria-label={`Editimi i ${currentLesson.title}`}>
      <header className={styles.editorHeader}>
        <div>
          <span className={styles.badge}>Editor administratori</span>
          <h2>{currentLesson.title}</h2>
          <p>Shkruaj ose bëj paste me formatim. Përmbajtja ruhet si Portable Text në Sanity.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.refresh} type="button" onClick={() => void refreshFromSanity()} disabled={saving || loadingEditor}>
            {loadingEditor ? "Duke rifreskuar…" : "Rifresko nga Sanity"}
          </button>
          <button className={styles.cancel} type="button" onClick={cancel} disabled={saving}>Anulo</button>
          <button className={styles.save} type="button" onClick={() => void save()} disabled={saving || !dirty}>
            {saving ? "Duke ruajtur…" : "Ruaj në Sanity"}
          </button>
        </div>
      </header>

      {error && <div className={styles.error} role="alert">{error}</div>}
      {notice && <div className={styles.notice} role="status">{notice}</div>}

      <div className={styles.documentBox}>
        <div className={styles.toolbar} role="toolbar" aria-label="Formatimi i tekstit">
          <div className={styles.toolbarGroup}>
            <button type="button" title="Zhbëj" onMouseDown={(event) => runCommand(event, "undo")}>↶</button>
            <button type="button" title="Ribëj" onMouseDown={(event) => runCommand(event, "redo")}>↷</button>
          </div>
          <div className={styles.toolbarGroup}>
            <button type="button" onMouseDown={(event) => runCommand(event, "formatBlock", "p")}>Paragraf</button>
            <button type="button" onMouseDown={(event) => runCommand(event, "formatBlock", "h2")}>Heading</button>
            <button type="button" onMouseDown={(event) => runCommand(event, "formatBlock", "h3")}>Subheading</button>
            <button type="button" onMouseDown={(event) => runCommand(event, "formatBlock", "blockquote")}>Citim</button>
          </div>
          <div className={styles.toolbarGroup}>
            <button className={styles.boldButton} type="button" title="Bold" onMouseDown={(event) => runCommand(event, "bold")}>B</button>
            <button className={styles.italicButton} type="button" title="Italic" onMouseDown={(event) => runCommand(event, "italic")}>I</button>
            <button className={styles.underlineButton} type="button" title="Nënvizim" onMouseDown={(event) => runCommand(event, "underline")}>U</button>
            <button className={styles.highlightButton} type="button" title="Highlight" onMouseDown={(event) => runCommand(event, "hiliteColor", "#fde68a")}>Highlight</button>
          </div>
          <div className={styles.toolbarGroup}>
            <button type="button" onMouseDown={(event) => runCommand(event, "insertUnorderedList")}>• Listë</button>
            <button type="button" onMouseDown={(event) => runCommand(event, "insertOrderedList")}>1. Listë</button>
            <button type="button" onMouseDown={(event) => runCommand(event, "removeFormat")}>Hiq formatin</button>
          </div>
        </div>

        <div
          key={editorVersion}
          ref={editorRef}
          className={styles.richEditor}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={`Përmbajtja e ${currentLesson.title}`}
          data-placeholder="Shkruaj përmbajtjen e mësimit këtu…"
          dangerouslySetInnerHTML={{ __html: initialHtml }}
          onInput={() => {
            setDirty(true);
            setNotice("");
            setError("");
          }}
          onPaste={onPaste}
        />
      </div>

      <footer className={styles.editorFooter}>
        <span>
          {dirty ? "Ke ndryshime të paruajtura." : "Përmbajtja përputhet me versionin e ngarkuar nga Sanity."}
          {" "}Fotografitë dhe elementet e posaçme ruhen të pandryshuara.
        </span>
        <div>
          <button className={styles.cancel} type="button" onClick={cancel} disabled={saving}>Anulo</button>
          <button className={styles.save} type="button" onClick={() => void save()} disabled={saving || !dirty}>
            {saving ? "Duke ruajtur…" : "Ruaj në Sanity"}
          </button>
        </div>
      </footer>
    </section>
  );
}
