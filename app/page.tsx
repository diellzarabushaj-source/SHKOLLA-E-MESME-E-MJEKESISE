"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, PortableText, type PortableTextComponents } from "next-sanity";
import styles from "./portal.module.css";
import workspace from "./learning-workspace.module.css";

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
type ContentMode = "lessons" | "flashcards";

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

function ModeIcon({ mode }: { mode: ContentMode }) {
  if (mode === "lessons") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v12.5H7.5A2.5 2.5 0 0 1 5 17V4.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8.5 9h6M8.5 12.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="13" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 9h5M8 12.5h5M17 8h1.5A1.5 1.5 0 0 1 20 9.5V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function HomePage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [contentMode, setContentMode] = useState<ContentMode>("lessons");
  const [studying, setStudying] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [ratings, setRatings] = useState<RatingStats>(emptyRatings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchPortal(showLoader = true) {
    if (showLoader) setLoading(true);
    setError("");

    try {
      const result = await client.fetch<Grade[]>(portalQuery, {}, { perspective: "published" });
      setGrades(result);

      const savedId = window.localStorage.getItem(SELECTED_GRADE_KEY);
      const savedGrade = savedId ? result.find((grade) => grade._id === savedId) || null : null;
      const currentGradeId = selectedGrade?._id || savedGrade?._id;
      const nextGrade = currentGradeId ? result.find((grade) => grade._id === currentGradeId) || null : null;

      setSelectedGrade(nextGrade);
      setSelectedSubject((currentSubject) =>
        nextGrade?.subjects.find((subject) => subject._id === currentSubject?._id) || nextGrade?.subjects[0] || null,
      );
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

  const totalStats = useMemo(() => grades.reduce(
    (stats, grade) => {
      const gradeStats = getGradeStats(grade);
      stats.subjects += gradeStats.subjectCount;
      stats.lessons += gradeStats.lessonCount;
      stats.flashcards += gradeStats.flashcardCount;
      return stats;
    },
    { subjects: 0, lessons: 0, flashcards: 0 },
  ), [grades]);

  const card = cards[cardIndex];
  const progress = cards.length ? (finished ? 100 : ((cardIndex + 1) / cards.length) * 100) : 0;
  const answeredCount = ratings.again + ratings.hard + ratings.good + ratings.easy;

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetStudyState() {
    setStudying(false);
    setCards([]);
    setCardIndex(0);
    setRevealed(false);
    setFinished(false);
    setRatings(emptyRatings);
  }

  function chooseGrade(grade: Grade) {
    window.localStorage.setItem(SELECTED_GRADE_KEY, grade._id);
    setSelectedGrade(grade);
    setSelectedSubject(grade.subjects[0] || null);
    setSelectedChapter(null);
    setSelectedLesson(null);
    setContentMode("lessons");
    resetStudyState();
    scrollTop();
  }

  function changeGrade() {
    window.localStorage.removeItem(SELECTED_GRADE_KEY);
    setSelectedGrade(null);
    setSelectedSubject(null);
    setSelectedChapter(null);
    setSelectedLesson(null);
    resetStudyState();
    scrollTop();
  }

  function returnToWorkspace() {
    setSelectedChapter(null);
    setSelectedLesson(null);
    resetStudyState();
    scrollTop();
  }

  function selectSubject(subject: Subject) {
    setSelectedSubject(subject);
    setSelectedChapter(null);
    setSelectedLesson(null);
    resetStudyState();
  }

  function openLesson(chapter: Chapter, lesson: Lesson) {
    setSelectedChapter(chapter);
    setSelectedLesson(lesson);
    resetStudyState();
    scrollTop();
  }

  async function startFlashcards(lessonOverride?: Lesson, chapterOverride?: Chapter) {
    const lesson = lessonOverride || selectedLesson;
    const chapter = chapterOverride || selectedChapter;
    if (!lesson || !chapter) return;

    setSelectedChapter(chapter);
    setSelectedLesson(lesson);
    setLoading(true);
    setError("");

    try {
      const result = await client.fetch<Flashcard[]>(cardsQuery, { lessonId: lesson._id }, { perspective: "published" });
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
    const showBackImage = card?.image?.asset?.url && card.imageSide !== "front";

    return (
      <main className="inner-page study-page">
        <div className={styles.hierarchy}>
          <button onClick={changeGrade}>Klasat</button><span>/</span>
          <button onClick={returnToWorkspace}>{selectedGrade.title}</button><span>/</span>
          <button onClick={returnToWorkspace}>{selectedSubject.title}</button><span>/</span>
          <button onClick={returnToWorkspace}>{selectedChapter.title}</button><span>/</span>
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
            <p>Progresi ruhet në profilin tënd kur je i kyçur.</p>
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
          <button onClick={returnToWorkspace}>{selectedGrade.title}</button><span>/</span>
          <button onClick={returnToWorkspace}>{selectedSubject.title}</button><span>/</span>
          <button onClick={returnToWorkspace}>{selectedChapter.title}</button><span>/</span>
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
            <div className={styles.lessonEmpty}>Teksti i plotë i këtij mësimi mund të shtohet në Sanity Studio.</div>
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

  if (selectedGrade && selectedSubject) {
    const gradeStats = getGradeStats(selectedGrade);
    const subjectStats = getSubjectStats(selectedSubject);

    return (
      <main className="inner-page">
        <div className={styles.hierarchy}>
          <button onClick={changeGrade}>Klasat</button><span>/</span>
          <span>{selectedGrade.title}</span><span>/</span>
          <span>{selectedSubject.title}</span>
        </div>

        <section className={workspace.workspaceHero}>
          <div className={workspace.workspaceHeroCopy}>
            <span className={styles.eyebrow}>Hapësira e mësimit · {selectedGrade.title}</span>
            <h1>{selectedSubject.title}</h1>
            <p>{selectedSubject.shortDescription || "Mësimet dhe flashcards e kësaj lënde."}</p>
          </div>
          <div className={workspace.workspaceHeroStats}>
            <div><strong>{subjectStats.chapterCount}</strong><span>Kapituj</span></div>
            <div><strong>{subjectStats.lessonCount}</strong><span>Mësime</span></div>
            <div><strong>{subjectStats.flashcardCount}</strong><span>Flashcards</span></div>
          </div>
        </section>

        <section className={workspace.filterBar} aria-label="Filtrat e portalit">
          <div className={workspace.filterTopline}>
            <div>
              <span className={workspace.filterEyebrow}>{selectedGrade.title}</span>
              <strong>Zgjidh lëndën</strong>
            </div>
            <button className={workspace.changeGradeButton} onClick={changeGrade}>Ndrysho klasën</button>
          </div>

          <div className={workspace.filterControls}>
            <div className={workspace.subjectRail} role="tablist" aria-label="Lëndët e klasës">
              {selectedGrade.subjects.map((subject) => {
                const stats = getSubjectStats(subject);
                const active = subject._id === selectedSubject._id;
                return (
                  <button
                    className={`${workspace.subjectTab} ${active ? workspace.subjectTabActive : ""}`}
                    key={subject._id}
                    onClick={() => selectSubject(subject)}
                    type="button"
                    role="tab"
                    aria-selected={active}
                  >
                    <span className={workspace.subjectEmoji} aria-hidden="true">{subject.emoji || "✚"}</span>
                    <span className={workspace.subjectTabCopy}>
                      <b>{subject.title}</b>
                      <small>{stats.chapterCount} kapituj</small>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={workspace.modeSwitch} role="tablist" aria-label="Lloji i përmbajtjes">
              {(["lessons", "flashcards"] as ContentMode[]).map((mode) => {
                const active = contentMode === mode;
                return (
                  <button
                    className={`${workspace.modeButton} ${active ? workspace.modeButtonActive : ""}`}
                    key={mode}
                    onClick={() => setContentMode(mode)}
                    type="button"
                    role="tab"
                    aria-selected={active}
                  >
                    <ModeIcon mode={mode} />
                    <span>{mode === "lessons" ? "Mësimet" : "Flashcards"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className={workspace.contentHeader}>
          <div>
            <span className={styles.eyebrow}>{contentMode === "lessons" ? "Lexo dhe kupto" : "Ushtrohu aktivisht"}</span>
            <h2>{contentMode === "lessons" ? "Mësimet sipas kapitujve" : "Flashcards sipas kapitujve"}</h2>
            <p>
              {contentMode === "lessons"
                ? "Hape një mësim për ta lexuar tekstin, figurat dhe shpjegimet."
                : "Zgjidhe një grup kartelash dhe fillo përsëritjen menjëherë."}
            </p>
          </div>
          <div className={workspace.classOverview} aria-label="Përmbledhja e klasës">
            <span>{gradeStats.subjectCount} lëndë</span>
            <span>{gradeStats.lessonCount} mësime</span>
          </div>
        </section>

        {selectedSubject.chapters.length ? (
          <div className={workspace.chapterStack}>
            {selectedSubject.chapters.map((chapter, chapterIndex) => {
              const lessonsWithCards = chapter.lessons.filter((lesson) => lesson.flashcardCount > 0);
              const visibleLessons = contentMode === "lessons" ? chapter.lessons : lessonsWithCards;

              return (
                <section className={workspace.chapterPanel} key={chapter._id}>
                  <header className={workspace.chapterHeader}>
                    <span className={workspace.chapterIndex}>{String(chapterIndex + 1).padStart(2, "0")}</span>
                    <div className={workspace.chapterHeaderCopy}>
                      <span>Kapitulli</span>
                      <h3>{chapter.title}</h3>
                      <p>{chapter.summary || "Mësimet e këtij kapitulli."}</p>
                    </div>
                    <div className={workspace.chapterMeta}>
                      <span><b>{chapter.lessons.length}</b> mësime</span>
                      <span><b>{chapter.lessons.reduce((sum, lesson) => sum + lesson.flashcardCount, 0)}</b> kartela</span>
                    </div>
                  </header>

                  {visibleLessons.length ? (
                    <div className={workspace.contentGrid}>
                      {visibleLessons.map((lesson, lessonIndex) => {
                        const coverUrl = lesson.coverImage?.asset?.url;

                        if (contentMode === "lessons") {
                          return (
                            <article className={workspace.lessonCard} key={lesson._id}>
                              <div className={workspace.cardVisual}>
                                {coverUrl ? (
                                  <img src={coverUrl} alt={lesson.coverImage?.alt || lesson.title} />
                                ) : (
                                  <span className={workspace.cardVisualFallback}>
                                    <ModeIcon mode="lessons" />
                                  </span>
                                )}
                                <span className={workspace.cardNumber}>{String(lessonIndex + 1).padStart(2, "0")}</span>
                              </div>
                              <div className={workspace.cardBody}>
                                <span className={workspace.cardType}>Teksti i mësimit</span>
                                <h4>{lesson.title}</h4>
                                <p>{lesson.summary || "Lexoje mësimin e plotë me shpjegime dhe figura."}</p>
                                <div className={workspace.cardFooter}>
                                  <span>{lesson.flashcardCount} flashcards</span>
                                  <button onClick={() => openLesson(chapter, lesson)}>Lexo mësimin <b>→</b></button>
                                </div>
                              </div>
                            </article>
                          );
                        }

                        return (
                          <article className={workspace.deckCard} key={lesson._id}>
                            <div className={workspace.deckIcon}><ModeIcon mode="flashcards" /></div>
                            <span className={workspace.cardType}>Set flashcards</span>
                            <h4>{lesson.title}</h4>
                            <p>{lesson.summary || "Përsëritje aktive e pikave kryesore të mësimit."}</p>
                            <div className={workspace.deckCount}>
                              <strong>{lesson.flashcardCount}</strong>
                              <span>kartela</span>
                            </div>
                            <button className={workspace.deckButton} onClick={() => void startFlashcards(lesson, chapter)}>
                              Fillo mësimin <b>→</b>
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={workspace.chapterEmpty}>
                      <strong>{contentMode === "lessons" ? "Ende nuk ka mësime." : "Ky kapitull ende nuk ka flashcards."}</strong>
                      <span>Përmbajtja do të shfaqet këtu sapo të publikohet në Sanity.</span>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyGrade}>
            <strong>Ende nuk ka kapituj në këtë lëndë.</strong>
            <span>{selectedGrade.title} mbetet plotësisht e ndarë nga klasat tjera.</span>
          </div>
        )}
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
            </div>
          </div>
          <div className={styles.portalStats}>
            <div><strong>{gradeStats.subjectCount}</strong><span>Lëndë</span></div>
            <div><strong>{gradeStats.chapterCount}</strong><span>Kapituj</span></div>
            <div><strong>{gradeStats.lessonCount}</strong><span>Mësime</span></div>
            <div><strong>{gradeStats.flashcardCount}</strong><span>Flashcards</span></div>
          </div>
        </section>

        <div className={styles.emptyGrade}>
          <strong>Ende nuk ka lëndë në këtë klasë.</strong>
          <span>Klasa mbetet e ndarë plotësisht nga klasat tjera.</span>
        </div>
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
          <article><span>02</span><h3>Zgjidh lëndën dhe mënyrën</h3><p>Filter bar-i kalon menjëherë mes mësimeve dhe flashcards.</p></article>
          <article><span>03</span><h3>Mëso sipas kapitullit</h3><p>Çdo mësim dhe çdo set kartelash qëndron në kapitullin e vet.</p></article>
        </div>
      </section>
    </main>
  );
}
