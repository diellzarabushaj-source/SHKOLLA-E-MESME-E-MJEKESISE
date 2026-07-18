�r�^�f��ئ{~,y�'vî���"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../LessonAdminEditor.module.css";
import { uploadAdminImage, validateAdminImage } from "./image-upload";
import { createAdminKey, type AdminFlashcard } from "./types";

type Props = {
  value: AdminFlashcard[];
  onChange: (cards: AdminFlashcard[]) => void;
  onBusyChange?: (busy: boolean) => void;
};

function normalizedCards(cards: AdminFlashcard[]): AdminFlashcard[] {
  return cards.map((card, index) => ({ ...card, order: index + 1 }));
}

export default function AdminFlashcardEditor({ value, onChange, onBusyChange }: Props) {
  const [selectedKey, setSelectedKey] = useState(value[0]?._key || "");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!value.some((card) => card._key === selectedKey)) setSelectedKey(value[0]?._key || "");
  }, [selectedKey, value]);

  useEffect(() => {
    onBusyChange?.(uploading);
    return () => onBusyChange?.(false);
  }, [onBusyChange, uploading]);

  const selectedIndex = value.findIndex((card) => card._key === selectedKey);
  const selected = selectedIndex >= 0 ? value[selectedIndex] : null;
  const visibleCards = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("sq");
    if (!term) return value;
    return value.filter((card) => `${card.title || ""} ${card.front} ${card.back}`.toLocaleLowerCase("sq").includes(term));
  }, [search, value]);

  function updateSelected(patch: Partial<AdminFlashcard>) {
    if (!selected) return;
    onChange(value.map((card) => card._key === selected._key ? { ...card, ...patch } : card));
    setError("");
  }

  function addCard() {
    const key = createAdminKey("card");
    const next: AdminFlashcard = {
      _key: key,
      _type: value[0]?._type || "flashcard",
      title: "",
      front: "",
      back: "",
      explanation: "",
      difficulty: "medium",
      tags: [],
      imageSide: "both",
      isActive: false,
      order: value.length + 1,
    };
    onChange([...value, next]);
    setSelectedKey(key);
    setSearch("");
  }

  function move(direction: -1 | 1) {
    if (selectedIndex < 0) return;
    const target = selectedIndex + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[selectedIndex], next[target]] = [next[target], next[selectedIndex]];
    onChange(normalizedCards(next));
  }

  function removeCard() {
    if (!selected) return;
    if (!window.confirm("A je i sigurt që dëshiron ta fshish këtë flashcard? Progresi i vjetër i saj nuk do të lidhet me një kartelë të re.")) return;
    const next = normalizedCards(value.filter((card) => card._key !== selected._key));
    onChange(next);
    setSelectedKey(next[Math.min(selectedIndex, next.length - 1)]?._key || "");
  }

  async function uploadCardImage(file: File | undefined) {
    if (!file) return;
    const validationError = validateAdminImage(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadAdminImage(file);
      updateSelected({
        image: {
          _type: "image",
          asset: uploaded.asset,
          assetUrl: uploaded.url,
          alt: selected?.front || uploaded.originalFilename,
          caption: "",
        },
        imageSide: selected?.imageSide || "both",
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Fotografia nuk u ngarkua.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <fieldset className={styles.flashcardEditor} disabled={uploading} aria-busy={uploading}>
      <aside className={styles.cardList} aria-label="Flashcards e mësimit">
        <div className={styles.cardListHeader}>
          <div><strong>{value.length} flashcards</strong><small>Secila ruan ID-në e progresit.</small></div>
          <button type="button" onClick={addCard}>＋ Shto</button>
        </div>
        <label className={styles.cardSearch}>
          <span className={styles.visuallyHidden}>Kërko flashcard</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kërko pyetje…" />
        </label>
        <div className={styles.cardListItems}>
          {visibleCards.map((card) => {
            const originalIndex = value.findIndex((item) => item._key === card._key);
            return (
              <button
                type="button"
                key={card._key}
                className={card._key === selectedKey ? styles.cardSelected : undefined}
                onClick={() => setSelectedKey(card._key)}
              >
                <span>{originalIndex + 1}</span>
                <span><strong>{card.front || "Flashcard e re"}</strong><small>{card.isActive === false ? "Joaktive" : card.difficulty === "hard" ? "E vështirë" : card.difficulty === "easy" ? "E lehtë" : "Mesatare"}</small></span>
              </button>
            );
          })}
          {!visibleCards.length && <p className={styles.noCards}>Nuk u gjet asnjë flashcard.</p>}
        </div>
      </aside>

      {selected ? (
        <section className={styles.cardForm} aria-label={`Editimi i flashcard ${selectedIndex + 1}`}>
          <header>
            <div><span>Flashcard #{selectedIndex + 1}</span><strong>{selected.front || "Flashcard e re"}</strong></div>
            <div className={styles.cardOrderActions}>
              <button type="button" onClick={() => move(-1)} disabled={selectedIndex === 0} aria-label="Lëvize lart">↑</button>
              <button type="button" onClick={() => move(1)} disabled={selectedIndex === value.length - 1} aria-label="Lëvize poshtë">↓</button>
              <button type="button" className={styles.removeImage} onClick={removeCard}>Fshije</button>
            </div>
          </header>

          <div className={styles.cardFormGrid}>
            <label className={styles.fullField}>
              Pyetja (Front) <b>*</b>
              <textarea value={selected.front} onChange={(event) => updateSelected({ front: event.target.value })} rows={4} maxLength={10_000} />
            </label>
            <label className={styles.fullField}>
              Përgjigjja (Back) <b>*</b>
              <textarea value={selected.back} onChange={(event) => updateSelected({ back: event.target.value })} rows={5} maxLength={20_000} />
            </label>
            <label className={styles.fullField}>
              Shpjegimi shtesë
              <textarea value={selected.explanation || ""} onChange={(event) => updateSelected({ explanation: event.target.value })} rows={3} maxLength={20_000} />
            </label>
            <label>
              Vështirësia
              <select value={selected.difficulty || "medium"} onChange={(event) => updateSelected({ difficulty: event.target.value as AdminFlashcard["difficulty"] })}>
                <option value="easy">E lehtë</option>
                <option value="medium">Mesatare</option>
                <option value="hard">E vështirë</option>
              </select>
            </label>
            <label>
              Tags (ndaji me presje)
              <input
                value={(selected.tags || []).join(", ")}
                onChange={(event) => updateSelected({ tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 20) })}
                maxLength={1_600}
              />
            </label>
            <label>
              Fotoja shfaqet
              <select value={selected.imageSide || "both"} onChange={(event) => updateSelected({ imageSide: event.target.value as AdminFlashcard["imageSide"] })}>
                <option value="both">Në të dy anët</option>
                <option value="front">Vetëm te pyetja</option>
                <option value="back">Vetëm te përgjigjja</option>
              </select>
            </label>
            <label className={styles.activeToggle}>
              <input
                type="checkbox"
                checked={selected.isActive !== false}
                onChange={(event) => updateSelected({ isActive: event.target.checked })}
              />
              <span><strong>Aktive në website</strong><small>Kartela joaktive ruhet në Sanity, por nuk u shfaqet nxënësve.</small></span>
            </label>
          </div>

          <section className={styles.cardImagePanel} aria-label="Fotografia e flashcard-it">
            <input
              ref={fileRef}
              className={styles.visuallyHidden}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => {
                void uploadCardImage(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            {selected.image?.assetUrl ? (
              <img src={selected.image.assetUrl} alt={selected.image.alt || selected.front} />
            ) : (
              <div className={styles.imagePlaceholder}>Pa fotografi</div>
            )}
            <div>
              <strong>Fotografia e kartelës</strong>
              <p>Ngarkohet në Sanity dhe mund të shfaqet në front, back ose të dyja.</p>
              <div className={styles.imageButtons}>
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? "Duke ngarkuar…" : selected.image?.assetUrl ? "Ndërro foton" : "Shto foto"}</button>
                {selected.image && <button type="button" className={styles.removeImage} onClick={() => updateSelected({ image: undefined })}>Hiqe</button>}
              </div>
            </div>
          </section>

          {selected.image && (
            <div className={styles.cardImageMeta}>
              <label>
                Alt i fotografisë
                <input value={selected.image.alt || ""} onChange={(event) => updateSelected({ image: { ...selected.image, alt: event.target.value } })} maxLength={300} />
              </label>
              <label>
                Përshkrimi i fotografisë
                <input value={selected.image.caption || ""} onChange={(event) => updateSelected({ image: { ...selected.image, caption: event.target.value } })} maxLength={500} />
              </label>
            </div>
          )}
          {error && <p className={styles.inlineError} role="alert">{error}</p>}
        </section>
      ) : (
        <section className={styles.emptyCardEditor}>
          <strong>Nuk ka flashcards.</strong>
          <p>Shto kartelën e parë dhe plotëso pyetjen e përgjigjjen.</p>
          <button type="button" onClick={addCard}>＋ Shto flashcard</button>
        </section>
      )}
    </fieldset>
  );
}
