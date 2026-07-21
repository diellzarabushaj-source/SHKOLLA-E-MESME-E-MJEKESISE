"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type MouseEvent,
} from "react";
import styles from "./LessonAdminEditor.module.css";
import {
  clipboardImageFiles,
  insertImageUploadPlaceholders,
  pastedImagePortableNode,
  removeImageUploadPlaceholder,
  replaceImageUploadPlaceholder,
  type UploadedImageAsset,
} from "./admin-image-paste";

// admin-image-paste-v1
import {
  clipboardTableBlocks,
  createBlankTableBlock,
  insertTableBlocks,
  portableTableToHtml,
  tablePortableNodeFromElement,
} from "./admin-table-paste";

// admin-table-paste-v1

import "./admin-editor-resilience.css";

// admin-editor-safety-v1
// admin-sanity-resilience-v1

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
  if (!href || href.length > 2048 || /[\u0000-\u001F\u007F]/.test(href)) return null;
  if (href.startsWith("#")) return href;
  if (href.startsWith("/") && !href.startsWith("//")) return href;

  try {
    const parsed = new URL(href);
    return ["http:", "https:", "mailto:"].includes(parsed.protocol) ? href : null;
  } catch {
    return null;
  }
}

const SANITY_STUDIO_URL = "https://www.sanity.io/@oZ3HX2fYf/studio/xwvsfazcnhh889nw18ldkuvk/default";

function sanityStudioEditUrl(lessonId: string): string {
  const params = new URLSearchParams({ id: lessonId, type: "lesson", path: "body" });
  return `${SANITY_STUDIO_URL}/intent/edit?${params.toString()}`;
}

async function responseJson<T>(response: Response): Promise<T> {
  return response.json().catch(() => ({} as T));
}

async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);
  try {
    return await fetch(input, {
      ...init,
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("EDITOR_TIMEOUT");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function messageFor(error: string): string {
  if (error === "LESSON_CHANGED_RELOAD") return "Mësimi është ndryshuar në Sanity. Rifreskoje përmbajtjen dhe provo përsëri.";
  if (error === "EDITOR_NOT_CONFIGURED") return "Editorit i mungon lidhja e sigurt me Sanity në Vercel.";
  if (error === "AUTH_REQUIRED" || error === "ADMIN_REQUIRED") return "Sesioni yt nuk ka të drejtë administratori.";
  if (error === "LESSON_BODY_TOO_LARGE") return "Teksti është tepër i madh për një ruajtje të vetme.";
  if (error === "LESSON_NOT_FOUND") return "Mësimi nuk u gjet në Sanity.";
  if (error === "INVALID_EMBEDDED_CONTENT") return "Një fotografi ose element i mbrojtur është hequr nga editori. Rifreskoje nga Sanity dhe provo përsëri.";
  if (error === "EDITOR_TOKEN_INVALID") return "Lidhja e editorit me Sanity nuk ka leje shkrimi. Hape dokumentin në Sanity Studio ose përditëso token-in e Vercel-it.";
  if (error === "INVALID_ORIGIN") return "Kërkesa e ruajtjes u bllokua për siguri. Rifresko faqen dhe provo përsëri.";
  if (error === "LESSON_READ_FAILED") return "Mësimi nuk u lexua nga Sanity. Kontrollo lidhjen dhe provo përsëri.";
  if (error === "LESSON_UPDATE_FAILED") return "Sanity nuk e pranoi ruajtjen. Ndryshimet e tua janë ende në editor.";
  if (error === "EDITOR_TIMEOUT") return "Sanity nuk u përgjigj me kohë. Ndryshimet e tua janë ende në editor; provo përsëri.";
  if (error === "IMAGE_TOO_LARGE") return "Fotoja është më e madhe se 12 MB. Zvogëloje dhe bëje paste përsëri.";
  if (error === "IMAGE_TYPE_NOT_ALLOWED") return "Ky format fotografie nuk pranohet. Përdor PNG, JPG, WebP, GIF ose AVIF.";
  if (error === "IMAGE_UPLOAD_FAILED") return "Fotoja nuk u ngarkua në Sanity. Teksti yt është ende në editor; provo përsëri.";
  if (error === "IMAGE_REQUIRED" || error === "IMAGE_EMPTY") return "Clipboard-i nuk përmbante një fotografi të vlefshme.";
  if (error === "TABLE_TOO_LARGE") return "Tabela është tepër e madhe. Lejohen deri në 100 rreshta dhe 30 kolona.";
  if (error === "TABLE_CELL_TOO_LARGE") return "Një qelizë e tabelës ka më shumë se 6000 shkronja.";
  if (error === "TOO_MANY_TABLES") return "Mund të ngjiten maksimumi 5 tabela njëherësh.";
  if (error === "INVALID_TABLE_CLIPBOARD" || error === "INVALID_TABLE") return "Tabela nuk u njoh. Kopjoje përsëri nga Word, Excel, Google Sheets ose web-i.";
  return "Ndryshimet nuk u ruajtën. Provo përsëri ose hape mësimin në Sanity Studio.";
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
      const tableHtml = portableTableToHtml(node);
      html.push(tableHtml || renderImmutable(node));
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

    const table = tablePortableNodeFromElement(child);
    if (table) {
      result.push(table);
      continue;
    }

    const pastedImage = pastedImagePortableNode(child);
    if (pastedImage) {
      result.push(pastedImage);
      continue;
    }

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

  const usedBlockKeys = new Set<string>();
  for (const node of result) {
    if (typeof node._key !== "string") continue;
    if (usedBlockKeys.has(node._key) && node._type === "block") node._key = keyFor("block");
    usedBlockKeys.add(node._key);
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
  const savedSelectionRef = useRef<Range | null>(null);
  const [currentLesson, setCurrentLesson] = useState<AdminEditableLesson>(lesson);
  const [sourceBody, setSourceBody] = useState<PortableNode[]>(() => structuredClone(lesson.body || []));
  const [editing, setEditing] = useState(false);
  const [loadingEditor, setLoadingEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editorVersion, setEditorVersion] = useState(0);

  useEffect(() => {
    if (editing) return;
    setCurrentLesson(lesson);
    setSourceBody(structuredClone(lesson.body || []));
  }, [editing, lesson]);

  useEffect(() => {
    if (!editing || !dirty) return;

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const confirmLinkNavigation = (event: Event) => {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!target || target.closest('[contenteditable="true"]')) return;
      if (!window.confirm("Ke ndryshime të paruajtura. Të largohesh pa i ruajtur?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", confirmLinkNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", confirmLinkNavigation, true);
    };
  }, [editing, dirty]);

  const initialHtml = useMemo(() => portableToHtml(sourceBody), [sourceBody, editorVersion]);

  // Initialize the editable document only when it opens or receives a fresh Sanity version.
  // React must not rewrite innerHTML after every keystroke because that moves the caret.
  useLayoutEffect(() => {
    if (!editing || !editorRef.current) return;
    editorRef.current.innerHTML = initialHtml;
    savedSelectionRef.current = null;
  }, [editing, editorVersion, initialHtml]);

  async function readLatestFromSanity(showNotice = false): Promise<AdminEditableLesson> {
    const response = await adminFetch(`/api/admin/lessons/${encodeURIComponent(lesson._id)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const result = await responseJson<{ lesson?: AdminEditableLesson; error?: string }>(response);
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
    if (dirty && !window.confirm("Të anulohen ndryshimet e paruajtura?")) return;
    setEditing(false);
    setDirty(false);
    setError("");
    setNotice("");
    setSourceBody(structuredClone(currentLesson.body || []));
    setEditorVersion((version) => version + 1);
  }

  // admin-toolbar-selection-v1: toolbar buttons must not collapse the user's text selection.
  function getEditorSelectionRange(): Range | null {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const selectionNode = container.nodeType === Node.ELEMENT_NODE ? container : container.parentNode;
    if (!selectionNode || !editor.contains(selectionNode)) return null;
    return range.cloneRange();
  }

  function rememberEditorSelection() {
    const range = getEditorSelectionRange();
    if (range) savedSelectionRef.current = range;
  }

  function runCommand(event: MouseEvent<HTMLButtonElement>, command: string, value?: string) {
    event.preventDefault();
    const editor = editorRef.current;
    if (!editor) return;

    let activeRange = getEditorSelectionRange();
    if (!activeRange && savedSelectionRef.current) {
      try {
        activeRange = savedSelectionRef.current.cloneRange();
      } catch {
        savedSelectionRef.current = null;
      }
    }

    editor.focus({ preventScroll: true });
    const selection = window.getSelection();
    if (activeRange && selection) {
      selection.removeAllRanges();
      selection.addRange(activeRange);
    }

    document.execCommand("styleWithCSS", false, "false");
    document.execCommand(command, false, value);
    rememberEditorSelection();
    setDirty(true);
    setNotice("");
    setError("");
  }

  function insertBlankTable(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    insertTableBlocks(editor, [createBlankTableBlock()]);
    rememberEditorSelection();
    setDirty(true);
    setNotice("Tabela u shtua. Plotëso qelizat dhe ruaje mësimin.");
    setError("");
  }

  async function uploadPastedImage(file: File, uploadKey: string) {
    const formData = new FormData();
    formData.set("image", file, file.name || "foto-nga-clipboard.png");
    const response = await adminFetch("/api/admin/assets/images", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData,
    });
    const result = await responseJson<{ asset?: UploadedImageAsset; error?: string }>(response);
    if (!response.ok || !result.asset) throw new Error(result.error || "IMAGE_UPLOAD_FAILED");

    const editor = editorRef.current;
    if (!editor || !replaceImageUploadPlaceholder(editor, uploadKey, result.asset, {
      uploading: styles.imageUploading,
      uploaded: styles.pastedImage,
      spinner: styles.imageSpinner,
      copy: styles.imageUploadCopy,
      removeButton: styles.imageRemove,
    })) {
      throw new Error("IMAGE_UPLOAD_FAILED");
    }
  }

  function onPaste(event: ClipboardEvent<HTMLDivElement>) {
    const imageFiles = clipboardImageFiles(event.clipboardData);
    if (imageFiles.length) {
      event.preventDefault();
      const editor = editorRef.current;
      if (!editor) return;

      const pending = insertImageUploadPlaceholders(editor, imageFiles, {
        uploading: styles.imageUploading,
        uploaded: styles.pastedImage,
        spinner: styles.imageSpinner,
        copy: styles.imageUploadCopy,
        removeButton: styles.imageRemove,
      });
      setUploadingImages((count) => count + pending.length);
      setDirty(true);
      setError("");
      setNotice(pending.length === 1 ? "Duke ngarkuar fotografinë në Sanity…" : "Duke ngarkuar " + pending.length + " fotografi në Sanity…");

      void Promise.allSettled(pending.map(async ({ file, key }) => {
        try {
          await uploadPastedImage(file, key);
        } catch (uploadError) {
          removeImageUploadPlaceholder(editor, key);
          throw uploadError;
        } finally {
          setUploadingImages((count) => Math.max(0, count - 1));
        }
      })).then((results) => {
        const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
        if (failure) {
          const reason = failure.reason instanceof Error ? failure.reason.message : "IMAGE_UPLOAD_FAILED";
          setError(messageFor(reason));
          setNotice("");
          return;
        }
        setNotice(pending.length === 1 ? "Fotoja u ngarkua. Ruaje mësimin për ta publikuar." : "Fotografitë u ngarkuan. Ruaje mësimin për t’i publikuar.");
      });
      return;
    }

    let pastedTables;
    try {
      pastedTables = clipboardTableBlocks(event.clipboardData);
    } catch (tableError) {
      event.preventDefault();
      const reason = tableError instanceof Error ? tableError.message : "INVALID_TABLE_CLIPBOARD";
      setError(messageFor(reason));
      setNotice("");
      return;
    }

    if (pastedTables.length) {
      event.preventDefault();
      const editor = editorRef.current;
      if (!editor) return;
      insertTableBlocks(editor, pastedTables);
      rememberEditorSelection();
      setDirty(true);
      setError("");
      setNotice(pastedTables.length === 1
        ? "Tabela u ngjit. Ruaje mësimin për ta publikuar."
        : pastedTables.length + " tabela u ngjitën. Ruaje mësimin për t’i publikuar.");
      return;
    }

    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const safeHtml = html ? sanitizePastedHtml(html) : plainTextToHtml(text);
    document.execCommand("insertHTML", false, safeHtml);
    rememberEditorSelection();
    setDirty(true);
    setNotice("");
    setError("");
  }

  async function save() {
    if (uploadingImages > 0) {
      setError("Prit derisa fotografitë të ngarkohen në Sanity, pastaj ruaje mësimin.");
      return;
    }
    if (!currentLesson._rev || !editorRef.current) {
      setError("Mësimi duhet të rifreskohet para editimit.");
      return;
    }

    const body = editorToPortable(editorRef.current, sourceBody);
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await adminFetch(`/api/admin/lessons/${encodeURIComponent(currentLesson._id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ revision: currentLesson._rev, body }),
      });
      const result = await responseJson<{ lesson?: AdminEditableLesson; error?: string }>(response);
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
          {error && <p className={styles.inlineError} role="alert">{error} <a data-admin-error-studio href={sanityStudioEditUrl(currentLesson._id)} target="_blank" rel="noopener noreferrer">Hape në Sanity Studio</a></p>}
          {notice && <p className={styles.success} role="status">{notice}</p>}
        </div>
        <div data-admin-actions>
          <button type="button" onClick={() => void startEditing()} disabled={loadingEditor}>
            {loadingEditor ? "Duke hapur…" : "Edito mësimin"}
          </button>
          <a data-admin-studio-link href={sanityStudioEditUrl(currentLesson._id)} target="_blank" rel="noopener noreferrer">Hape në Sanity Studio</a>
        </div>
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
          <a data-admin-studio-link href={sanityStudioEditUrl(currentLesson._id)} target="_blank" rel="noopener noreferrer">Sanity Studio</a>
          <button className={styles.refresh} type="button" onClick={() => void refreshFromSanity()} disabled={saving || loadingEditor || uploadingImages > 0}>
            {loadingEditor ? "Duke rifreskuar…" : "Rifresko nga Sanity"}
          </button>
          <button className={styles.cancel} type="button" onClick={cancel} disabled={saving || uploadingImages > 0}>Anulo</button>
          <button className={styles.save} type="button" onClick={() => void save()} disabled={saving || uploadingImages > 0 || !dirty}>
            {saving ? "Duke ruajtur…" : "Ruaj në Sanity"}
          </button>
        </div>
      </header>

      {error && <div className={styles.error} role="alert"><span>{error}</span><a data-admin-error-studio href={sanityStudioEditUrl(currentLesson._id)} target="_blank" rel="noopener noreferrer">Hape dokumentin në Sanity Studio</a></div>}
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
            <button type="button" title="Shto tabelë 3 × 3" onMouseDown={insertBlankTable}>▦ Tabelë</button>
            <button type="button" onMouseDown={(event) => runCommand(event, "removeFormat")}>Hiq formatin</button>
          </div>
        </div>

        <div className={styles.imagePasteHint} role="note">
          <strong>Paste foto ose tabelë direkt</strong>
          <span>Kopjo një fotografi, screenshot ose tabelë nga Word, Excel, Google Sheets apo web-i dhe shtyp Ctrl/⌘ + V te pozita e kursorit.</span>
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
          onInput={() => {
            rememberEditorSelection();
            setDirty(true);
            setNotice("");
            setError("");
          }}
          onKeyUp={rememberEditorSelection}
          onMouseUp={rememberEditorSelection}
          onSelect={rememberEditorSelection}
          onPaste={onPaste}
          onClick={(event) => {
            if (!(event.target instanceof Element)) return;
            const removeButton = event.target.closest("[data-remove-pasted-image]");
            if (removeButton) {
              event.preventDefault();
              removeButton.closest('figure[data-pasted-sanity-image="true"]')?.remove();
              setDirty(true);
              setNotice("Fotoja u hoq nga mësimi i paruajtur.");
              setError("");
              return;
            }
            if (event.target.closest("a[href]")) event.preventDefault();
          }}
        />
      </div>

      <footer className={styles.editorFooter}>
        <span>
          {dirty ? "Ke ndryshime të paruajtura." : "Përmbajtja përputhet me versionin e ngarkuar nga Sanity."}
          {" "}Fotografitë, tabelat dhe elementet e posaçme ruhen në Sanity.
        </span>
        <div>
          <button className={styles.cancel} type="button" onClick={cancel} disabled={saving || uploadingImages > 0}>Anulo</button>
          <button className={styles.save} type="button" onClick={() => void save()} disabled={saving || uploadingImages > 0 || !dirty}>
            {saving ? "Duke ruajtur…" : "Ruaj në Sanity"}
          </button>
        </div>
      </footer>
    </section>
  );
}
