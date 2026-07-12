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

type Rating = "again" | "hard" | "good" | "easy";
type RatingStats = Record<Rating, number>;

const emptyRatings: RatingStats = { again: 0, hard: 0, good: 0, easy: 0 };

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "e1tm3f7l",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-07-12",
  useCdn: false,
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
    "flashcardCount": count(*[
      _type == "flashcard" &&
      isActive != false &&
      chapter._ref in *[_type == "chapter" && subject._ref == ^._id && isActive != false]._id
    ])
  }
`;

const cardsQuery = `
  *[_type == "flashcard" && chapter._ref == $chapterId && isActive != false]
  | order(order asc, _createdAt asc) {
    _id, front, back, explanation, difficulty, tags
  }
`;

function OpenButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="open-button" onClick={onClick} type="button">
      <span>{label}</span>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export default function HomePage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [ratings, setRatings] = useState<RatingStats>(emptyRatings);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchSubjects(showLoader = true) {
    if (showLoader) setLoading(true);
    setError("");
    try {
      const result = await client.fetch<Subject[]>(subjectsQuery, {}, { perspective: "published" });
      setSubjects(result);
    } catch {
      setError("Lëndët nuk mund të ngarkoheshin. Provo përsëri.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useEffect(() => {
    void fetchSubjects();
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
  const progress = cards.length ? (finished ? 100 : ((cardIndex + 1) / cards.length) * 100) : 0;
  const answeredCount = Object.values(ratings).reduce((sum, count) => sum + count, 0);

  async function openChapter(subject: Subject, chapter: Chapter) {
    setSelectedSubject(subject);
    setSelectedChapter(chapter);
    setLoading(true);
    setError("");
    try {
      const result = await client.fetch<Flashcard[]>(cardsQuery, { chapterId: chapter._id }, { perspective: "published" });
      setCards(result);
      setCardIndex(0);
      setRevealed(false);
      setFinished(false);
      setRatings(emptyRatings);
    } catch {
      setError("Flashcards nuk mund të ngarkoheshin.");
    } finally {
      setLoading(false);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function rateCard(rating: Rating) {
    if (!card || !revealed) return;
    setRatings((current) => ({ ...current, [rating]: current[rating] + 1 }));
    setRevealed(false);
    if (cardIndex >= cards.length - 1) {
      setFinished(true);
    } else {
      setCardIndex((index) => index + 1);
    }
  }

  function previousCard() {
    setRevealed(false);
    if (finished) {
      setFinished(false);
      setCardIndex(Math.max(cards.length - 1, 0));
      return;
    }
    setCardIndex((index) => Math.max(index - 1, 0));
  }

  function restartDeck(shuffle = false) {
    if (shuffle) setCards((current) => [...current].sort(() => Math.random() - 0.5));
    setCardIndex(0);
    setRevealed(false);
    setFinished(false);
    setRatings(emptyRatings);
  }

  function goHome() {
    setSelectedSubject(null);
    setSelectedChapter(null);
    setCards([]);
    void fetchSubjects(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToSubject() {
    setSelectedChapter(null);
    setCards([]);
    setRevealed(false);
    setFinished(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (!selectedChapter || finished || !card) return;

      if (event.code === "Space") {
        event.preventDefault();
        setRevealed((value) => !value);
      }
      if (revealed && event.key === "1") rateCard("again");
      if (revealed && event.key === "2") rateCard("hard");
      if (revealed && event.key === "3") rateCard("good");
      if (revealed && event.key === "4") rateCard("easy");
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedChapter, finished, card, revealed]);

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
      <main className="inner-page study-page">
        <div className="breadcrumbs">
          <button onClick={goHome}>Ballina</button><span>/</span>
          <button onClick={goToSubject}>{selectedSubject.title}</button><span>/</span>
          <span>{selectedChapter.title}</span>
        </div>

        <section className="chapter-hero compact-hero">
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
        ) : finished ? (
          <section className="finish-card">
            <span className="finish-icon">✓</span>
            <span className="eyebrow">Sesioni përfundoi</span>
            <h2>I kalove të gjitha {cards.length} kartelat</h2>
            <p>Rezultati i këtij sesioni ruhet derisa ta rifillosh kapitullin.</p>
            <div className="finish-stats">
              <div><strong>{ratings.again}</strong><span>Përsëri</span></div>
              <div><strong>{ratings.hard}</strong><span>Vështirë</span></div>
              <div><strong>{ratings.good}</strong><span>Mirë</span></div>
              <div><strong>{ratings.easy}</strong><span>Lehtë</span></div>
            </div>
            <div className="finish-actions">
              <button className="secondary-button" onClick={() => restartDeck(true)}>Përzieje dhe rifillo</button>
              <button className="primary-button" onClick={() => restartDeck(false)}>Rifillo kapitullin</button>
            </div>
          </section>
        ) : (
          <section className="study-shell">
            <div className="study-toolbar">
              <div className="study-context">
                <span className="eyebrow">Studim aktiv</span>
                <strong>{cardIndex + 1} <small>/ {cards.length}</small></strong>
              </div>
              <div className="study-tools">
                <button className="icon-button" onClick={previousCard} disabled={cardIndex === 0} aria-label="Kartela paraprake">←</button>
                <button className="ghost-button" onClick={() => restartDeck(true)}>Përziej</button>
              </div>
            </div>
            <div className="progress-track" aria-label={`${Math.round(progress)}% e përfunduar`}>
              <span style={{ width: `${progress}%` }} />
            </div>

            <button
              className={`flashcard ${revealed ? "is-flipped" : ""}`}
              onClick={() => setRevealed((value) => !value)}
              type="button"
              aria-label={revealed ? "Kthehu te pyetja" : "Shfaq përgjigjen"}
            >
              <span className="flashcard-inner">
                <span className="flashcard-face flashcard-front">
                  <span className="card-kicker">
                    <b>PYETJA</b>
                    <i className={card.difficulty || "medium"}>
                      {card.difficulty === "easy" ? "E lehtë" : card.difficulty === "hard" ? "E vështirë" : "Mesatare"}
                    </i>
                  </span>
                  <strong>{card.front}</strong>
                  <small>Preke kartelën ose shtyp Space</small>
                </span>
                <span className="flashcard-face flashcard-back">
                  <span className="card-kicker"><b>PËRGJIGJJA</b><i className="answer-ready">Gati për vlerësim</i></span>
                  <span className="answer-question">{card.front}</span>
                  <span className="answer">{card.back}</span>
                  {card.explanation && <span className="explanation">{card.explanation}</span>}
                  {!!card.tags?.length && <span className="tags">{card.tags.map((tag) => <em key={tag}>{tag}</em>)}</span>}
                  <small>Vlerësoje më poshtë</small>
                </span>
              </span>
            </button>

            {!revealed ? (
              <button className="reveal-button" onClick={() => setRevealed(true)} type="button">
                Shfaq përgjigjen <kbd>Space</kbd>
              </button>
            ) : (
              <div className="rating-actions" aria-label="Vlerëso kartelën">
                <button className="rating-again" onClick={() => rateCard("again")}><b>Përsëri</b><span>&lt; 1 min</span><kbd>1</kbd></button>
                <button className="rating-hard" onClick={() => rateCard("hard")}><b>Vështirë</b><span>6 min</span><kbd>2</kbd></button>
                <button className="rating-good" onClick={() => rateCard("good")}><b>Mirë</b><span>10 min</span><kbd>3</kbd></button>
                <button className="rating-easy" onClick={() => rateCard("easy")}><b>Lehtë</b><span>4 ditë</span><kbd>4</kbd></button>
              </div>
            )}

            <div className="study-stats">
              <span><b>{answeredCount}</b> të vlerësuara</span>
              <span><b>{ratings.again}</b> për përsëritje</span>
              <span><b>{ratings.good + ratings.easy}</b> të mësuara</span>
            </div>
          </section>
        )}
      </main>
    );
  }

  if (selectedSubject) {
    return (
      <main className="inner-page subject-page">
        <div className="breadcrumbs"><button onClick={goHome}>Ballina</button><span>/</span><span>{selectedSubject.title}</span></div>
        <section className="subject-hero">
          <span className="large-icon">{selectedSubject.emoji || "✚"}</span>
          <div>
            <span className="eyebrow">Lënda</span>
            <h1>{selectedSubject.title}</h1>
            <p>{selectedSubject.shortDescription}</p>
          </div>
          <div className="subject-summary">
            <div><strong>{selectedSubject.chapters.length}</strong><span>Kapituj</span></div>
            <div><strong>{selectedSubject.flashcardCount}</strong><span>Kartela</span></div>
          </div>
        </section>

        <section className="chapters-section">
          <div className="section-heading">
            <div><span className="eyebrow">Përmbajtja</span><h2>Kapitujt</h2></div>
          </div>
          {selectedSubject.chapters.length ? (
            <div className="chapter-list">
              {selectedSubject.chapters.map((chapter, index) => (
                <article className="chapter-row" key={chapter._id}>
                  <span className="chapter-number">{String(index + 1).padStart(2, "0")}</span>
                  <div className="chapter-copy">
                    <h3>{chapter.title}</h3>
                    <p>{chapter.summary || "Flashcards të kapitullit."}</p>
                    <span className="chapter-count-mobile">{chapter.flashcardCount} kartela</span>
                  </div>
                  <span className="chapter-count">{chapter.flashcardCount} kartela</span>
                  <OpenButton label="Studio" onClick={() => openChapter(selectedSubject, chapter)} />
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
          <p>Materialet e shkollës së mjekësisë, të ndara në kapituj dhe të kthyera në kartela për mësim aktiv.</p>
          <a className="hero-cta" href="#lendet">Fillo mësimin <span>→</span></a>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orbit one" /><div className="orbit two" />
          <div className="demo-card first"><span>ANATOMI & FIZIOLOGJI</span><b>Çfarë është sistemi lokomotor?</b><small>Prek për përgjigjen</small></div>
          <div className="demo-card second"><span>ANKI MODE</span><b>Përsëri · Vështirë · Mirë · Lehtë</b><small>Mëso sipas ritmit tënd</small></div>
          <div className="plus">+</div>
        </div>
      </section>

      <section className="stats-strip">
        <div><strong>{subjects.length}</strong><span>Lëndë</span></div>
        <div><strong>{totalChapters}</strong><span>Kapituj</span></div>
        <div><strong>{totalCards}</strong><span>Flashcards</span></div>
        <div><strong>24/7</strong><span>Mobile & desktop</span></div>
      </section>

      <section className="subjects-section" id="lendet">
        <div className="section-heading">
          <div><span className="eyebrow">Biblioteka e klasës</span><h2>Zgjidh lëndën</h2></div>
          <div className="library-tools">
            <label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kërko lëndën..." /></label>
            <button className="refresh-button" onClick={() => void fetchSubjects(true)} title="Rifresko të dhënat">↻</button>
          </div>
        </div>
        {error && <div className="error-box">{error}</div>}
        <div className="subject-grid">
          {visibleSubjects.map((subject, index) => (
            <article className="subject-card" key={subject._id}>
              <div className="subject-top"><span>{String(index + 1).padStart(2, "0")}</span><i>{subject.emoji || "✚"}</i></div>
              <h3>{subject.title}</h3>
              <p>{subject.shortDescription || "Kapituj dhe flashcards për përsëritje të shpejtë."}</p>
              <div className="subject-meta">
                <span><b>{subject.chapters.length}</b> kapituj</span>
                <span><b>{subject.flashcardCount}</b> kartela</span>
              </div>
              <OpenButton label="Hape lëndën" onClick={() => { setSelectedSubject(subject); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-section">
        <div><span className="eyebrow">Si funksionon</span><h2>Nga teksti në mësim aktiv</h2></div>
        <div className="workflow-grid">
          <article><span>01</span><h3>Ti dërgon tekstin</h3><p>Materialin e kapitullit e dërgon direkt në chat.</p></article>
          <article><span>02</span><h3>Krijohen flashcards</h3><p>Pikat kryesore kthehen në pyetje dhe përgjigje të sakta.</p></article>
          <article><span>03</span><h3>Studion si në Anki</h3><p>Zbulon përgjigjen dhe e vlerëson sipas vështirësisë.</p></article>
        </div>
      </section>
    </main>
  );
}
