"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient, PortableText, type PortableTextComponents } from "next-sanity";
import styles from "./portal.module.css";
import PortalHero from "./PortalHero";
import experience from "./learning-experience.module.css";
import classic from "./classic-learning.module.css";
import LessonAdminEditor, { type AdminEditableLesson } from "./LessonAdminEditor";
import LessonAnnotations from "./LessonAnnotations";
import LessonLearningExperience from "./LessonLearningExperience";
import LessonTable, { type LessonTableBlock } from "./LessonTable";
import MarkdownLessonBlock from "./MarkdownLessonContent";

// admin-table-paste-v1
// markdown-lesson-formatting-v1
// lesson-learning-experience-v1
// data-lesson-annotations

type SanityImage = {
  alt?: string;
  caption?: string;
  assetUrl?: string;
  asset?: { url?: string };
};

type SanityRecording = {
  title?: string;
  url?: string;
  originalFilename?: string;
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
  lessonId: string;
  lessonTitle: string;
};

type Lesson = {
  _id: string;
  _rev?: string;
  title: string;
  slug: string;
  summary?: string;
  coverImage?: SanityImage;
  recording?: SanityRecording;
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
  cardIllustration?: SanityImage;
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
type StudyScope = {
  kind: "lesson" | "chapter";
  title: string;
  chapter: Chapter;
  lesson?: Lesson;
};

const emptyRatings: RatingStats = { again: 0, hard: 0, good: 0, easy: 0 };
const SELECTED_GRADE_KEY = "medical-portal-selected-grade";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "e1tm3f7l",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-07-13",
  useCdn: false,
});

const freshClient = client.withConfig({ useCdn: false });

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
        "shortDescription": coalesce(shortDescription, description),
        emoji,
        cardIllustration {
          alt,
          crop,
          hotspot,
          "asset": asset->{url}
        },
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
                recording {
                  title,
                  "url": asset->url,
                  "originalFilename": asset->originalFilename
                },
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

const cardFields = `
  _id,
  title,
  front,
  back,
  explanation,
  difficulty,
  tags,
  imageSide,
  image { alt, caption, "asset": asset->{url} },
  "lessonId": lesson._ref,
  "lessonTitle": lesson->title
`;

const lessonCardsQuery = `
  *[_type == "flashcard" && lesson._ref == $lessonId && isActive != false]
  | order(order asc, _createdAt asc) {
    ${cardFields}
  }
`;

const chapterCardsQuery = `
  *[
    _type == "flashcard" &&
    isActive != false &&
    lesson._ref in *[_type == "lesson" && chapter._ref == $chapterId && isActive != false]._id
  ]
  | order(lesson->order asc, order asc, _createdAt asc) {
    ${cardFields}
  }
`;

function safePortableHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const href = value.trim();
  if (!href || href.startsWith("//") || /[\u0000-\u001F\u007F]/.test(href)) return null;
  if (href.startsWith("#") || href.startsWith("/")) return href;

  try {
    const parsed = new URL(href);
    return ["http:", "https:", "mailto:"].includes(parsed.protocol) ? href : null;
  } catch {
    return null;
  }
}

const portableTextComponents: PortableTextComponents = {
  block: {
    normal: ({ children, value }) => (
      <MarkdownLessonBlock value={value as never}>{children}</MarkdownLessonBlock>
    ),
  },
  marks: {
    underline: ({ children }) => <span className="portable-underline">{children}</span>,
    highlight: ({ children }) => <mark className="portable-highlight">{children}</mark>,
    code: ({ children }) => <code className="portable-code">{children}</code>,
    link: ({ children, value }) => {
      const mark = value as { href?: unknown };
      const href = safePortableHref(mark?.href);
      if (!href) return <span>{children}</span>;
      const external = /^https?:\/\//i.test(href);
      return (
        <a
          className="portable-link"
          href={href}
          {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
        >
          {children}
        </a>
      );
    },
  },
  types: {
    image: ({ value }) => {
      const image = value as SanityImage;
      const url = image.assetUrl || image.asset?.url;
      if (!url) return null;
      return (
        <figure className={styles.portableImage}>
          <img src={url} alt={image.alt || "Foto e mësimit"} loading="lazy" />
          {image.caption && <figcaption>{image.caption}</figcaption>}
        </figure>
      );
    },
    lessonTable: ({ value }) => <LessonTable value={value as LessonTableBlock} />,
  },
};

const liveLessonQuery = `
  *[_type == "lesson" && _id == $lessonId && isActive != false][0] {
    _id,
    _rev,
    title,
    "slug": slug.current,
    summary,
    coverImage { alt, "asset": asset->{url} },
    recording {
      title,
      "url": asset->url,
      "originalFilename": asset->originalFilename
    },
    body[] {
      ...,
      _type == "image" => {
        alt,
        caption,
        asset,
        "assetUrl": asset->url
      }
    },
    "flashcardCount": count(flashcards[isActive != false])
  }
`;

const contentMutationQuery = `
  *[
    _type in ["grade", "subject", "chapter", "lesson"] &&
    !(_id in path("drafts.**"))
  ]
`;

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

function ModeIcon({ mode }: { mode: ContentMode }) {
  return mode === "lessons" ? (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v12.5H7.5A2.5 2.5 0 0 1 5 17V4.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8.5 9h6M8.5 12.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="13" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 9h5M8 12.5h5M17 8h1.5A1.5 1.5 0 0 1 20 9.5V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function AudioIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 8.5 13.5 5v14L9 15.5H5.5A1.5 1.5 0 0 1 4 14v-4a1.5 1.5 0 0 1 1.5-1.5H9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M17 9a4.2 4.2 0 0 1 0 6M19.5 6.5a7.5 7.5 0 0 1 0 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ModeChooser({ mode, onChange }: { mode: ContentMode; onChange: (mode: ContentMode) => void }) {
  return (
    <div className={classic.modeChooser} data-campus-modes role="tablist" aria-label="Zgjidh mënyrën e mësimit">
      <span className={classic.modeLabel}>Çfarë dëshiron të hapësh?</span>
      <div className={classic.modeButtons}>
        {(["lessons", "flashcards"] as ContentMode[]).map((item) => (
          <button
            className={item === mode ? classic.modeActive : ""}
            key={item}
            onClick={() => onChange(item)}
            type="button"
            role="tab"
            aria-selected={item === mode}
          >
            <ModeIcon mode={item} />
            <span>{item === "lessons" ? "Mësimet" : "Flashcards"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ClassicLearningPortal({
  isAdmin = false,
  isAuthenticated = false,
}: {
  isAdmin?: boolean;
  isAuthenticated?: boolean;
}) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [contentMode, setContentMode] = useState<ContentMode>("lessons");
  const [search, setSearch] = useState("");
  const [studyScope, setStudyScope] = useState<StudyScope | null>(null);
  const [studying, setStudying] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [ratings, setRatings] = useState<RatingStats>(emptyRatings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const selectedGradeRef = useRef<Grade | null>(null);
  const selectedSubjectRef = useRef<Subject | null>(null);
  const selectedChapterRef = useRef<Chapter | null>(null);
  const selectedLessonRef = useRef<Lesson | null>(null);

  useEffect(() => {
    selectedGradeRef.current = selectedGrade;
    selectedSubjectRef.current = selectedSubject;
    selectedChapterRef.current = selectedChapter;
    selectedLessonRef.current = selectedLesson;
  }, [selectedGrade, selectedSubject, selectedChapter, selectedLesson]);

  const fetchPortal = useCallback(async (showLoader = true, fresh = false) => {
    if (showLoader) setLoading(true);
    setError("");

    try {
      const source = fresh ? freshClient : client;
      const result = await source.fetch<Grade[]>(portalQuery, {}, { perspective: "published" });
      setGrades(result);
      const savedId = window.localStorage.getItem(SELECTED_GRADE_KEY);
      const gradeId = selectedGradeRef.current?._id || savedId;
      const nextGrade = gradeId ? result.find((grade) => grade._id === gradeId) || null : null;
      const nextSubject = nextGrade?.subjects.find((subject) => subject._id === selectedSubjectRef.current?._id) || null;
      const nextChapter = nextSubject?.chapters.find((chapter) => chapter._id === selectedChapterRef.current?._id) || null;
      const currentLesson = selectedLessonRef.current;
      const lessonStillExists = Boolean(currentLesson && nextChapter?.lessons.some((lesson) => lesson._id === currentLesson._id));

      selectedGradeRef.current = nextGrade;
      selectedSubjectRef.current = nextSubject;
      selectedChapterRef.current = nextChapter;
      if (!lessonStillExists) selectedLessonRef.current = null;

      setSelectedGrade(nextGrade);
      setSelectedSubject(nextSubject);
      setSelectedChapter(nextChapter);
      if (!lessonStillExists) setSelectedLesson(null);
    } catch (fetchError) {
      console.error(fetchError);
      setError("Portali nuk mund të ngarkohej. Provo përsëri.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPortal();
  }, [fetchPortal]);

  useEffect(() => {
    let stopped = false;
    let refreshTimer: number | null = null;

    const refreshPublishedContent = async () => {
      await fetchPortal(false, true);
      const activeLesson = selectedLessonRef.current;
      if (!activeLesson || stopped) return;

      try {
        const details = await freshClient.fetch<Lesson | null>(
          liveLessonQuery,
          { lessonId: activeLesson._id },
          { perspective: "published" },
        );
        if (!stopped && details && selectedLessonRef.current?._id === details._id) {
          selectedLessonRef.current = details;
          setSelectedLesson(details);
        }
      } catch (refreshError) {
        console.error("Live lesson refresh failed", refreshError);
      }
    };

    const scheduleRefresh = () => {
      if (stopped) return;
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void refreshPublishedContent(), 350);
    };

    const subscription = freshClient
      .listen(contentMutationQuery, {}, { includeResult: false, visibility: "query" })
      .subscribe({
        next: scheduleRefresh,
        error: (listenError) => console.error("Sanity live sync disconnected", listenError),
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };
    const fallbackRefresh = window.setInterval(onVisible, 5 * 60_000);
    window.addEventListener("focus", scheduleRefresh);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      subscription.unsubscribe();
      if (refreshTimer) window.clearTimeout(refreshTimer);
      window.clearInterval(fallbackRefresh);
      window.removeEventListener("focus", scheduleRefresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchPortal]);

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

  const visibleSubjects = useMemo(() => {
    if (!selectedGrade) return [];
    const term = search.trim().toLocaleLowerCase("sq");
    if (!term) return selectedGrade.subjects;
    return selectedGrade.subjects.filter((subject) =>
      `${subject.title} ${subject.shortDescription || ""}`.toLocaleLowerCase("sq").includes(term),
    );
  }, [search, selectedGrade]);

  const card = cards[cardIndex];
  const progress = cards.length ? (finished ? 100 : ((cardIndex + 1) / cards.length) * 100) : 0;
  const answeredCount = ratings.again + ratings.hard + ratings.good + ratings.easy;
  const learnedCount = ratings.good + ratings.easy;

  const cardContextPosition = useMemo(() => {
    if (!card) return { current: 1, total: 1 };
    return {
      current: cards.slice(0, cardIndex + 1).filter((item) => item.lessonId === card.lessonId).length || 1,
      total: cards.filter((item) => item.lessonId === card.lessonId).length || 1,
    };
  }, [card, cardIndex, cards]);

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetStudy() {
    setStudying(false);
    setStudyScope(null);
    setCards([]);
    setCardIndex(0);
    setRevealed(false);
    setFinished(false);
    setRatings(emptyRatings);
  }

  function chooseGrade(grade: Grade) {
    window.localStorage.setItem(SELECTED_GRADE_KEY, grade._id);
    setSelectedGrade(grade);
    setSelectedSubject(null);
    setSelectedChapter(null);
    setSelectedLesson(null);
    setSearch("");
    resetStudy();
    scrollTop();
  }

  function changeGrade() {
    window.localStorage.removeItem(SELECTED_GRADE_KEY);
    setSelectedGrade(null);
    setSelectedSubject(null);
    setSelectedChapter(null);
    setSelectedLesson(null);
    setSearch("");
    resetStudy();
    scrollTop();
  }

  function goToGrade() {
    setSelectedSubject(null);
    setSelectedChapter(null);
    setSelectedLesson(null);
    resetStudy();
    scrollTop();
  }

  function goToSubject() {
    setSelectedChapter(null);
    setSelectedLesson(null);
    resetStudy();
    scrollTop();
  }

  function goToChapter() {
    setSelectedLesson(null);
    resetStudy();
    scrollTop();
  }

  function chooseSubject(subject: Subject) {
    setSelectedSubject(subject);
    setSelectedChapter(null);
    setSelectedLesson(null);
    resetStudy();
    scrollTop();
  }

  function chooseChapter(chapter: Chapter) {
    setSelectedChapter(chapter);
    setSelectedLesson(null);
    resetStudy();
    scrollTop();
  }

  function applySavedLesson(savedLesson: AdminEditableLesson) {
    setSelectedLesson((current) => current && current._id === savedLesson._id
      ? (() => {
        const updated = { ...current, _rev: savedLesson._rev, body: savedLesson.body as PortableContent };
        selectedLessonRef.current = updated;
        return updated;
      })()
      : current);
  }

  function chooseLesson(lesson: Lesson) {
    setSelectedLesson(lesson);
    resetStudy();
    scrollTop();
  }

  async function startTest(scope: StudyScope) {
    setSelectedChapter(scope.chapter);
    setSelectedLesson(scope.lesson || null);
    setStudyScope(scope);
    setLoading(true);
    setError("");

    try {
      const query = scope.kind === "lesson" ? lessonCardsQuery : chapterCardsQuery;
      const params = scope.kind === "lesson" ? { lessonId: scope.lesson?._id } : { chapterId: scope.chapter._id };
      const result = await client.fetch<Flashcard[]>(query, params, { perspective: "published" });
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

  if (studying && selectedGrade && selectedSubject && selectedChapter && studyScope) {
    const showFrontImage = card?.image?.asset?.url && (card.imageSide === "front" || card.imageSide === "both");
    const showBackImage = card?.image?.asset?.url && card.imageSide !== "front";

    return (
      <main data-campus-view className="inner-page study-page">
        <div className={styles.hierarchy} data-campus-breadcrumb>
          <button onClick={changeGrade}>Klasat</button><span>/</span>
          <button onClick={goToGrade}>{selectedGrade.title}</button><span>/</span>
          <button onClick={goToSubject}>{selectedSubject.title}</button><span>/</span>
          <button onClick={goToChapter}>{selectedChapter.title}</button><span>/</span>
          <span>{studyScope.kind === "chapter" ? "Testi i kapitullit" : "Testi i mësimit"}</span>
        </div>

        {!card ? (
          <div className="empty-state large">
            <strong>Nuk ka flashcards për këtë test.</strong>
            <button className="secondary-button" onClick={resetStudy}>Kthehu</button>
          </div>
        ) : finished ? (
          <section className="finish-card">
            <span className="finish-icon">✓</span>
            <span className="eyebrow">Testi përfundoi</span>
            <h2>{studyScope.title}</h2>
            <p>I kalove të gjitha {cards.length} kartelat.</p>
            <div className="finish-stats">
              <div><strong>{ratings.again}</strong><span>Përsëri</span></div>
              <div><strong>{ratings.hard}</strong><span>Vështirë</span></div>
              <div><strong>{ratings.good}</strong><span>Mirë</span></div>
              <div><strong>{ratings.easy}</strong><span>Lehtë</span></div>
            </div>
            <div className="finish-actions">
              <button className="secondary-button" onClick={resetStudy}>Kthehu</button>
              <button className="secondary-button" onClick={() => restartDeck(true)}>Përzieje</button>
              <button className="primary-button" onClick={() => restartDeck(false)}>Rifillo</button>
            </div>
          </section>
        ) : (
          <section className="study-shell">
            <div className="study-toolbar">
              <div className="study-context">
                <span className="eyebrow">{card.lessonTitle}</span>
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
              data-progress-grade-id={selectedGrade._id}
              data-progress-subject-id={selectedSubject._id}
              data-progress-chapter-id={selectedChapter._id}
              data-progress-lesson-id={card.lessonId}
              data-progress-flashcard-id={card._id}
              data-progress-current-card={cardContextPosition.current}
              data-progress-total-cards={cardContextPosition.total}
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
              <span><b>{learnedCount}</b> të mësuara</span>
            </div>
          </section>
        )}
      </main>
    );
  }

  if (selectedGrade && selectedSubject && selectedChapter && selectedLesson) {
    const imageUrl = selectedLesson.coverImage?.asset?.url;
    const recordingUrl = selectedLesson.recording?.url;
    const currentLessonIndex = selectedChapter.lessons.findIndex((lesson) => lesson._id === selectedLesson._id);
    const previousLesson = currentLessonIndex > 0
      ? selectedChapter.lessons[currentLessonIndex - 1]
      : null;
    const nextLesson = currentLessonIndex >= 0 && currentLessonIndex < selectedChapter.lessons.length - 1
      ? selectedChapter.lessons[currentLessonIndex + 1]
      : null;

    return (
      <main data-campus-view
        className={`inner-page ${styles.lessonPage}`}
        data-progress-page="lesson"
        data-progress-grade-id={selectedGrade._id}
        data-progress-subject-id={selectedSubject._id}
        data-progress-chapter-id={selectedChapter._id}
        data-progress-lesson-id={selectedLesson._id}
      >
        <div className={styles.hierarchy} data-campus-breadcrumb>
          <button onClick={changeGrade}>Klasat</button><span>/</span>
          <button onClick={goToGrade}>{selectedGrade.title}</button><span>/</span>
          <button onClick={goToSubject}>{selectedSubject.title}</button><span>/</span>
          <button onClick={goToChapter}>{selectedChapter.title}</button><span>/</span>
          <span>{selectedLesson.title}</span>
        </div>

        <LessonLearningExperience
          lessonId={selectedLesson._id}
          lessonTitle={selectedLesson.title}
          lessonSummary={selectedLesson.summary || "Mësimi i kapitullit."}
          gradeTitle={selectedGrade.title}
          subjectTitle={selectedSubject.title}
          chapterTitle={selectedChapter.title}
          flashcardCount={selectedLesson.flashcardCount}
          coverImage={imageUrl ? (
            <img
              className={styles.coverImage}
              src={imageUrl}
              alt={selectedLesson.coverImage?.alt || selectedLesson.title}
            />
          ) : null}
          onStartFlashcards={() => void startTest({
            kind: "lesson",
            title: selectedLesson.title,
            chapter: selectedChapter,
            lesson: selectedLesson,
          })}
        >
          {recordingUrl && (
            <section className={experience.audioCard} aria-label="Incizimi i mësimit">
              <span className={experience.audioIcon}><AudioIcon /></span>
              <div className={experience.audioCopy}>
                <span>Dëgjo mësimin</span>
                <strong>{selectedLesson.recording?.title || selectedLesson.title}</strong>
                <small>{selectedLesson.recording?.originalFilename || "Incizim audio"}</small>
              </div>
              <audio className={experience.audioPlayer} controls preload="metadata" src={recordingUrl}>
                Shfletuesi yt nuk e mbështet audion.
              </audio>
            </section>
          )}

          {isAdmin && (
            <LessonAdminEditor
              lesson={{
                _id: selectedLesson._id,
                _rev: selectedLesson._rev,
                title: selectedLesson.title,
                body: selectedLesson.body,
              }}
              onSaved={applySavedLesson}
            />
          )}

          <LessonAnnotations
            enabled={isAuthenticated}
            lessonId={selectedLesson._id}
            contentRevision={selectedLesson._rev}
            body={selectedLesson.body}
            articleClassName={styles.lessonBody}
          >
            {selectedLesson.body?.length ? (
              <PortableText value={selectedLesson.body as never} components={portableTextComponents} />
            ) : (
              <div className={styles.lessonEmpty}>Teksti i plotë i këtij mësimi ende nuk është publikuar.</div>
            )}
          </LessonAnnotations>

          <nav className={styles.lessonNavigation} aria-label="Navigimi ndërmjet mësimeve">
            <button
              className={styles.lessonNavButton}
              type="button"
              onClick={() => previousLesson && void chooseLesson(previousLesson)}
              disabled={!previousLesson}
            >
              <span className={styles.lessonNavCopy}>
                <small>Mësimi paraprak</small>
                <strong>{previousLesson?.title || "Ky është mësimi i parë"}</strong>
              </span>
            </button>

            <button
              className={`${styles.lessonNavButton} ${styles.lessonNavNext}`}
              type="button"
              onClick={() => nextLesson && void chooseLesson(nextLesson)}
              disabled={!nextLesson}
            >
              <span className={styles.lessonNavCopy}>
                <small>Mësimi tjetër</small>
                <strong>{nextLesson?.title || "Ky është mësimi i fundit"}</strong>
              </span>
            </button>
          </nav>

          <section className={styles.lessonStudyBar}>
            <div>
              <strong>Ushtroje këtë mësim</strong>
              <span>{selectedLesson.flashcardCount} kartela nga vetëm ky mësim</span>
            </div>
            <button
              className={styles.startStudy}
              onClick={() => void startTest({ kind: "lesson", title: selectedLesson.title, chapter: selectedChapter, lesson: selectedLesson })}
              disabled={selectedLesson.flashcardCount === 0}
            >
              {selectedLesson.flashcardCount ? "Hap flashcards" : "Ende pa flashcards"}
            </button>
          </section>
        </LessonLearningExperience>
      </main>
    );
  }

  if (selectedGrade && selectedSubject && selectedChapter) {
    const chapterCards = getChapterFlashcardCount(selectedChapter);

    return (
      <main data-campus-view className="inner-page">
        <div className={styles.hierarchy} data-campus-breadcrumb>
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

        <ModeChooser mode={contentMode} onChange={setContentMode} />

        <section className="chapters-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{contentMode === "lessons" ? "Teksti dhe audio" : "Testo veten"}</span>
              <h2>{contentMode === "lessons" ? "Mësimet e kapitullit" : "Flashcards e kapitullit"}</h2>
            </div>
            {contentMode === "flashcards" && (
              <button
                className={classic.chapterTest}
                onClick={() => void startTest({ kind: "chapter", title: selectedChapter.title, chapter: selectedChapter })}
                disabled={chapterCards === 0}
                type="button"
              >
                Testo krejt kapitullin · {chapterCards} kartela
              </button>
            )}
          </div>

          {selectedChapter.lessons.length ? (
            contentMode === "lessons" ? (
              <div className={styles.lessonList}>
                {selectedChapter.lessons.map((lesson, index) => (
                  <article data-campus-lesson className={styles.lessonRow} key={lesson._id}>
                    <span className={styles.lessonIndex}>{String(index + 1).padStart(2, "0")}</span>
                    <div className={styles.lessonCopy}>
                      <h3>{lesson.title}</h3>
                      <p>{lesson.summary || "Mësim me tekst, audio dhe flashcards."}</p>
                      <span className={styles.lessonCount}>
                        {lesson.recording?.url ? "Audio · " : ""}{lesson.flashcardCount} flashcards
                      </span>
                    </div>
                    <button className={styles.lessonOpen} onClick={() => chooseLesson(lesson)}>Hape mësimin</button>
                  </article>
                ))}
              </div>
            ) : (
              <div className={classic.deckGrid}>
                {selectedChapter.lessons.map((lesson) => (
                  <article className={classic.deckCard} key={lesson._id}>
                    <span className={classic.deckIcon}><ModeIcon mode="flashcards" /></span>
                    <small>Test i mësimit</small>
                    <h3>{lesson.title}</h3>
                    <p>{lesson.summary || "Përsërit pikat kryesore të mësimit."}</p>
                    <strong>{lesson.flashcardCount} kartela</strong>
                    <button
                      onClick={() => void startTest({ kind: "lesson", title: lesson.title, chapter: selectedChapter, lesson })}
                      disabled={lesson.flashcardCount === 0}
                      type="button"
                    >
                      {lesson.flashcardCount ? "Testo mësimin" : "Ende pa flashcards"}
                    </button>
                  </article>
                ))}
              </div>
            )
          ) : (
            <div className={styles.emptyGrade}><strong>Ende nuk ka mësime.</strong><span>Përmbajtja do të shfaqet pasi të publikohet.</span></div>
          )}
        </section>
      </main>
    );
  }

  if (selectedGrade && selectedSubject) {
    const subjectStats = getSubjectStats(selectedSubject);

    return (
      <main data-campus-view className="inner-page subject-page">
        <div className={styles.hierarchy} data-campus-breadcrumb>
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

        <ModeChooser mode={contentMode} onChange={setContentMode} />

        <section className="chapters-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Hapi tjetër</span>
              <h2>{contentMode === "lessons" ? "Zgjidh kapitullin për mësime" : "Zgjidh kapitullin për flashcards"}</h2>
            </div>
          </div>

          {selectedSubject.chapters.length ? (
            <div className="chapter-list">
              {selectedSubject.chapters.map((chapter, index) => {
                const flashcardCount = getChapterFlashcardCount(chapter);
                return (
                  <article className="chapter-row" key={chapter._id}>
                    <span className="chapter-number">{String(index + 1).padStart(2, "0")}</span>
                    <div className="chapter-copy">
                      <h3>{chapter.title}</h3>
                      <p>{chapter.summary || "Mësimet e kapitullit."}</p>
                      <span className="chapter-count-mobile">{chapter.lessons.length} mësime · {flashcardCount} kartela</span>
                    </div>
                    <span className="chapter-count">{chapter.lessons.length} mësime · {flashcardCount} kartela</span>
                    <button className={classic.openButton} onClick={() => chooseChapter(chapter)} type="button">
                      {contentMode === "lessons" ? "Hape kapitullin" : "Hape flashcards"}
                      <span>→</span>
                    </button>
                  </article>
                );
              })}
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
      <main data-campus-view className="inner-page">
        <div className={styles.hierarchy} data-campus-breadcrumb>
          <button onClick={changeGrade}>Klasat</button><span>/</span><span>{selectedGrade.title}</span>
        </div>

        <section className={styles.portalHero} data-campus-grade-hero>
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
              <label className="search-box"><span>⌕</span><input aria-label="Kërko lëndën" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kërko lëndën..." /></label>
              <button className="refresh-button" onClick={() => void fetchPortal(true)} title="Rifresko të dhënat" aria-label="Rifresko të dhënat">↻</button>
            </div>
          </div>

          <ModeChooser mode={contentMode} onChange={setContentMode} />

          {error && <div className="error-box">{error}</div>}
          {visibleSubjects.length ? (
            <div className="subject-grid">
              {visibleSubjects.map((subject, index) => {
                const stats = getSubjectStats(subject);
                const isAnatomySubject = /(anatomi|fiziolog)/i.test(`${subject.slug} ${subject.title}`);
                const sanityIllustrationUrl = subject.cardIllustration?.asset?.url;
                const cardIllustrationUrl = sanityIllustrationUrl
                  ? `${sanityIllustrationUrl}?w=240&fit=max&auto=format`
                  : isAnatomySubject
                    ? "/assets/anatomy-heart.webp"
                    : "";
                const cardIllustrationAlt = subject.cardIllustration?.alt || "";
                return (
                  <article className="subject-card" key={subject._id}>
                    <div className="subject-top"><span>{String(index + 1).padStart(2, "0")}</span><i className={cardIllustrationUrl ? "subject-icon-illustration" : undefined}>{cardIllustrationUrl ? <img src={cardIllustrationUrl} alt={cardIllustrationAlt} aria-hidden={cardIllustrationAlt ? undefined : true} loading="lazy" decoding="async" /> : subject.emoji || "✚"}</i></div>
                    <h3>{subject.title}</h3>
                    <p>{subject.shortDescription || `Lëndë e ${selectedGrade.title}.`}</p>
                    <div className="subject-meta">
                      <span><b>{stats.chapterCount}</b> kapituj</span>
                      <span><b>{stats.flashcardCount}</b> kartela</span>
                    </div>
                    <button className={classic.subjectOpen} onClick={() => chooseSubject(subject)} type="button">
                      {contentMode === "lessons" ? "Hape mësimet" : "Hape flashcards"}
                      <span>→</span>
                    </button>
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
    <main className="campus-home" data-campus-view>
      <PortalHero />

      <section className="stats-strip" aria-label="Portali në shifra">
        <div><strong>3</strong><span>Klasa</span></div>
        <div><strong>{totalStats.subjects}</strong><span>Lëndë</span></div>
        <div><strong>{totalStats.lessons}</strong><span>Mësime</span></div>
        <div><strong>{totalStats.flashcards}</strong><span>Flashcards</span></div>
      </section>

      <section className={styles.gradeSection} id="klasat" data-campus-grades>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>Hapi i parë</span>
          <h2>Zgjidh klasën</h2>
          <p>Pasi ta zgjedhësh, zgjedhja ruhet dhe shfaqen të gjitha lëndët.</p>
        </div>
        {error && <div className="error-box">{error}</div>}
        <div className={styles.gradeGrid}>
          {grades.map((grade) => {
            const stats = getGradeStats(grade);
            return (
              <article className={styles.gradeCard} key={grade._id} data-campus-card data-grade={grade.gradeNumber}>
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
    </main>
  );
}
