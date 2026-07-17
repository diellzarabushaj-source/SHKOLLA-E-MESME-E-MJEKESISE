"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./LessonAdminEditor.module.css";

type PortableNode = {
  _key?: string;
  _type?: string;
  style?: string;
  listItem?: string;
  level?: number;
  children?: Array<{
    _key?: string;
    _type?: string;
    text?: string;
    marks?: string[];
  }>;
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

function isTextBlock(node: PortableNode): boolean {
  return node._type === "block";
}

function blockText(node: PortableNode): string {
  return Array.isArray(node.children)
    ? node.children.map((child) => typeof child.text === "string" ? child.text : "").join("")
    : "";
}

function keyFor(prefix: string): string {
  const uuid = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replaceAll("-", "")
    : `${Date.now()}${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${uuid.slice(0, 20)}`;
}

function newBlock(style = "normal", listItem?: "bullet" | "number"): PortableNode {
  const key = keyFor("block");
  return {
    _key: key,
    _type: "block",
    style,
    ...(listItem ? { listItem, level: 1 } : {}),
    markDefs: [],
    children: [{ _key: keyFor("span"), _type: "span", text: "", marks: [] }],
  };
}

function messageFor(error: string): string {
  if (error === "LESSON_CHANGED_RELOAD") return "Mësimi është ndryshuar diku tjetër. Rifresko faqen para se ta ruash përsëri.";
  if (error === "EDITOR_NOT_CONFIGURED") return "Editorit i mungon lidhja e sigurt me Sanity në Vercel.";
  if (error === "AUTH_REQUIRED" || error === "ADMIN_REQUIRED") return "Sesioni yt nuk ka të drejtë administratori.";
  if (error === "LESSON_BODY_TOO_LARGE") return "Teksti është tepër i madh për një ruajtje të vetme.";
  return "Ndryshimet nuk u ruajtën. Provo përsëri.";
}

export default function LessonAdminEditor({ lesson, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PortableNode[]>(() => lesson.body ? structuredClone(lesson.body) : []);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) setDraft(lesson.body ? structuredClone(lesson.body) : []);
  }, [editing, lesson._id, lesson._rev, lesson.body]);

  const textBlockCount = useMemo(() => draft.filter(isTextBlock).length, [draft]);

  function updateNode(index: number, update: (node: PortableNode) => PortableNode) {
    setDraft((current) => current.map((node, nodeIndex) => nodeIndex === index ? update(node) : node));
    setNotice("");
    setError("");
  }

  function updateText(index: number, text: string) {
    updateNode(index, (node) => {
      const originalText = blockText(node);
      if (text === originalText) return node;
      const firstChildKey = node.children?.[0]?._key || keyFor("span");
      return {
        ...node,
        children: [{ _key: firstChildKey, _type: "span", text, marks: [] }],
      };
    });
  }

  function updateStyle(index: number, style: string) {
    updateNode(index, (node) => ({ ...node, style }));
  }

  function updateList(index: number, listItem: string) {
    updateNode(index, (node) => {
      const next = { ...node };
      if (listItem === "bullet" || listItem === "number") {
        next.listItem = listItem;
        next.level = Number(node.level) || 1;
      } else {
        delete next.listItem;
        delete next.level;
      }
      return next;
    });
  }

  function move(index: number, direction: -1 | 1) {
    setDraft((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setNotice("");
  }

  function remove(index: number) {
    setDraft((current) => current.filter((_, nodeIndex) => nodeIndex !== index));
    setNotice("");
  }

  function add(style = "normal", listItem?: "bullet" | "number") {
    setDraft((current) => [...current, newBlock(style, listItem)]);
    setNotice("");
  }

  function cancel() {
    setDraft(lesson.body ? structuredClone(lesson.body) : []);
    setEditing(false);
    setError("");
    setNotice("");
  }

  async function save() {
    if (!lesson._rev) {
      setError("Mësimi duhet të rifreskohet para editimit.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/admin/lessons/${encodeURIComponent(lesson._id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision: lesson._rev, body: draft }),
      });
      const result = await response.json() as { lesson?: AdminEditableLesson; error?: string };
      if (!response.ok || !result.lesson) throw new Error(result.error || "LESSON_UPDATE_FAILED");

      onSaved(result.lesson);
      setDraft(result.lesson.body ? structuredClone(result.lesson.body) : []);
      setNotice("Teksti u ruajt dhe u publikua në Sanity.");
      setEditing(false);
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
          <strong>Edito tekstin e këtij mësimi</strong>
          <small>Ndryshimet ruhen drejtpërdrejt në Sanity.</small>
        </div>
        <button type="button" onClick={() => { setEditing(true); setNotice(""); }}>Edito tekstin</button>
        {notice && <p className={styles.success} role="status">{notice}</p>}
      </section>
    );
  }

  return (
    <section className={styles.editor} aria-label={`Editimi i ${lesson.title}`}>
      <header>
        <div>
          <span className={styles.badge}>Editor administratori</span>
          <h2>{lesson.title}</h2>
          <p>{textBlockCount} blloqe teksti. Fotografitë dhe elementet tjera ruhen pa u ndryshuar.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.cancel} type="button" onClick={cancel} disabled={saving}>Anulo</button>
          <button className={styles.save} type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Duke ruajtur…" : "Ruaj në Sanity"}
          </button>
        </div>
      </header>

      <div className={styles.addTools} aria-label="Shto bllok">
        <span>Shto:</span>
        <button type="button" onClick={() => add("normal")}>Paragraf</button>
        <button type="button" onClick={() => add("h2")}>Heading H2</button>
        <button type="button" onClick={() => add("h3")}>Subheading H3</button>
        <button type="button" onClick={() => add("normal", "bullet")}>Pikë</button>
        <button type="button" onClick={() => add("normal", "number")}>Numërim</button>
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}

      <div className={styles.blocks}>
        {draft.map((node, index) => isTextBlock(node) ? (
          <article className={styles.block} key={node._key || index}>
            <div className={styles.blockToolbar}>
              <span>#{index + 1}</span>
              <label>
                Lloji
                <select value={node.style || "normal"} onChange={(event) => updateStyle(index, event.target.value)}>
                  <option value="normal">Paragraf</option>
                  <option value="h2">Heading H2</option>
                  <option value="h3">Subheading H3</option>
                  <option value="h4">Heading H4</option>
                  <option value="blockquote">Citim</option>
                </select>
              </label>
              <label>
                Lista
                <select value={node.listItem || ""} onChange={(event) => updateList(index, event.target.value)}>
                  <option value="">Pa listë</option>
                  <option value="bullet">Me pika</option>
                  <option value="number">Me numra</option>
                </select>
              </label>
              <div className={styles.orderActions}>
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Lëvize lart">↑</button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === draft.length - 1} aria-label="Lëvize poshtë">↓</button>
                <button className={styles.remove} type="button" onClick={() => remove(index)} aria-label="Fshije bllokun">Fshije</button>
              </div>
            </div>
            <textarea
              value={blockText(node)}
              onChange={(event) => updateText(index, event.target.value)}
              rows={Math.max(2, Math.min(10, blockText(node).split("\n").length + 1))}
              aria-label={`Teksti i bllokut ${index + 1}`}
            />
          </article>
        ) : (
          <article className={styles.immutable} key={node._key || index}>
            <span>#{index + 1}</span>
            <div><strong>Element {node._type || "i panjohur"}</strong><small>Ruhet i pandryshuar për siguri.</small></div>
            <div className={styles.orderActions}>
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Lëvize lart">↑</button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === draft.length - 1} aria-label="Lëvize poshtë">↓</button>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.editorFooter}>
        <span>Ruajtja e publikon menjëherë tekstin në dataset-in schoolv2.</span>
        <div>
          <button className={styles.cancel} type="button" onClick={cancel} disabled={saving}>Anulo</button>
          <button className={styles.save} type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Duke ruajtur…" : "Ruaj në Sanity"}
          </button>
        </div>
      </div>
    </section>
  );
}
