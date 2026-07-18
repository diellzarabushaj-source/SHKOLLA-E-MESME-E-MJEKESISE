�r�^�f��ئ{~,y�'vî���"use client";

import { useEffect, useState } from "react";
import AdminFlashcardEditor from "./admin-editor/AdminFlashcardEditor";
import AdminRichTextEditor from "./admin-editor/AdminRichTextEditor";
import type { AdminEditableLesson, AdminFlashcard, PortableNode } from "./admin-editor/types";
import styles from "./LessonAdminEditor.module.css";

export type { AdminEditableLesson } from "./admin-editor/types";

type Props = {
  lesson: AdminEditableLesson;
  onSaved: (lesson: AdminEditableLesson) => void;
};

type EditorTab = "content" | "flashcards";

function messageFor(error: string): string {
  if (error === "LESSON_CHANGED_RELOAD") return "Mësimi është ndryshuar në Sanity ose në një pajisje tjetër. Mbylle editorin dhe hape përsëri që të mos mbishkruhet puna e re.";
  if (error === "SANITY_DRAFT_EXISTS") return "Ky mësim ka një draft të papublikuar në Sanity Studio. Publikoje ose fshije draftin atje, pastaj hape editorin përsëri.";
  if (error === "EDITOR_NOT_CONFIGURED") return "Editorit i mungon lidhja e sigurt me Sanity në Vercel.";
  if (error === "AUTH_REQUIRED" || error === "ADMIN_REQUIRED") return "Sesioni yt nuk ka të drejtë administratori ose ka skaduar.";
  if (error === "LESSON_BODY_TOO_LARGE") return "Teksti është tepër i madh për një ruajtje të vetme.";
  if (error === "TOO_MANY_FLASHCARDS") return "Ky mësim ka më shumë flashcards se kufiri i sigurt.";
  if (error === "INVALID_FLASHCARD") return "Kontrollo flashcards: çdo kartelë aktive duhet ta ketë pyetjen dhe përgjigjjen.";
  if (error === "INVALID_IMAGE_ASSET") return "Një fotografi nuk është e vlefshme në Sanity. Ngarkoje përsëri.";
  if (error === "UNSUPPORTED_LESSON_CONTENT") return "Ky mësim përmban një format të veçantë nga Sanity që editori i website-it nuk e njeh ende. Për siguri, editimi u bllokua që të mos humbasë asnjë pjesë e tekstit.";
  return "Ndryshimet nuk u ruajtën. Provo përsëri.";
}

export default function LessonAdminEditor({ lesson, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cardImageUploading, setCardImageUploading] = useState(false);
  const [tab, setTab] = useState<EditorTab>("content");
  const [baseRevision, setBaseRevision] = useState("");
  const [draftBody, setDraftBody] = useState<PortableNode[]>([]);
  const [draftCards, setDraftCards] = useState<AdminFlashcard[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [remoteChanged, setRemoteChanged] = useState(false);

  useEffect(() => {
    if (editing && baseRevision && lesson._rev && lesson._rev !== baseRevision) setRemoteChanged(true);
  }, [baseRevision, editing, lesson._rev]);

  async function openEditor() {
    setLoading(true);
    setError("");
    setNotice("");
    setRemoteChanged(false);
    try {
      const response = await fetch(`/api/admin/lessons/${encodeURIComponent(lesson._id)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const result = await response.json().catch(() => null) as { lesson?: AdminEditableLesson; error?: string } | null;
      if (!response.ok || !result?.lesson?._rev) throw new Error(result?.error || "LESSON_LOAD_FAILED");

      setBaseRevision(result.lesson._rev);
      setDraftBody(result.lesson.body ? structuredClone(result.lesson.body) : []);
      setDraftCards(result.lesson.flashcards ? structuredClone(result.lesson.flashcards) : []);
      setTab("content");
      setEditing(true);
    } catch (loadError) {
      setError(messageFor(loadError instanceof Error ? loadError.message : "LESSON_LOAD_FAILED"));
    } finally {
      setLoading(false);
    }
  }

  function closeEditor() {
    if (cardImageUploading) return;
    setEditing(false);
    setBaseRevision("");
    setDraftBody([]);
    setDraftCards([]);
    setRemoteChanged(false);
    setError("");
  }

  async function save() {
    if (cardImageUploading) {
      setError("Prit derisa fotografia e flashcard-it të përfundojë ngarkimin.");
      return;
    }
    if (!baseRevision || remoteChanged) {
      setError(messageFor("LESSON_CHANGED_RELOAD"));
      return;
    }

    const invalidCard = draftCards.find((card) => card.isActive !== false && (!card.front.trim() || !card.back.trim()));
    if (invalidCard) {
      setTab("flashcards");
      setError("Çdo flashcard aktive duhet ta ketë pyetjen dhe përgjigjjen. Plotësoje ose bëje joaktive para ruajtjes.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/lessons/${encodeURIComponent(lesson._id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision: baseRevision,
          body: draftBody,
          flashcards: draftCards,
        }),
      });
      const result = await response.json().catch(() => null) as { lesson?: AdminEditableLesson; error?: string } | null;
      if (!response.ok || !result?.lesson) throw new Error(result?.error || "LESSON_UPDATE_FAILED");

      onSaved(result.lesson);
      setNotice("Teksti, formatimi, fotografitë dhe flashcards u publikuan në Sanity dhe u sinkronizuan në website.");
      setEditing(false);
      setBaseRevision("");
      setDraftBody([]);
      setDraftCards([]);
    } catch (saveError) {
      const code = saveError instanceof Error ? saveError.message : "LESSON_UPDATE_FAILED";
      if (code === "LESSON_CHANGED_RELOAD" || code === "SANITY_DRAFT_EXISTS") setRemoteChanged(true);
      setError(messageFor(code));
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <section className={styles.adminBar} aria-label="Veglat e administratorit">
        <div>
          <span className={styles.badge}>Vetëm administratori</span>
          <strong>Edito mësimin dhe flashcards</strong>
          <small>Editor rich-text, fotografi dhe sinkronizim i drejtpërdrejtë me Sanity.</small>
        </div>
        <button type="button" onClick={() => void openEditor()} disabled={loading}>
          {loading ? "Duke hapur…" : "✎ Edito mësimin"}
        </button>
        {error && <p className={styles.error} role="alert">{error}</p>}
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
          <p>Ndryshimet ruhen bashkë si një version i vetëm dhe publikohen menjëherë në Sanity.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.cancel} type="button" onClick={closeEditor} disabled={saving || cardImageUploading}>Anulo</button>
          <button className={styles.save} type="button" onClick={() => void save()} disabled={saving || remoteChanged || cardImageUploading}>
            {saving ? "Duke ruajtur…" : "Ruaj dhe publiko"}
          </button>
        </div>
      </header>

      <div className={styles.editorTabs} role="tablist" aria-label="Pjesa që editohet">
        <button type="button" role="tab" aria-selected={tab === "content"} className={tab === "content" ? styles.tabActive : undefined} onClick={() => setTab("content")} disabled={cardImageUploading}>
          Teksti i mësimit
        </button>
        <button type="button" role="tab" aria-selected={tab === "flashcards"} className={tab === "flashcards" ? styles.tabActive : undefined} onClick={() => setTab("flashcards")} disabled={cardImageUploading}>
          Flashcards <span>{draftCards.length}</span>
        </button>
      </div>

      {remoteChanged && (
        <div className={styles.conflict} role="alert">
          <strong>U zbulua një version më i ri.</strong>
          <span>Për siguri, ky version nuk mund të ruhet. Anuloje dhe hape editorin përsëri.</span>
        </div>
      )}
      {error && <div className={styles.error} role="alert">{error}</div>}

      <div role="tabpanel" hidden={tab !== "content"} className={styles.tabPanel}>
        {tab === "content" && (
          <AdminRichTextEditor
            initialValue={draftBody}
            revision={`${lesson._id}:${baseRevision}`}
            onChange={setDraftBody}
          />
        )}
      </div>
      <div role="tabpanel" hidden={tab !== "flashcards"} className={styles.tabPanel}>
        {tab === "flashcards" && <AdminFlashcardEditor value={draftCards} onChange={setDraftCards} onBusyChange={setCardImageUploading} />}
      </div>

      <div className={styles.editorFooter}>
        <span>Ruajtja përdor kontroll versioni; asnjë ndryshim paralel nuk mbishkruhet në heshtje.</span>
        <div>
          <button className={styles.cancel} type="button" onClick={closeEditor} disabled={saving || cardImageUploading}>Anulo</button>
          <button className={styles.save} type="button" onClick={() => void save()} disabled={saving || remoteChanged || cardImageUploading}>
            {saving ? "Duke ruajtur…" : "Ruaj dhe publiko"}
          </button>
        </div>
      </div>
    </section>
  );
}
