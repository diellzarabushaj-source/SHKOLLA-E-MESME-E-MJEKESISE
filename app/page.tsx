"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "next-sanity";

type Flashcard = {
  _id: string;
  front: string;
  back: string;
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
};

type Chapter = {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  flashcardCount: number;
};

type Subject = {
  _id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  emoji?: string;
  chapters: Chapter[];
  flashcardCount: number;
};

const client = createClient({
  projectId: "e1tm3f7l",
  dataset: "production",
  apiVersion: "2026-07-12",
  useCdn: true,
});

const subjectsQuery = `
  *[_type == "subject" && isActive != false] | order(order asc, title asc) {
    _id,
    title,
    "slug": slug.current,
    shortDescription,
    emoji,
    "chapters": *[_type == "chapter" && subject._ref == ^._id && isActive != false] | order(order asc, title asc) {
      _id,
      title,
      "slug": slug.current,
      summary,
      "flashcardCount": count(*[_type == "flashcard" && chapter._ref == ^._id && isActive != false])
    },
    "flashcardCount": count(*[_type == "flashcard" && isActive != false && chapter._ref in *[_type == "chapter" && subject._ref == ^._id]._id])
  }
`;

const cardsQuery = `
  *[_type == "flashcard" && chapter._ref == $chapterId && isActive != false]
  | order(order asc, _createdAt asc) {
    _id, front, back, explanation, difficulty, tags
  }
`;

function ArrowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="button" onClick={onClick} type="button">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
      </svg>
      <span className="text">{label}</span>
    </button>
  );
}

export default function HomePage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<string[]>([]);
  const [review, setReview] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    client
      .fetch<Subject[]>(subjectsQuery)
      .then(setSubjects)
      .catch(() => setError("Lëndët nuk mund të ngarkoheshin. Provo përsëri."))
      .finally(() => setLoading(false));
  }, []);

  const visibleSubjects = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("sq");
    if (!term) return subjects;
    return subjects.filter((subject) =>
      `${subject.title} ${subject.shortDescription || ""}`.toLocaleLowerCase("sq").includes(term),
    );
  }, [search, subjects]);

  const totalChapters = subjects.reduce((sum, subject) => sum + subject.chapters.length, 0);
  const totalCards = subjects.reduce((sum, subject) => sum + subject.flashcardCount, 0);
  const card = cards[cardIndex];
  const progress = cards.length ? ((cardIndex + 1) / cards.length) * 100 : 0;

  async function openChapter(subject: Subject, chapter: Chapter) {
    setSelectedSubject(subject);
    setSelectedChapter(chapter);
    setLoading(true);
    setError("");
    try {
      const result = await client.fetch<Flashcard[]>(cardsQuery, { chapterId: chapter._id });
      setCards(result);
      setCardIndex(0);
      setFlipped(false);
      setKnown([]);
      setReview([]);
    } catch {
      setError("Flashcards nuk mund të ngarkoheshin.");
    } finally {
      setLoading(false);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function next(bucket?: "known" | "review") {
    if (!card) return;
    if (bucket === "known") setKnown((items) => [...new Set([...items, card._id])]);
    if (bucket === "review") setReview((items) => [...new Set([...items, card._id])]);
    setFlipped(false);
    setCardIndex((index) => (index + 1 < cards.length ? index + 1 : 0));
  }

  function goHome() {
    setSelectedSubject(null);
    setSelectedChapter(null);
    setCards([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) {
    return (
      <main className="loading-screen">
        <div className="loader" />
        <span>Duke përgatitur flashcards...</span>
      </main>
    );
  }

  if (selectedSubject && selectedChapter) {
    return (
      <main className="inner-page">
        <div className="breadcrumbs">
          <button onClick={goHome}>Ballina</button><span>/</span>
          <button onClick={() => setSelectedChapter(null)}>{selectedSubject.title}</button><span>/</span>
          <span>{selectedChapter.title}</span>
        </div>

        <section className="chapter-hero">
          <span className="large-icon">{selectedSubject.emoji || "✚"}</span>
          <div>
            <span className="eyebrow">{selectedSubject.title}</span>
            <h1>{selectedChapter.title}</h1>
            <p>{selectedChapter.summary || `${cards.length} flashcards për këtë kapitull.`}</p>
          </div>
        </section>

        {error && <div className="error-box">{error}</div>}

        {!card ? (
          <div className="empty-state large">
            <strong>Ende nuk ka flashcards në këtë kapitull.</strong>
            <span>Dërgo tekstin në chat dhe kartelat do të publikohen këtu.</span>
          </div>
        ) : (
          <section className="study-shell">
            <div className="study-toolbar">
              <div><span className="eyebrow">Modaliteti i studimit</span><strong>{cardIndex + 1} / {cards.length}</strong></div>
              <button className="ghost-button" onClick={() => { setCards([...cards].sort(() => Math.random() - .5)); setCardIndex(0); setFlipped(false); }}>Përziej</button>
            </div>
            <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>

            <button className={`flashcard ${flipped ? "is-flipped" : ""}`} onClick={() => setFlipped(!flipped)}>
              <span className="flashcard-inner">
                <span className="flashcard-face flashcard-front">
                  <span className="card-kicker"><b>PYETJA</b><i className={card.difficulty || "medium"}>{card.difficulty === "easy" ? "E lehtë" : card.difficulty === "hard" ? "E vështirë" : "Mesatare"}</i></span>
                  <strong>{card.front}</strong>
                  <small>Kliko për përgjigjen ↻</small>
                </span>
                <span className="flashcard-face flashcard-back">
                  <span className="card-kicker"><b>PËRGJIGJJA</b></span>
                  <span className="answer">{card.back}</span>
                  {card.explanation && <span className="explanation">{card.explanation}</span>}
                  {!!card.tags?.length && <span className="tags">{card.tags.map((tag) => <em key={tag}>{tag}</em>)}</span>}
                  <small>Kliko për pyetjen ↻</small>
                </span>
              </span>
            </button>

            <div className="deck-actions">
              <button onClick={() => { setFlipped(false); setCardIndex((index) => index > 0 ? index - 1 : cards.length - 1); }}>← Para</button>
              <button className="review" onClick={() => next("review")}>Përsërite</button>
              <button className="known" onClick={() => next("known")}>E dija ✓</button>
              <button onClick={() => next()}>Tjetra →</button>
            </div>
            <div className="study-stats"><span><b>{known.length}</b> të ditura</span><span><b>{review.length}</b> për përsëritje</span></div>
          </section>
        )}
      </main>
    );
  }

  if (selectedSubject) {
    return (
      <main className="inner-page">
        <div className="breadcrumbs"><button onClick={goHome}>Ballina</button><span>/</span><span>{selectedSubject.title}</span></div>
        <section className="subject-hero">
          <span className="large-icon">{selectedSubject.emoji || "✚"}</span>
          <div><span className="eyebrow">Lënda</span><h1>{selectedSubject.title}</h1><p>{selectedSubject.shortDescription}</p></div>
          <div className="subject-summary"><strong>{selectedSubject.chapters.length}</strong><span>kapituj</span><strong>{selectedSubject.flashcardCount}</strong><span>kartela</span></div>
        </section>
        <section className="chapters-section">
          <div className="section-heading"><div><span className="eyebrow">Përmbajtja</span><h2>Kapitujt</h2></div></div>
          {selectedSubject.chapters.length ? (
            <div className="chapter-list">
              {selectedSubject.chapters.map((chapter, index) => (
                <article className="chapter-row" key={chapter._id}>
                  <span className="chapter-number">{String(index + 1).padStart(2, "0")}</span>
                  <div><h3>{chapter.title}</h3><p>{chapter.summary || "Flashcards të kapitullit."}</p></div>
                  <span className="chapter-count">{chapter.flashcardCount} kartela</span>
                  <ArrowButton label="Studio" onClick={() => openChapter(selectedSubject, chapter)} />
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state large"><strong>Ende nuk ka kapituj.</strong><span>Dërgo tekstin e parë dhe do ta krijojmë kapitullin këtu.</span></div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="status-pill"><i /> Platforma e klasës sonë</span>
          <h1>Mëso më shpejt.<br /><em>Mbaj mend më gjatë.</em></h1>
          <p>Të gjitha lëndët e shkollës së mjekësisë, të ndara në kapituj dhe të shndërruara në flashcards të qarta.</p>
          <a className="hero-cta" href="#lendet">Fillo mësimin <span>→</span></a>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orbit one" /><div className="orbit two" />
          <div className="demo-card first"><span>ANATOMI</span><b>Zemra ka sa dhoma?</b><small>Prek për përgjigjen</small></div>
          <div className="demo-card second"><span>FIZIOLOGJI</span><b>Çfarë është homeostaza?</b><small>Prek për përgjigjen</small></div>
          <div className="plus">+</div>
        </div>
      </section>

      <section className="stats-strip">
        <div><strong>{subjects.length}</strong><span>Lëndë</span></div>
        <div><strong>{totalChapters}</strong><span>Kapituj</span></div>
        <div><strong>{totalCards}</strong><span>Flashcards</span></div>
        <div><strong>24/7</strong><span>Në telefon dhe kompjuter</span></div>
      </section>

      <section className="subjects-section" id="lendet">
        <div className="section-heading">
          <div><span className="eyebrow">Biblioteka e klasës</span><h2>Zgjidh lëndën</h2></div>
          <label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kërko lëndën..." /></label>
        </div>
        {error && <div className="error-box">{error}</div>}
        <div className="subject-grid">
          {visibleSubjects.map((subject, index) => (
            <article className="subject-card" key={subject._id}>
              <div className="subject-top"><span>{String(index + 1).padStart(2, "0")}</span><i>{subject.emoji || "✚"}</i></div>
              <h3>{subject.title}</h3>
              <p>{subject.shortDescription || "Kapituj dhe flashcards për përsëritje të shpejtë."}</p>
              <div className="subject-meta"><span>{subject.chapters.length} kapituj</span><span>{subject.flashcardCount} kartela</span></div>
              <ArrowButton label="Hape" onClick={() => { setSelectedSubject(subject); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-section">
        <div><span className="eyebrow">Si funksionon</span><h2>Nga teksti në mësim aktiv</h2></div>
        <div className="workflow-grid">
          <article><span>01</span><h3>Ti dërgon tekstin</h3><p>Materialin e kapitullit e dërgon direkt në chat.</p></article>
          <article><span>02</span><h3>Krijohen flashcards</h3><p>Pikat kryesore kthehen në pyetje dhe përgjigje të sakta.</p></article>
          <article><span>03</span><h3>Publikohen këtu</h3><p>Kartelat shfaqen te lënda dhe kapitulli përkatës.</p></article>
        </div>
      </section>
    </main>
  );
}
