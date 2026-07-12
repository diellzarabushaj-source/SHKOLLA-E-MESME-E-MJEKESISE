"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, PortableText, type PortableTextComponents } from "next-sanity";
import styles from "./portal.module.css";

type SanityImage = {
  alt?: string;
  caption?: string;
  asset?: { url?: string };
};

type PortableContent = Array<{
  _key: string;
  _type: string;
  [key: string]: unknown;
}>;

type Flashcard = {
  _id: string;
  title?: string;
  front: string;
  back: string;
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
  image?: SanityImage;
  imageSide?: "front" | "back" | "both";
};

type Lesson = {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  coverImage?: SanityImage;
  body?: PortableContent;
  flashcardCount: number;
};

type Chapter = {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  coverImage?: SanityImage;
  lessons: Lesson[];
};

type Subject = {
  _id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  emoji?: string;
  chapters: Chapter[];
};

type Grade = {
  _id: string;
  title: string;
  gradeNumber: number;
  slug: string;
  shortDescription?: string;
  icon?: string;
  subjects: Subject[];
};

type Rating = "again" | "hard" | "good" | "easy";
type RatingStats = Record<Rating, number>;

const emptyRatings: RatingStats = { again: 0, hard: 0, good: 0, easy: 0 };
const SELECTED_GRADE_KEY = "medical-portal-selected-grade";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "e1tm3f7l",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-07-13",
  useCdn: false,
});

const portalQuery = `
  *[_type == "grade" && isActive != false] | order(order asc, gradeNumber asc) {
    _id,
    title,
    gradeNumber,
    "slug": slug.current,
    shortDescription,
    icon,
    "subjects": *[_type == "subject" && grade._ref == ^._id && isActive != false]
      | order(order asc, title asc) {
        _id,
        title,
        "slug": slug.current,
        shortDescription,
        emoji,
        "chapters": *[_type == "chapter" && subject._ref == ^._id && isActive != false]
          | order(order asc, title asc) {
            _id,
            title,
            "slug": slug.current,
            summary,
            coverImage { alt, "asset": asset->{url} },
            "lessons": *[_type == "lesson" && chapter._ref == ^._id && isActive != false]
              | order(order asc, title asc) {
                _id,
                title,
                "slug": slug.current,
                summary,
                coverImage { alt, "asset": asset->{url} },
                body[] {
                  ...,
                  _type == "image" => {
                    alt,
                    caption,
                    "asset": asset->{url}
                  }
                },
                "flashcardCount": count(*[
                  _type == "flashcard" &&
                  lesson._ref == ^._id &&
                  isActive != false
                ])
              }
          }
      }
  }
`;

const cardsQuery = `
  *[_type == "flashcard" && lesson._ref == $lessonId && isActive != false]
  | order(order asc, _createdAt asc) {
    _id,
    title,
    front,
    back,
    explanation,
    difficulty,
    tags,
    imageSide,
    image { alt, caption, "asset": asset->{url} }
  }
`;

const portableTextComponents: PortableTextComponents = {
  types: {
    image: ({ value }) => {
      const image = value as SanityImage;
      const url = image.asset?.url;
      if (!url) return null;
      return (
        <figure className={styles.portableImage}>
          <img src={url} alt={image.alt || "Foto e mësimit"} loading="lazy" />
          {image.caption && <figcaption>{image.caption}</figcaption>}
        </figure>
      );
    },
  },
};

function getSubjectStats(subject: Subject) {
  const lessonCount = subject.chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0);
  const flashcardCount = subject.chapters.reduce(
    (sum, chapter) => sum + chapter.lessons.reduce((lessonSum, lesson) => lessonSum + lesson.flashcardCount, 0),
    0,
  );
  return { chapterCount: subject.chapters.length, lessonCount, flashcardCount };
}

function getGradeStats(grade: Grade) {
  return grade.subjects.reduce(
    (stats, subject) => {
      const subjectStats = getSubjectStats(subject);
      stats.chapterCount += subjectStats.chapterCount;
      stats.lessonCount += subjectStats.lessonCount;
      stats.flashcardCount += subjectStats.flashcardCount;
      return stats;
    },
    { subjectCount: grade.subjects.length, chapterCount: 0, lessonCount: 0, flashcardCount: 0 },
  );
}

function getChapterFlashcardCount(chapter: Chapter) {
  return chapter.lessons.reduce((sum, lesson) => sum + lesson.flashcardCount, 0);
}

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
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [studying, setStudying] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [ratings, setRatings] = useState<RatingStats>(emptyRatings);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchPortal(showLoader = true) {
    if (showLoader) setLoading(true);
    setError("");
    try {
      const result = await client.fetch<Grade[]>(portalQuery, {}, { perspective: "published" });
      setGrades(result);
      setSelectedGrade((current) => {
        const savedId = current?._id || window.localStorage.getItem(SELECTED_GRADE_KEY);
        return savedId ? result.find((grade) => grade._id === savedId) || null : null;
      });
    } catch (fetchError) {
      console.error(fetchError);
      setError("Portali nuk mund të ngarkohej. Provo përsëri.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useEffect(() => {
    void fetchPortal();
  }, []);

  const visibleSubjects = useMemo(() => {
    if (!selectedGrade) return [];
    const term = search.trim().toLocaleLowerCase("sq");
    if (!term) return selectedGrade.subjects;
    return selectedGrade.subjects.filter((subject) =>
      `${subject.title} ${subject.shortDescription || ""}`.toLocaleLowerCase("sq").includes(term),
    );
  }, [search, selectedGrade]);

  const totalStats = useMemo(() => grades.reduce(
    (stats, grade) => {
      const gradeStats = getGradeStats(grade);
      stats.subjects += gradeStats.subjectCount;
      stats.chapters += gradeStats.chapterCount;
      stats.lessons += gradeStats.lessonCount;
      stats.flashcards += gradeStats.flashcardCount;
      return stats;
    },
    { subjects: 0, chapters: 0, lessons: 0, flashcards: 0 },
  ), [grades]);

  const card = cards[cardIndex];
  const progress = cards.length ? (finished ? 100 : ((cardIndex + 1) / cards.length) * 100) : 0;
  const answeredCount = Object.values(ratings).reduce((sum, count) => sum + count, 0);

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function chooseGrade(grade: Grade) {
    window.localStorage.setItem(SELECTED_GRADE_KEY, grade._id);
    setSelectedGrade(grade);
    setSelectedSubject(null);
    setSelectedChapter(null);
    setSelectedLesson(null);
    setStudying(false);
    setSearch("");
    scrollTop();
  }

  function changeGrade() {
    window.localStorage.removeItem(SELECTED_GRADE_KEY);
    setSelectedGrade(null);
    setSelectedSubject(null);
    setSelectedChapter(null);
    setSelectedLesson(null);
    setStudying(false);
    setCards([]);
    setSearch("");
    scrollTop();
  }

  function goToGrade() {
    setSelectedSubject(null);
    setSelectedChapter(null);
    setSelectedLesson(null);
    setStudying(false);
    setCards([]);
    setSearch("");
    scrollTop();
  }

  function chooseSubject(subject: Subject) {
    setSelectedSubject(subject);
    setSelectedChapter(null);
    setSelectedLesson(null);
    setStudying(false);
    setCards([]);
    scrollTop();
  }

  function goToSubject() {
    setSelectedChapter(null);
    setSelectedLesson(null);
    setStudying(false);
    setCards([]);
    scrollTop();
  }

  function chooseChapter(chapter: Chapter) {
    setSelectedChapter(chapter);
    setSelectedLesson(null);
    setStudying(false);
    setCards([]);
    scrollTop();
  }

  function goToChapter() {
    setSelectedLesson(null);
    setStudying(false);
    setCards([]);
    scrollTop();
  }

  function chooseLesson(lesson: Lesson) {
    setSelectedLesson(lesson);
    setStudying(false);
    setCards([]);
    scrollTop();
  }

  async function startFlashcards() {
    if (!selectedLesson) return;
    setLoading(true);
    setError("");
    try {
      const result = await client.fetch<Flashcard[]>(cardsQuery, { lessonId: selectedLesson._id }, { perspective: "published" });
      setCards(result);
      setCardIndex(0);
      setRevealed(false);
      setFinished(false);
      setRatings(emptyRatings);
      setStudying(true);
    } catch (fetchError) {
      console.error(fetchError);
      setError("Flashcards nuk mund të ngarkoheshin.");
    } finally {
      setLoading(false);
    }
    scrollTop();
  }

  function goToLesson() {
    setStudying(false);
    setCards([]);
    setCardIndex(0);
    setRevealed(false);
    setFinished(false);
    setRatings(emptyRatings);
    scrollTop();
  }

  function rateCard(rating: Rating) {
    if (!card || !revealed) return;
    setRatings((current) => ({ ...current, [rating]: current[rating] + 1 }));
    setRevealed(false);
    if (cardIndex >= cards.length - 1) setFinished(true);
    else setCardIndex((index) => index + 1);
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (!studying || finished || !card) return;

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
  }, [studying, finished, card, revealed]);

  if (loading) {
    return (
      <main className="loading-screen">
        <div className="loader" />
        <span>Duke përgatitur portalin...</span>
      </main>
    );
  }

  if (studying && selectedGrade && selectedSubject && selectedChapter && selectedLesson) {
    const showFrontImage = card?.image?.asset?.url && (card.imageSide === "front" || card.imageSide === "both");
    const showBackImage = card?.image?.asset?.url && (card.imageSide !== "front");

    return (
      <main className="inner-page study-page">
        <div className={styles.hierarchy}>
          <button onClick={changeGrade}>Klasat</button><span>/</span>
          <button onClick={goToGrade}>{selectedGrade.title}</button><span>/</span>
          <button onClick={goToSubject}>{selectedSubject.title}</button><span>/</span>
          <button onClick={goToChapter}>{selectedChapter.title}</button><span>/</span>
          <button onClick={goToLesson}>{selectedLesson.title}</button><span>/</span>
          <span>Flashcards</span>
        </div>

        {error && <div className="error-box">{error}</div>}

        {!card ? (
          <div className="empty-state large">
            <strong>Ky mësim ende nuk ka flashcards.</strong>
            <button className="secondary-button" onClick={goToLesson}>Kthehu te mësimi</button>
          </div>
        ) : finished ? (
          <section className="finish-card">
            <span className="finish-icon">✓</span>
            <span className="eyebrow">Sesioni përfundoi</span>
            <h2>I kalove të gjitha {cards.length} kartelat</h2>
            <p>Rezultati i sesionit qëndron deri sa ta rifillosh këtë mësim.</p>
            <div className="finish-stats">
              <div><strong>{ratings.again}</strong><span>Përsëri</span></div>
              <div><strong>{ratings.hard}</strong><span>Vështirë</span></div>
              <div><strong>{ratings.good}</strong><span>Mirë</span></div>
              <div><strong>{ratings.easy}</strong><span>Lehtë</span></div>
            </div>
            <div className="finish-actions">
              <button className="secondary-button" onClick={goToLesson}>Kthehu te mësimi</button>
              <button className="secondary-button" onClick={() => restartDeck(true)}>Përzieje</button>
              <button className="primary-button" onClick={() => restartDeck(false)}>Rifillo</button>
            </div>
          </section>
        ) : (
          <section className="study-shell">
            <div className="study-toolbar">
              <div className="study-context">
                <span className="eyebrow">{selectedLesson.title}</span>
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
                  {showFrontImage && (
                    <span className={styles.flashImage}>
                      <img src={card.image?.asset?.url} alt={card.image?.alt || card.front} />
                      {card.image?.caption && <span className={styles.flashCaption}>{card.image.caption}</span>}
                    </span>
                  )}
                  <strong>{card.front}</strong>
                  <small>Preke kartelën ose shtyp Space</small>
                </span>
                <span className="flashcard-face flashcard-back">
                  <span className="card-kicker"><b>PËRGJIGJJA</b><i className="answer-ready">Gati për vlerësim</i></span>
                  <span className="answer-question">{card.front}</span>
                  {showBackImage && (
                    <span className={styles.flashImage}>
                      <img src={card.image?.asset?.url} alt={card.image?.alt || card.front} />
                      {card.image?.caption && <span className={styles.flashCaption}>{card.image.caption}</span>}
                    </span>
                  )}
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

  if (selectedGrade && selectedSubject && selectedChapter && selectedLesson) {
    const imageUrl = selectedLesson.coverImage?.asset?.url;
    return (
      <main className="inner-page">
        <div className={styles.hierarchy}>
          <button onClick={changeGrade}>Klasat</button><span>/</span>
          <button onClick={goToGrade}>{selectedGrade.title}</button><span>/</span>
          <button onClick={goToSubject}>{selectedSubject.title}</button><span>/</span>
          <button onClick={goToChapter}>{selectedChapter.title}</button><span>/</span>
          <span>{selectedLesson.title}</span>
        </div>

        <section className={styles.lessonHero}>
          <div>
            <span className={styles.eyebrow}>Mësimi · {selectedGrade.title}</span>
            <h1>{selectedLesson.title}</h1>
            <p>{selectedLesson.summary || "Mësimi i kapitullit."}</p>
          </div>
          {imageUrl && <img className={styles.coverImage} src={imageUrl} alt={selectedLesson.coverImage?.alt || selectedLesson.title} />}
        </section>

        <article className={styles.lessonBody}>
          {selectedLesson.body?.length ? (
            <PortableText value={selectedLesson.body as never} components={portableTextComponents} />
          ) : (
            <div className={styles.lessonEmpty}>Teksti i plotë i këtij mësimi mund të shtohet shumë thjeshtë në Sanity Studio.</div>
          )}
        </article>

        <section className={styles.lessonStudyBar}>
          <div>
            <strong>Flashcards të këtij mësimi</strong>
            <span>{selectedLesson.flashcardCount} kartela për mësim aktiv</span>
          </div>
          <button className={styles.startStudy} onClick={() => void startFlashcards()} disabled={selectedLesson.flashcardCount === 0}>
            {selectedLesson.flashcardCount ? "Fillo flashcards" : "Ende pa flashcards"}
          </button>
        </section>
      </main>
    );
  }

  if (selectedGrade && selectedSubject && selectedChapter) {
    return (
      <main className="inner-page">
        <div className={styles.hierarchy}>
          <button onClick={changeGrade}>Klasat</button><span>/</span>
          <button onClick={goToGrade}>{selectedGrade.title}</button><span>/</span>
          <button onClick={goToSubject}>{selectedSubject.title}</button><span>/</span>
          <span>{selectedChapter.title}</span>
        </div>

        <section className="chapter-hero">
          <span className="large-icon">§</span>
          <div>
            <span className="eyebrow">Kapitulli · {selectedGrade.title}</span>
            <h1>{selectedChapter.title}</h1>
            <p>{selectedChapter.summary || "Mësimet dhe flashcards e këtij kapitulli."}</p>
          </div>
        </section>

        <section className="chapters-section">
          <div className="section-heading">
            <div><span className="eyebrow">Hapi i katërt</span><h2>Mësimet e kapitullit</h2></div>
          </div>
          {selectedChapter.lessons.length ? (
            <div className={styles.lessonList}>
              {selectedChapter.lessons.map((lesson, index) => (
                <article className={styles.lessonRow} key={lesson._id}>
                  <span className={styles.lessonIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <div className={styles.lessonCopy}>
                    <h3>{lesson.title}</h3>
                    <p>{lesson.summary || "Mësim me tekst dhe flashcards."}</p>
                    <span className={styles.lessonCount}>{lesson.flashcardCount} flashcards</span>
                  </div>
                  <button className={styles.lessonOpen} onClick={() => chooseLesson(lesson)}>Hape mësimin</button>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyGrade}><strong>Ende nuk ka mësime.</strong><span>Krijo mësimin e parë në Sanity Studio.</span></div>
          )}
        </section>
      </main>
    );
  }

  if (selectedGrade && selectedSubject) {
    const subjectStats = getSubjectStats(selectedSubject);
    return (
      <main className="inner-page subject-page">
        <div className={styles.hierarchy}>
          <button onClick={changeGrade}>Klasat</button><span>/</span>
          <button onClick={goToGrade}>{selectedGrade.title}</button><span>/</span>
          <span>{selectedSubject.title}</span>
        </div>

        <section className="subject-hero">
          <span className="large-icon">{selectedSubject.emoji || "✚"}</span>
          <div>
            <span className="eyebrow">{selectedGrade.title} · Lënda</span>
            <h1>{selectedSubject.title}</h1>
            <p>{selectedSubject.shortDescription}</p>
          </div>
          <div className="subject-summary">
            <div><strong>{subjectStats.chapterCount}</strong><span>Kapituj</span></div>
            <div><strong>{subjectStats.flashcardCount}</strong><span>Flashcards</span></div>
          </div>
        </section>

        <section className="chapters-section">
          <div className="section-heading">
            <div><span className="eyebrow">Hapi i tretë</span><h2>Kapitujt</h2></div>
          </div>
          {selectedSubject.chapters.length ? (
            <div className="chapter-list">
              {selectedSubject.chapters.map((chapter, index) => (
                <article className="chapter-row" key={chapter._id}>
                  <span className="chapter-number">{String(index + 1).padStart(2, "0")}</span>
                  <div className="chapter-copy">
                    <h3>{chapter.title}</h3>
                    <p>{chapter.summary || "Mësimet e kapitullit."}</p>
                    <span className="chapter-count-mobile">{chapter.lessons.length} mësime · {getChapterFlashcardCount(chapter)} kartela</span>
                  </div>
                  <span className="chapter-count">{chapter.lessons.length} mësime · {getChapterFlashcardCount(chapter)} kartela</span>
                  <OpenButton label="Hape kapitullin" onClick={() => chooseChapter(chapter)} />
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyGrade}><strong>Ende nuk ka kapituj.</strong><span>Kjo lëndë i përket vetëm {selectedGrade.title}.</span></div>
          )}
        </section>
      </main>
    );
  }

  if (selectedGrade) {
    const gradeStats = getGradeStats(selectedGrade);
    return (
      <main className="inner-page">
        <div className={styles.hierarchy}>
          <button onClick={changeGrade}>Klasat</button><span>/</span><span>{selectedGrade.title}</span>
        </div>

        <section className={styles.portalHero}>
          <div>
            <span className={styles.eyebrow}>Klasa aktive</span>
            <h1>{selectedGrade.title}</h1>
            <p>{selectedGrade.shortDescription || "Portali mësimor i kësaj klase."}</p>
            <div className={styles.portalActions}>
              <button className={styles.secondaryAction} onClick={changeGrade}>Ndrysho klasën</button>
              <button className={styles.primaryAction} onClick={() => document.getElementById("lendet")?.scrollIntoView({ behavior: "smooth" })}>Shiko lëndët</button>
            </div>
          </div>
          <div className={styles.portalStats}>
            <div><strong>{gradeStats.subjectCount}</strong><span>Lëndë</span></div>
            <div><strong>{gradeStats.chapterCount}</strong><span>Kapituj</span></div>
            <div><strong>{gradeStats.lessonCount}</strong><span>Mësime</span></div>
            <div><strong>{gradeStats.flashcardCount}</strong><span>Flashcards</span></div>
          </div>
        </section>

        <section className="subjects-section" id="lendet">
          <div className="section-heading">
            <div><span className="eyebrow">Vetëm {selectedGrade.title}</span><h2>Zgjidh lëndën</h2></div>
            <div className="library-tools">
              <label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kërko lëndën..." /></label>
              <button className="refresh-button" onClick={() => void fetchPortal(true)} title="Rifresko të dhënat">↻</button>
            </div>
          </div>
          {error && <div className="error-box">{error}</div>}
          {visibleSubjects.length ? (
            <div className="subject-grid">
              {visibleSubjects.map((subject, index) => {
                const stats = getSubjectStats(subject);
                return (
                  <article className="subject-card" key={subject._id}>
                    <div className="subject-top"><span>{String(index + 1).padStart(2, "0")}</span><i>{subject.emoji || "✚"}</i></div>
                    <h3>{subject.title}</h3>
                    <p>{subject.shortDescription || `Lëndë e ${selectedGrade.title}.`}</p>
                    <div className="subject-meta">
                      <span><b>{stats.chapterCount}</b> kapituj</span>
                      <span><b>{stats.flashcardCount}</b> kartela</span>
                    </div>
                    <OpenButton label="Hape lëndën" onClick={() => chooseSubject(subject)} />
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyGrade}>
              <strong>{search ? "Nuk u gjet asnjë lëndë." : "Ende nuk ka lëndë në këtë klasë."}</strong>
              <span>Klasa mbetet e ndarë plotësisht nga klasat tjera.</span>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="status-pill"><i /> Portali i shkollës sonë</span>
          <h1>Mësime dhe flashcards.<br /><em>Të ndara sipas klasës.</em></h1>
          <p>Zgjidhe klasën tënde. Pastaj sheh vetëm lëndët, kapitujt, mësimet dhe flashcards e asaj klase.</p>
          <a className="hero-cta" href="#klasat">Zgjidh klasën <span>→</span></a>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orbit one" /><div className="orbit two" />
          <div className="demo-card first"><span>PORTALI MËSIMOR</span><b>Klasa → Lënda → Kapitulli</b><small>Strukturë e qartë</small></div>
          <div className="demo-card second"><span>MËSIM AKTIV</span><b>Mësime · Foto · Flashcards</b><small>Gjithçka në një vend</small></div>
          <div className="plus">+</div>
        </div>
      </section>

      <section className="stats-strip">
        <div><strong>3</strong><span>Klasa</span></div>
        <div><strong>{totalStats.subjects}</strong><span>Lëndë</span></div>
        <div><strong>{totalStats.lessons}</strong><span>Mësime</span></div>
        <div><strong>{totalStats.flashcards}</strong><span>Flashcards</span></div>
      </section>

      <section className={styles.gradeSection} id="klasat">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>Hapi i parë</span>
          <h2>Zgjidh klasën</h2>
          <p>Pasi ta zgjedhësh, portali shfaq vetëm materialet e asaj klase.</p>
        </div>
        {error && <div className="error-box">{error}</div>}
        <div className={styles.gradeGrid}>
          {grades.map((grade) => {
            const stats = getGradeStats(grade);
            return (
              <article className={styles.gradeCard} key={grade._id}>
                <span className={styles.gradeNumber}>{grade.gradeNumber}</span>
                <h3>{grade.title}</h3>
                <p>{grade.shortDescription}</p>
                <div className={styles.gradeMeta}>
                  <span><b>{stats.subjectCount}</b> lëndë</span>
                  <span><b>{stats.flashcardCount}</b> flashcards</span>
                </div>
                <button className={styles.gradeOpen} onClick={() => chooseGrade(grade)}>Hape {grade.title}</button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="workflow-section">
        <div><span className="eyebrow">Hierarkia e portalit</span><h2>Çdo material në vendin e vet</h2></div>
        <div className="workflow-grid">
          <article><span>01</span><h3>Zgjidh klasën</h3><p>Klasa 10, 11 ose 12 mbetet e ndarë nga klasat tjera.</p></article>
          <article><span>02</span><h3>Lexo mësimin</h3><p>Tekst, tituj, lista dhe fotografi menaxhohen në Sanity.</p></article>
          <article><span>03</span><h3>Ushtrohu</h3><p>Çdo mësim ka grupin e vet të flashcards.</p></article>
        </div>
      </section>
    </main>
  );
}
