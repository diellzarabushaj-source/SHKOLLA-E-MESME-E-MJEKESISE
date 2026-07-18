­r‡^Ñf¥–Ø¦{~ìyÊ'vÃ®¶›­"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient, PortableText, type PortableTextComponents } from "next-sanity";
import dynamic from "next/dynamic";
import styles from "./portal.module.css";
import experience from "./learning-experience.module.css";
import classic from "./classic-learning.module.css";
import type { AdminEditableLesson } from "./LessonAdminEditor";

const LessonAdminEditor = dynamic(() => import("./LessonAdminEditor"), {
  ssr: false,
  loading: () => null,
});

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

function boundedSanityImageUrl(value: string, maxWidth = 1_600): string {
  try {
    const url = new URL(value);
    if (url.hostname === "cdn.sanity.io") {
      url.searchParams.set("w", String(maxWidth));
      url.searchParams.set("fit", "max");
      url.searchParams.set("auto", "format");
      return url.toString();
    }
  } catch {
    // Existing external images keep their original URL.
  }
  return value;
}

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

const portableTextComponents: PortableTextComponents = {
  types: {
    image: ({ value }) => {
      const image = value as SanityImage;
      const sourceUrl = image.assetUrl || image.asset?.url;
      if (!sourceUrl) return null;
      const url = boundedSanityImageUrl(sourceUrl);
      return (
        <figure className={styles.portableImage}>
          <img src={url} alt={image.alt || "Foto e mÃ«simit"} loading="lazy" />
          {image.caption && <figcaption>{image.caption}</figcaption>}
        </figure>
      );
    },
  },
  marks: {
    link: ({ children, value }) => {
      const mark = value as { href?: unknown; title?: unknown };
      const href = typeof mark.href === "string" ? mark.href : "";
      const safe = href.startsWith("/") && !href.startsWith("//")
        || /^https?:\/\//i.test(href)
        || /^mailto:/i.test(href);
      if (!safe) return <>{children}</>;
      const external = /^https?:\/\//i.test(href);
      return <a href={href} title={typeof mark.title === "string" ? mark.title : undefined} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{children}</a>;
    },
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

async function fetchCardsForScope(scope: StudyScope): Promise<Flashcard[]> {
  const query = scope.kind === "lesson" ? lessonCardsQuery : chapterCardsQuery;
  const params = scope.kind === "lesson" ? { lessonId: scope.lesson?._id } : { chapterId: scope.chapter._id };
  return freshClient.fetch<Flashcard[]>(query, params, { perspective: "published" });
}

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
    <div className={classic.modeChooser} role="tablist" aria-label="Zgjidh mÃ«nyrÃ«n e mÃ«simit">
      <span className={classic.modeLabel}>Ã‡farÃ« dÃ«shiron tÃ« hapÃ«sh?</span>
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
            <span>{item === "lessons" ? "MÃ«simet" : "Flashcards"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ClassicLearningPortal({ isAdmin = false }: { isAdmin?: boolean }) {
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
  const studyScopeRef = useRef<StudyScope | null>(null);
  const studyingRef = useRef(false);
  const cardsRef = useRef<Flashcard[]>([]);

  useEffect(() => {
    selectedGradeRef.current = selectedGrade;
    selectedSubjectRef.current = selectedSubject;
    selectedChapterRef.current = selectedChapter;
    selectedLessonRef.current = selectedLesson;
    studyScopeRef.current = studyScope;
    studyingRef.current = studying;
    cardsRef.current = cards;
  }, [cards, selectedGrade, selectedSubject, selectedChapter, selectedLesson, studyScope, studying]);

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
      setError("Portali nuk mund tÃ« ngarkohej. Provo pÃ«rsÃ«ri.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let stopped = false;
    let refreshTimer: number | null = null;
    let refreshInFlight = false;
    let rerunRequested = false;

    const refreshPublishedContent = async (showLoader = false) => {
      if (stopped) return;
      if (refreshInFlight) {
        rerunRequested = true;
        return;
      }

      refreshInFlight = true;
      try {
        let nextShowLoader = showLoader;
        do {
          rerunRequested = false;
          await fetchPortal(nextShowLoader, true);
          nextShowLoader = false;
          const activeLesson = selectedLessonRef.current;
          if (stopped) return;

          try {
            if (activeLesson) {
              const details = await freshClient.fetch<Lesson | null>(
                liveLessonQuery,
                { lessonId: activeLesson._id },
                { perspective: "published" },
              );
              if (!stopped && details && selectedLessonRef.current?._id === details._id) {
                selectedLessonRef.current = details;
                setSelectedLesson(details);
              }
            }

            const activeScope = studyScopeRef.current;
            if (!stopped && studyingRef.current && activeScope) {
              const refreshedCards = await fetchCardç½º¶‰žËkºwµç}¸¹‰½‘äü¹±•¹Ñ €ü€ (€€€€€€€€€€€€ñA½ÉÑ…‰±•Q•áÐÙ…±Õ”õíÍ•±•Ñ•‘1•ÍÍ½¸¹‰½‘ä…Ì¹•Ù•Éô½µÁ½¹•¹ÑÌõíÁ½ÉÑ…‰±•Q•áÑ½µÁ½¹•¹ÑÍô€¼ø(€€€€€€€€€€¤€è€ (€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹±•ÍÍ½¹µÁÑåôùQ•­ÍÑ¤¤Á±½Ó¬¤¯­Ñ¥¨·­Í¥µ¤•¹‘”¹Õ¬ƒ­Í¡Ó¬ÁÕ‰±¥­Õ…È¸ð½‘¥Øø(€€€€€€€€€€¥ô(€€€€€€€€ð½…ÉÑ¥±”ø((€€€€€€€€ñ¹…Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹±•ÍÍ½¹9…Ù¥…Ñ¥½¹ô…É¥„µ±…‰•°ô‰9…Ù¥¥µ¤¹“­Éµ©•Ð·­Í¥µ•Ù”ˆø(€€€€€€€€€€ñ‰ÕÑÑ½¸(€€€€€€€€€€€±…ÍÍ9…µ”õíÍÑå±•Ì¹±•ÍÍ½¹9…Ù	ÕÑÑ½¹ô(€€€€€€€€€€€ÑåÁ”ô‰‰ÕÑÑ½¸ˆ(€€€€€€€€€€€½¹±¥¬õì ¤€ôøÁÉ•Ù¥½ÕÍ1•ÍÍ½¸€˜˜Ù½¥¡½½Í•1•ÍÍ½¸¡ÁÉ•Ù¥½ÕÍ1•ÍÍ½¸¥ô(€€€€€€€€€€€‘¥Í…‰±•õì…ÁÉ•Ù¥½ÕÍ1•ÍÍ½¹ô(€€€€€€€€€€ø(€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”õíÍÑå±•Ì¹±•ÍÍ½¹9…ÙÉÉ½Ýô…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆûŠ@ð½ÍÁ…¸ø(€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”õíÍÑå±•Ì¹±•ÍÍ½¹9…Ù½Áåôø(€€€€€€€€€€€€€€ñÍµ…±°ù7­Í¥µ¤Á…É…ÁÉ…¬ð½Íµ…±°ø(€€€€€€€€€€€€€€ñÍÑÉ½¹œùíÁÉ•Ù¥½ÕÍ1•ÍÍ½¸ü¹Ñ¥Ñ±”ñð€‰-äƒ­Í¡Ó¬·­Í¥µ¤¤Á…Ë¬‰ôð½ÍÑÉ½¹œø(€€€€€€€€€€€€ð½ÍÁ…¸ø(€€€€€€€€€€ð½‰ÕÑÑ½¸ø((€€€€€€€€€€ñ‰ÕÑÑ½¸(€€€€€€€€€€€±…ÍÍ9…µ”õí€‘íÍÑå±•Ì¹±•ÍÍ½¹9…Ù	ÕÑÑ½¹ô€‘íÍÑå±•Ì¹±•ÍÍ½¹9…Ù9•áÑõô(€€€€€€€€€€€ÑåÁ”ô‰‰ÕÑÑ½¸ˆ(€€€€€€€€€€€½¹±¥¬õì ¤€ôø¹•áÑ1•ÍÍ½¸€˜˜Ù½¥¡½½Í•1•ÍÍ½¸¡¹•áÑ1•ÍÍ½¸¥ô(€€€€€€€€€€€‘¥Í…‰±•õì…¹•áÑ1•ÍÍ½¹ô(€€€€€€€€€€ø(€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”õíÍÑå±•Ì¹±•ÍÍ½¹9…Ù½Áåôø(€€€€€€€€€€€€€€ñÍµ…±°ù7­Í¥µ¤Ñ©•Ó­Èð½Íµ…±°ø(€€€€€€€€€€€€€€ñÍÑÉ½¹œùí¹•áÑ1•ÍÍ½¸ü¹Ñ¥Ñ±”ñð€‰-äƒ­Í¡Ó¬·­Í¥µ¤¤™Õ¹‘¥Ð‰ôð½ÍÑÉ½¹œø(€€€€€€€€€€€€ð½ÍÁ…¸ø(€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”õíÍÑå±•Ì¹±•ÍÍ½¹9…ÙÉÉ½Ýô…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆûŠHð½ÍÁ…¸ø(€€€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€€€ð½¹…Øø((€€€€€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”õíÍÑå±•Ì¹±•ÍÍ½¹MÑÕ‘å	…Éôø(€€€€€€€€€€ñ‘¥Øø(€€€€€€€€€€€€ñÍÑÉ½¹œùQ•ÍÑ½©”¯­Ó¬·­Í¥´ð½ÍÑÉ½¹œø(€€€€€€€€€€€€ñÍÁ…¸ùíÍ•±•Ñ•‘1•ÍÍ½¸¹™±…Í¡…É‘½Õ¹Ñô­…ÉÑ•±„¹„Ù•Ó­´­ä·­Í¥´ð½ÍÁ…¸ø(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€ñ‰ÕÑÑ½¸(€€€€€€€€€€€±…ÍÍ9…µ”õíÍÑå±•Ì¹ÍÑ…ÉÑMÑÕ‘åô(€€€€€€€€€€€½¹±¥¬õì ¤€ôøÙ½¥ÍÑ…ÉÑQ•ÍÐ¡ì­¥¹è€‰±•ÍÍ½¸ˆ°Ñ¥Ñ±”èÍ•±•Ñ•‘1•ÍÍ½¸¹Ñ¥Ñ±”°¡…ÁÑ•ÈèÍ•±•Ñ•‘¡…ÁÑ•È°±•ÍÍ½¸èÍ•±•Ñ•‘1•ÍÍ½¸ô¥ô(€€€€€€€€€€€‘¥Í…‰±•õíÍ•±•Ñ•‘1•ÍÍ½¸¹™±…Í¡…É‘½Õ¹Ð€ôôô€Áô(€€€€€€€€€€ø(€€€€€€€€€€€íÍ•±•Ñ•‘1•ÍÍ½¸¹™±…Í¡…É‘½Õ¹Ð€ü€‰Q•ÍÑ¼·­Í¥µ¥¸ˆ€è€‰¹‘”Á„™±…Í¡…É‘Ì‰ô(€€€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€€€ð½Í•Ñ¥½¸ø(€€€€€€ð½µ…¥¸ø(€€€€¤ì(€ô((€¥˜€¡Í•±•Ñ•‘É…‘”€˜˜Í•±•Ñ•‘MÕ‰©•Ð€˜˜Í•±•Ñ•‘¡…ÁÑ•È¤ì(€€€½¹ÍÐ¡…ÁÑ•É…É‘Ì€ô•Ñ¡…ÁÑ•É±…Í¡…É‘½Õ¹Ð¡Í•±•Ñ•‘¡…ÁÑ•È¤ì((€€€É•ÑÕÉ¸€ (€€€€€€ñµ…¥¸±…ÍÍ9…µ”ô‰¥¹¹•ÈµÁ…”ˆø(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹¡¥•É…É¡åôø(€€€€€€€€€€ñ‰ÕÑÑ½¸½¹±¥¬õí¡…¹•É…‘•ôù-±…Í…Ðð½‰ÕÑÑ½¸øñÍÁ…¸ø¼ð½ÍÁ…¸ø(€€€€€€€€€€ñ‰ÕÑÑ½¸½¹±¥¬õí½Q½É…‘•ôùíÍ•±•Ñ•‘É…‘”¹Ñ¥Ñ±•ôð½‰ÕÑÑ½¸øñÍÁ…¸ø¼ð½ÍÁ…¸ø(€€€€€€€€€€ñ‰ÕÑÑ½¸½¹±¥¬õí½Q½MÕ‰©•ÑôùíÍ•±•Ñ•‘MÕ‰©•Ð¹Ñ¥Ñ±•ôð½‰ÕÑÑ½¸øñÍÁ…¸ø¼ð½ÍÁ…¸ø(€€€€€€€€€€ñÍÁ…¸ùíÍ•±•Ñ•‘¡…ÁÑ•È¹Ñ¥Ñ±•ôð½ÍÁ…¸ø(€€€€€€€€ð½‘¥Øø((€€€€€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰¡…ÁÑ•Èµ¡•É¼ˆø(€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰±…É”µ¥½¸ˆû
œð½ÍÁ…¸ø(€€€€€€€€€€ñ‘¥Øø(€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰•å•‰É½Üˆù-…Á¥ÑÕ±±¤ƒ
ÜíÍ•±•Ñ•‘É…‘”¹Ñ¥Ñ±•ôð½ÍÁ…¸ø(€€€€€€€€€€€€ñ ÄùíÍ•±•Ñ•‘¡…ÁÑ•È¹Ñ¥Ñ±•ôð½ Äø(€€€€€€€€€€€€ñÀùíÍ•±•Ñ•‘¡…ÁÑ•È¹ÍÕµµ…Éäñð€‰7­Í¥µ•Ð‘¡”™±…Í¡…É‘Ì”¯­Ñ¥¨­…Á¥ÑÕ±±¤¸‰ôð½Àø(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€ð½Í•Ñ¥½¸ø((€€€€€€€€ñ5½‘•¡½½Í•Èµ½‘”õí½¹Ñ•¹Ñ5½‘•ô½¹¡…¹”õíÍ•Ñ½¹Ñ•¹Ñ5½‘•ô€¼ø((€€€€€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰¡…ÁÑ•ÉÌµÍ•Ñ¥½¸ˆø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Í•Ñ¥½¸µ¡•…‘¥¹œˆø(€€€€€€€€€€€€ñ‘¥Øø(€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰•å•‰É½Üˆùí½¹Ñ•¹Ñ5½‘”€ôôô€‰±•ÍÍ½¹Ìˆ€ü€‰Q•­ÍÑ¤‘¡”…Õ‘¥¼ˆ€è€‰Q•ÍÑ¼Ù•Ñ•¸‰ôð½ÍÁ…¸ø(€€€€€€€€€€€€€€ñ Èùí½¹Ñ•¹Ñ5½‘”€ôôô€‰±•ÍÍ½¹Ìˆ€ü€‰7­Í¥µ•Ð”­…Á¥ÑÕ±±¥Ðˆ€è€‰±…Í¡…É‘Ì”­…Á¥ÑÕ±±¥Ð‰ôð½ Èø(€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€í½¹Ñ•¹Ñ5½‘”€ôôô€‰™±…Í¡…É‘Ìˆ€˜˜€ (€€€€€€€€€€€€€€ñ‰ÕÑÑ½¸(€€€€€€€€€€€€€€€±…ÍÍ9…µ”õí±…ÍÍ¥Œ¹¡…ÁÑ•ÉQ•ÍÑô(€€€€€€€€€€€€€€€½¹±¥¬õì ¤€ôøÙ½¥ÍÑ…ÉÑQ•ÍÐ¡ì­¥¹è€‰¡…ÁÑ•Èˆ°Ñ¥Ñ±”èÍ•±•Ñ•‘¡…ÁÑ•È¹Ñ¥Ñ±”°¡…ÁÑ•ÈèÍ•±•Ñ•‘¡…ÁÑ•Èô¥ô(€€€€€€€€€€€€€€€‘¥Í…‰±•õí¡…ÁÑ•É…É‘Ì€ôôô€Áô(€€€€€€€€€€€€€€€ÑåÁ”ô‰‰ÕÑÑ½¸ˆ(€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€Q•ÍÑ¼­É•©Ð­…Á¥ÑÕ±±¥¸ƒ
Üí¡…ÁÑ•É…É‘Íô­…ÉÑ•±„(€€€€€€€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€€€€€€€¥ô(€€€€€€€€€€ð½‘¥Øø((€€€€€€€€€íÍ•±•Ñ•‘¡…ÁÑ•È¹±•ÍÍ½¹Ì¹±•¹Ñ €ü€ (€€€€€€€€€€€½¹Ñ•¹Ñ5½‘”€ôôô€‰±•ÍÍ½¹Ìˆ€ü€ (€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹±•ÍÍ½¹1¥ÍÑôø(€€€€€€€€€€€€€€€íÍ•±•Ñ•‘¡…ÁÑ•È¹±•ÍÍ½¹Ì¹µ…À ¡±•ÍÍ½¸°¥¹‘•à¤€ôø€ (€€€€€€€€€€€€€€€€€€ñ…ÉÑ¥±”±…ÍÍ9…µ”õíÍÑå±•Ì¹±•ÍÍ½¹I½Ýô­•äõí±•ÍÍ½¸¹}¥‘ôø(€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”õíÍÑå±•Ì¹±•ÍÍ½¹%¹‘•áôùíMÑÉ¥¹œ¡¥¹‘•à€¬€Ä¤¹Á…‘MÑ…ÉÐ È°€ˆÀˆ¥ôð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹±•ÍÍ½¹½Áåôø(€€€€€€€€€€€€€€€€€€€€€€ñ Ìùí±•ÍÍ½¸¹Ñ¥Ñ±•ôð½ Ìø(€€€€€€€€€€€€€€€€€€€€€€ñÀùí±•ÍÍ½¸¹ÍÕµµ…Éäñð€‰7­Í¥´µ”Ñ•­ÍÐ°…Õ‘¥¼‘¡”™±…Í¡…É‘Ì¸‰ôð½Àø(€€€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”õíÍÑå±•Ì¹±•ÍÍ½¹½Õ¹Ñôø(€€€€€€€€€€€€€€€€€€€€€€€í±•ÍÍ½¸¹É•½É‘¥¹œü¹ÕÉ°€ü€‰Õ‘¥¼ƒ
Ü€ˆ€è€ˆ‰õí±•ÍÍ½¸¹™±…Í¡…É‘½Õ¹Ñô™±…Í¡…É‘Ì(€€€€€€€€€€€€€€€€€€€€€€ð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÍ9…µ”õíÍÑå±•Ì¹±•ÍÍ½¹=Á•¹ô½¹±¥¬õì ¤€ôø¡½½Í•1•ÍÍ½¸¡±•ÍÍ½¸¥ôù!…Á”·­Í¥µ¥¸ð½‰ÕÑÑ½¸ø(€€€€€€€€€€€€€€€€€€ð½…ÉÑ¥±”ø(€€€€€€€€€€€€€€€€¤¥ô(€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€¤€è€ (€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õí±…ÍÍ¥Œ¹‘•­É¥‘ôø(€€€€€€€€€€€€€€€íÍ•±•Ñ•‘¡…ÁÑ•È¹±•ÍÍ½¹Ì¹µ…À ¡±•ÍÍ½¸¤€ôø€ (€€€€€€€€€€€€€€€€€€ñ…ÉÑ¥±”±…ÍÍ9…µ”õí±…ÍÍ¥Œ¹‘•­…É‘ô­•äõí±•ÍÍ½¸¹}¥‘ôø(€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”õí±…ÍÍ¥Œ¹‘•­%½¹ôøñ5½‘•%½¸µ½‘”ô‰™±…Í¡…É‘Ìˆ€¼øð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€€€€ñÍµ…±°ùQ•ÍÐ¤·­Í¥µ¥Ðð½Íµ…±°ø(€€€€€€€€€€€€€€€€€€€€ñ Ìùí±•ÍÍ½¸¹Ñ¥Ñ±•ôð½ Ìø(€€€€€€€€€€€€€€€€€€€€ñÀùí±•ÍÍ½¸¹ÍÕµµ…Éäñð€‰C­ÉÏ­É¥ÐÁ¥­…Ð­Éå•Í½É”Ó¬·­Í¥µ¥Ð¸‰ôð½Àø(€€€€€€€€€€€€€€€€€€€€ñÍÑÉ½¹œùí±•ÍÍ½¸¹™±…Í¡…É‘½Õ¹Ñô­…ÉÑ•±„ð½ÍÑÉ½¹œø(€€€€€€€€€€€€€€€€€€€€ñ‰ÕÑÑ½¸(€€€€€€€€€€€€€€€€€€€€€½¹±¥¬õì ¤€ôøÙ½¥ÍÑ…ÉÑQ•ÍÐ¡ì­¥¹è€‰±•ÍÍ½¸ˆ°Ñ¥Ñ±”è±•ÍÍ½¸¹Ñ¥Ñ±”°¡…ÁÑ•ÈèÍ•±•Ñ•‘¡…ÁÑ•È°±•ÍÍ½¸ô¥ô(€€€€€€€€€€€€€€€€€€€€€‘¥Í…‰±•õí±•ÍÍ½¸¹™±…Í¡…É‘½Õ¹Ð€ôôô€Áô(€€€€€€€€€€€€€€€€€€€€€ÑåÁ”ô‰‰ÕÑÑ½¸ˆ(€€€€€€€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€€€€€€€í±•ÍÍ½¸¹™±…Í¡…É‘½Õ¹Ð€ü€‰Q•ÍÑ¼·­Í¥µ¥¸ˆ€è€‰¹‘”Á„™±…Í¡…É‘Ì‰ô(€€€€€€€€€€€€€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€€€€€€€€€€€€€ð½…ÉÑ¥±”ø(€€€€€€€€€€€€€€€€¤¥ô(€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€¤(€€€€€€€€€€¤€è€ (€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹•µÁÑåÉ…‘•ôøñÍÑÉ½¹œù¹‘”¹Õ¬­„·­Í¥µ”¸ð½ÍÑÉ½¹œøñÍÁ…¸ùC­Éµ‰…©Ñ©„‘¼Ó¬Í¡™…Å•ÐÁ…Í¤Ó¬ÁÕ‰±¥­½¡•Ð¸ð½ÍÁ…¸øð½‘¥Øø(€€€€€€€€€€¥ô(€€€€€€€€ð½Í•Ñ¥½¸ø(€€€€€€ð½µ…¥¸ø(€€€€¤ì(€ô((€¥˜€¡Í•±•Ñ•‘É…‘”€˜˜Í•±•Ñ•‘MÕ‰©•Ð¤ì(€€€½¹ÍÐÍÕ‰©•ÑMÑ…ÑÌ€ô•ÑMÕ‰©•ÑMÑ…ÑÌ¡Í•±•Ñ•‘MÕ‰©•Ð¤ì((€€€É•ÑÕÉ¸€ (€€€€€€ñµ…¥¸±…ÍÍ9…µ”ô‰¥¹¹•ÈµÁ…”ÍÕ‰©•ÐµÁ…”ˆø(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹¡¥•É…É¡åôø(€€€€€€€€€€ñ‰ÕÑÑ½¸½¹±¥¬õí¡…¹•É…‘•ôù-±…Í…Ðð½‰ÕÑÑ½¸øñÍÁ…¸ø¼ð½ÍÁ…¸ø(€€€€€€€€€€ñ‰ÕÑÑ½¸½¹±¥¬õí½Q½É…‘•ôùíÍ•±•Ñ•‘É…‘”¹Ñ¥Ñ±•ôð½‰ÕÑÑ½¸øñÍÁ…¸ø¼ð½ÍÁ…¸ø(€€€€€€€€€€ñÍÁ…¸ùíÍ•±•Ñ•‘MÕ‰©•Ð¹Ñ¥Ñ±•ôð½ÍÁ…¸ø(€€€€€€€€ð½‘¥Øø((€€€€€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰ÍÕ‰©•Ðµ¡•É¼ˆø(€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰±…É”µ¥½¸ˆùíÍ•±•Ñ•‘MÕ‰©•Ð¹•µ½©¤ñð€‹Šrh‰ôð½ÍÁ…¸ø(€€€€€€€€€€ñ‘¥Øø(€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰•å•‰É½ÜˆùíÍ•±•Ñ•‘É…‘”¹Ñ¥Ñ±•ôƒ
Ü3­¹‘„ð½ÍÁ…¸ø(€€€€€€€€€€€€ñ ÄùíÍ•±•Ñ•‘MÕ‰©•Ð¹Ñ¥Ñ±•ôð½ Äø(€€€€€€€€€€€€ñÀùíÍ•±•Ñ•‘MÕ‰©•Ð¹Í¡½ÉÑ•ÍÉ¥ÁÑ¥½¹ôð½Àø(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰ÍÕ‰©•ÐµÍÕµµ…Éäˆø(€€€€€€€€€€€€ñ‘¥ØøñÍÑÉ½¹œùíÍÕ‰©•ÑMÑ…ÑÌ¹¡…ÁÑ•É½Õ¹Ñôð½ÍÑÉ½¹œøñÍÁ…¸ù-…Á¥ÑÕ¨ð½ÍÁ…¸øð½‘¥Øø(€€€€€€€€€€€€ñ‘¥ØøñÍÑÉ½¹œùíÍÕ‰©•ÑMÑ…ÑÌ¹™±…Í¡…É‘½Õ¹Ñôð½ÍÑÉ½¹œøñÍÁ…¸ù±…Í¡…É‘Ìð½ÍÁ…¸øð½‘¥Øø(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€ð½Í•Ñ¥½¸ø((€€€€€€€€ñ5½‘•¡½½Í•Èµ½‘”õí½¹Ñ•¹Ñ5½‘•ô½¹¡…¹”õíÍ•Ñ½¹Ñ•¹Ñ5½‘•ô€¼ø((€€€€€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰¡…ÁÑ•ÉÌµÍ•Ñ¥½¸ˆø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Í•Ñ¥½¸µ¡•…‘¥¹œˆø(€€€€€€€€€€€€ñ‘¥Øø(€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰•å•‰É½Üˆù!…Á¤Ñ©•Ó­Èð½ÍÁ…¸ø(€€€€€€€€€€€€€€ñ Èùí½¹Ñ•¹Ñ5½‘”€ôôô€‰±•ÍÍ½¹Ìˆ€ü€‰i©¥‘ ­…Á¥ÑÕ±±¥¸Ã­È·­Í¥µ”ˆ€è€‰i©¥‘ ­…Á¥ÑÕ±±¥¸Ã­È™±…Í¡…É‘Ì‰ôð½ Èø(€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€ð½‘¥Øø((€€€€€€€€€íÍ•±•Ñ•‘MÕ‰©•Ð¹¡…ÁÑ•ÉÌ¹±•¹Ñ €ü€ (€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰¡…ÁÑ•Èµ±¥ÍÐˆø(€€€€€€€€€€€€€íÍ•±•Ñ•‘MÕ‰©•Ð¹¡…ÁÑ•ÉÌ¹µ…À ¡¡…ÁÑ•È°¥¹‘•à¤€ôøì(€€€€€€€€€€€€€€€½¹ÍÐ™±…Í¡…É‘½Õ¹Ð€ô•Ñ¡…ÁÑ•É±…Í¡…É‘½Õ¹Ð¡¡…ÁÑ•È¤ì(€€€€€€€€€€€€€€€É•ÑÕÉ¸€ (€€€€€€€€€€€€€€€€€€ñ…ÉÑ¥±”±…ÍÍ9…µ”ô‰¡…ÁÑ•ÈµÉ½Üˆ­•äõí¡…ÁÑ•È¹}¥‘ôø(€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰¡…ÁÑ•Èµ¹Õµ‰•ÈˆùíMÑÉ¥¹œ¡¥¹‘•à€¬€Ä¤¹Á…‘MÑ…ÉÐ È°€ˆÀˆ¥ôð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰¡…ÁÑ•Èµ½Áäˆø(€€€€€€€€€€€€€€€€€€€€€€ñ Ìùí¡…ÁÑ•È¹Ñ¥Ñ±•ôð½ Ìø(€€€€€€€€€€€€€€€€€€€€€€ñÀùí¡…ÁÑ•È¹ÍÕµµ…Éäñð€‰7­Í¥µ•Ð”­…Á¥ÑÕ±±¥Ð¸‰ôð½Àø(€€€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰¡…ÁÑ•Èµ½Õ¹Ðµµ½‰¥±”ˆùí¡…ÁÑ•È¹±•ÍÍ½¹Ì¹±•¹Ñ¡ô·­Í¥µ”ƒ
Üí™±…Í¡…É‘½Õ¹Ñô­…ÉÑ•±„ð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰¡…ÁÑ•Èµ½Õ¹Ðˆùí¡…ÁÑ•È¹±•ÍÍ½¹Ì¹±•¹Ñ¡ô·­Í¥µ”ƒ
Üí™±…Í¡…É‘½Õ¹Ñô­…ÉÑ•±„ð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÍ9…µ”õí±…ÍÍ¥Œ¹½Á•¹	ÕÑÑ½¹ô½¹±¥¬õì ¤€ôø¡½½Í•¡…ÁÑ•È¡¡…ÁÑ•È¥ôÑåÁ”ô‰‰ÕÑÑ½¸ˆø(€€€€€€€€€€€€€€€€€€€€€í½¹Ñ•¹Ñ5½‘”€ôôô€‰±•ÍÍ½¹Ìˆ€ü€‰!…Á”­…Á¥ÑÕ±±¥¸ˆ€è€‰!…Á”™±…Í¡…É‘Ì‰ô(€€€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸ûŠHð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€€€€€€€€€€€€€ð½…ÉÑ¥±”ø(€€€€€€€€€€€€€€€€¤ì(€€€€€€€€€€€€€ô¥ô(€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€¤€è€ (€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹•µÁÑåÉ…‘•ôøñÍÑÉ½¹œù¹‘”¹Õ¬­„­…Á¥ÑÕ¨¸ð½ÍÑÉ½¹œøñÍÁ…¸ù-©¼³­¹“¬¤Ã­É­•ÐÙ•Ó­´íÍ•±•Ñ•‘É…‘”¹Ñ¥Ñ±•ô¸ð½ÍÁ…¸øð½‘¥Øø(€€€€€€€€€€¥ô(€€€€€€€€ð½Í•Ñ¥½¸ø(€€€€€€ð½µ…¥¸ø(€€€€¤ì(€ô((€¥˜€¡Í•±•Ñ•‘É…‘”¤ì(€€€½¹ÍÐÉ…‘•MÑ…ÑÌ€ô•ÑÉ…‘•MÑ…ÑÌ¡Í•±•Ñ•‘É…‘”¤ì((€€€É•ÑÕÉ¸€ (€€€€€€ñµ…¥¸±…ÍÍ9…µ”ô‰¥¹¹•ÈµÁ…”ˆø(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹¡¥•É…É¡åôø(€€€€€€€€€€ñ‰ÕÑÑ½¸½¹±¥¬õí¡…¹•É…‘•ôù-±…Í…Ðð½‰ÕÑÑ½¸øñÍÁ…¸ø¼ð½ÍÁ…¸øñÍÁ…¸ùíÍ•±•Ñ•‘É…‘”¹Ñ¥Ñ±•ôð½ÍÁ…¸ø(€€€€€€€€ð½‘¥Øø((€€€€€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”õíÍÑå±•Ì¹Á½ÉÑ…±!•É½ôø(€€€€€€€€€€ñ‘¥Øø(€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”õíÍÑå±•Ì¹•å•‰É½Ýôù-±…Í„…­Ñ¥Ù”ð½ÍÁ…¸ø(€€€€€€€€€€€€ñ ÄùíÍ•±•Ñ•‘É…‘”¹Ñ¥Ñ±•ôð½ Äø(€€€€€€€€€€€€ñÀùíÍ•±•Ñ•‘É…‘”¹Í¡½ÉÑ•ÍÉ¥ÁÑ¥½¸ñð€‰A½ÉÑ…±¤·­Í¥µ½È¤¯­Í…¨­±…Í”¸‰ôð½Àø(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹Á½ÉÑ…±Ñ¥½¹Íôø(€€€€€€€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÍ9…µ”õíÍÑå±•Ì¹Í•½¹‘…ÉåÑ¥½¹ô½¹±¥¬õí¡…¹•É…‘•ôù9‘ÉåÍ¡¼­±…Ï­¸ð½‰ÕÑÑ½¸ø(€€€€€€€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÍ9…µ”õíÍÑå±•Ì¹ÁÉ¥µ…ÉåÑ¥½¹ô½¹±¥¬õì ¤€ôø‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% ‰±•¹‘•Ðˆ¤ü¹ÍÉ½±±%¹Ñ½Y¥•Ü¡ì‰•¡…Ù¥½Èè€‰Íµ½½Ñ ˆô¥ôùM¡¥­¼³­¹“­Ðð½‰ÕÑÑ½¸ø(€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹Á½ÉÑ…±MÑ…ÑÍôø(€€€€€€€€€€€€ñ‘¥ØøñÍÑÉ½¹œùíÉ…‘•MÑ…ÑÌ¹ÍÕ‰©•Ñ½Õ¹Ñôð½ÍÑÉ½¹œøñÍÁ…¸ù3­¹“¬ð½ÍÁ…¸øð½‘¥Øø(€€€€€€€€€€€€ñ‘¥ØøñÍÑÉ½¹œùíÉ…‘•MÑ…ÑÌ¹¡…ÁÑ•É½Õ¹Ñôð½ÍÑÉ½¹œøñÍÁ…¸ù-…Á¥ÑÕ¨ð½ÍÁ…¸øð½‘¥Øø(€€€€€€€€€€€€ñ‘¥ØøñÍÑÉ½¹œùíÉ…‘•MÑ…ÑÌ¹±•ÍÍ½¹½Õ¹Ñôð½ÍÑÉ½¹œøñÍÁ…¸ù7­Í¥µ”ð½ÍÁ…¸øð½‘¥Øø(€€€€€€€€€€€€ñ‘¥ØøñÍÑÉ½¹œùíÉ…‘•MÑ…ÑÌ¹™±…Í¡…É‘½Õ¹Ñôð½ÍÑÉ½¹œøñÍÁ…¸ù±…Í¡…É‘Ìð½ÍÁ…¸øð½‘¥Øø(€€€€€€€€€€ð½‘¥Øø(€€€€€€€€ð½Í•Ñ¥½¸ø((€€€€€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰ÍÕ‰©•ÑÌµÍ•Ñ¥½¸ˆ¥ô‰±•¹‘•Ðˆø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Í•Ñ¥½¸µ¡•…‘¥¹œˆø(€€€€€€€€€€€€ñ‘¥ØøñÍÁ…¸±…ÍÍ9…µ”ô‰•å•‰É½ÜˆùY•Ó­´íÍ•±•Ñ•‘É…‘”¹Ñ¥Ñ±•ôð½ÍÁ…¸øñ Èùi©¥‘ ³­¹“­¸ð½ Èøð½‘¥Øø(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰±¥‰É…ÉäµÑ½½±Ìˆø(€€€€€€€€€€€€€€ñ±…‰•°±…ÍÍ9…µ”ô‰Í•…É µ‰½àˆøñÍÁ…¸ûŠ2Tð½ÍÁ…¸øñ¥¹ÁÕÐÙ…±Õ”õíÍ•…É¡ô½¹¡…¹”õì¡•Ù•¹Ð¤€ôøÍ•ÑM•…É ¡•Ù•¹Ð¹Ñ…É•Ð¹Ù…±Õ”¥ôÁ±…•¡½±‘•Èô‰/­É­¼³­¹“­¸¸¸¸ˆ€¼øð½±…‰•°ø(€€€€€€€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰É•™É•Í µ‰ÕÑÑ½¸ˆ½¹±¥¬õì ¤€ôøÙ½¥™•Ñ¡A½ÉÑ…°¡ÑÉÕ”¥ôÑ¥Ñ±”ô‰I¥™É•Í­¼Ó¬‘£­¹…ÐˆûŠìð½‰ÕÑÑ½¸ø(€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€ð½‘¥Øø((€€€€€€€€€€ñ5½‘•¡½½Í•Èµ½‘”õí½¹Ñ•¹Ñ5½‘•ô½¹¡…¹”õíÍ•Ñ½¹Ñ•¹Ñ5½‘•ô€¼ø((€€€€€€€€€í•ÉÉ½È€˜˜€ñ‘¥Ø±…ÍÍ9…µ”ô‰•ÉÉ½Èµ‰½àˆùí•ÉÉ½Éôð½‘¥Øùô(€€€€€€€€€íÙ¥Í¥‰±•MÕ‰©•ÑÌ¹±•¹Ñ €ü€ (€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰ÍÕ‰©•ÐµÉ¥ˆø(€€€€€€€€€€€€€íÙ¥Í¥‰±•MÕ‰©•ÑÌ¹µ…À ¡ÍÕ‰©•Ð°¥¹‘•à¤€ôøì(€€€€€€€€€€€€€€€½¹ÍÐÍÑ…ÑÌ€ô•ÑMÕ‰©•ÑMÑ…ÑÌ¡ÍÕ‰©•Ð¤ì(€€€€€€€€€€€€€€€É•ÑÕÉ¸€ (€€€€€€€€€€€€€€€€€€ñ…ÉÑ¥±”±…ÍÍ9…µ”ô‰ÍÕ‰©•Ðµ…Éˆ­•äõíÍÕ‰©•Ð¹}¥‘ôø(€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰ÍÕ‰©•ÐµÑ½ÀˆøñÍÁ…¸ùíMÑÉ¥¹œ¡¥¹‘•à€¬€Ä¤¹Á…‘MÑ…ÉÐ È°€ˆÀˆ¥ôð½ÍÁ…¸øñ¤ùíÍÕ‰©•Ð¹•µ½©¤ñð€‹Šrh‰ôð½¤øð½‘¥Øø(€€€€€€€€€€€€€€€€€€€€ñ ÌùíÍÕ‰©•Ð¹Ñ¥Ñ±•ôð½ Ìø(€€€€€€€€€€€€€€€€€€€€ñÀùíÍÕ‰©•Ð¹Í¡½ÉÑ•ÍÉ¥ÁÑ¥½¸ñð3­¹“¬”€‘íÍ•±•Ñ•‘É…‘”¹Ñ¥Ñ±•ô¹ôð½Àø(€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰ÍÕ‰©•Ðµµ•Ñ„ˆø(€€€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸øñˆùíÍÑ…ÑÌ¹¡…ÁÑ•É½Õ¹Ñôð½ˆø­…Á¥ÑÕ¨ð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸øñˆùíÍÑ…ÑÌ¹™±…Í¡…É‘½Õ¹Ñôð½ˆø­…ÉÑ•±„ð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÍ9…µ”õí±…ÍÍ¥Œ¹ÍÕ‰©•Ñ=Á•¹ô½¹±¥¬õì ¤€ôø¡½½Í•MÕ‰©•Ð¡ÍÕ‰©•Ð¥ôÑåÁ”ô‰‰ÕÑÑ½¸ˆø(€€€€€€€€€€€€€€€€€€€€€í½¹Ñ•¹Ñ5½‘”€ôôô€‰±•ÍÍ½¹Ìˆ€ü€‰!…Á”·­Í¥µ•Ðˆ€è€‰!…Á”™±…Í¡…É‘Ì‰ô(€€€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸ûŠHð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€€€€€€€€€€€€€ð½…ÉÑ¥±”ø(€€€€€€€€€€€€€€€€¤ì(€€€€€€€€€€€€€ô¥ô(€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€¤€è€ (€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹•µÁÑåÉ…‘•ôø(€€€€€€€€€€€€€€ñÍÑÉ½¹œùíÍ•…É €ü€‰9Õ¬Ô©•Ð…Í¹«¬³­¹“¬¸ˆ€è€‰¹‘”¹Õ¬­„³­¹“¬»¬¯­Ó¬­±…Ï¬¸‰ôð½ÍÑÉ½¹œø(€€€€€€€€€€€€€€ñÍÁ…¸ù-±…Í„µ‰•Ñ•Ð”¹‘…Ë¬Á±½Ó­Í¥Í¡Ð¹„­±…Í…ÐÑ©•É„¸ð½ÍÁ…¸ø(€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€¥ô(€€€€€€€€ð½Í•Ñ¥½¸ø(€€€€€€ð½µ…¥¸ø(€€€€¤ì(€ô((€É•ÑÕÉ¸€ (€€€€ñµ…¥¸ø(€€€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰¡•É¼ˆø(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰¡•É¼µ½Áäˆø(€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰ÍÑ…ÑÕÌµÁ¥±°ˆøñ¤€¼øA½ÉÑ…±¤¤Í¡­½±³­ÌÍ½»¬ð½ÍÁ…¸ø(€€€€€€€€€€ñ Äù7­Í¥µ”‘¡”™±…Í¡…É‘Ì¸ñ‰È€¼øñ•´ùS¬¹‘…É„Í¥Á…Ì­±…Ï­Ì¸ð½•´øð½ Äø(€€€€€€€€€€ñÀùi©¥‘¡”­±…Ï­¸Ó­¹‘”¸-±…Í„ÉÕ¡•Ð‘¡”Á…ÍÑ…¨¤Í¡• Ó¬©¥Ñ¡„³­¹“­Ð”Í…¨¸ð½Àø(€€€€€€€€€€ñ„±…ÍÍ9…µ”ô‰¡•É¼µÑ„ˆ¡É•˜ôˆ­±…Í…Ðˆùi©¥‘ ­±…Ï­¸€ñÍÁ…¸ûŠHð½ÍÁ…¸øð½„ø(€€€€€€€€ð½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰¡•É¼µÙ¥ÍÕ…°ˆ…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰½É‰¥Ð½¹”ˆ€¼øñ‘¥Ø±…ÍÍ9…µ”ô‰½É‰¥ÐÑÝ¼ˆ€¼ø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰‘•µ¼µ…É™¥ÉÍÐˆøñÍÁ…¸ùA=IQ1$7-M%5=Hð½ÍÁ…¸øñˆù-±…Í„ƒŠHS¬©¥Ñ¡„³­¹“­Ðð½ˆøñÍµ…±°ùMÑÉÕ­ÑÕË¬”Å…ÉÓ¬ð½Íµ…±°øð½‘¥Øø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰‘•µ¼µ…ÉÍ•½¹ˆøñÍÁ…¸ùi)% 7-9eK-8ð½ÍÁ…¸øñˆù7­Í¥µ•Ð½Í”±…Í¡…É‘Ìð½ˆøñÍµ…±°ùY•Ó­´¹«¬‰ÕÑ½¸ð½Íµ…±°øð½‘¥Øø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Á±ÕÌˆø¬ð½‘¥Øø(€€€€€€€€ð½‘¥Øø(€€€€€€ð½Í•Ñ¥½¸ø((€€€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰ÍÑ…ÑÌµÍÑÉ¥Àˆø(€€€€€€€€ñ‘¥ØøñÍÑÉ½¹œøÌð½ÍÑÉ½¹œøñÍÁ…¸ù-±…Í„ð½ÍÁ…¸øð½‘¥Øø(€€€€€€€€ñ‘¥ØøñÍÑÉ½¹œùíÑ½Ñ…±MÑ…ÑÌ¹ÍÕ‰©•ÑÍôð½ÍÑÉ½¹œøñÍÁ…¸ù3­¹“¬ð½ÍÁ…¸øð½‘¥Øø(€€€€€€€€ñ‘¥ØøñÍÑÉ½¹œùíÑ½Ñ…±MÑ…ÑÌ¹±•ÍÍ½¹Íôð½ÍÑÉ½¹œøñÍÁ…¸ù7­Í¥µ”ð½ÍÁ…¸øð½‘¥Øø(€€€€€€€€ñ‘¥ØøñÍÑÉ½¹œùíÑ½Ñ…±MÑ…ÑÌ¹™±…Í¡…É‘Íôð½ÍÑÉ½¹œøñÍÁ…¸ù±…Í¡…É‘Ìð½ÍÁ…¸øð½‘¥Øø(€€€€€€ð½Í•Ñ¥½¸ø((€€€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”õíÍÑå±•Ì¹É…‘•M•Ñ¥½¹ô¥ô‰­±…Í…Ðˆø(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹Í•Ñ¥½¹!•…‘¥¹ôø(€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”õíÍÑå±•Ì¹•å•‰É½Ýôù!…Á¤¤Á…Ë¬ð½ÍÁ…¸ø(€€€€€€€€€€ñ Èùi©¥‘ ­±…Ï­¸ð½ Èø(€€€€€€€€€€ñÀùA…Í¤Ñ„é©•‘£­Í °é©•‘¡©„ÉÕ¡•Ð‘¡”Í¡™…Å•¸Ó¬©¥Ñ¡„³­¹“­Ð¸ð½Àø(€€€€€€€€ð½‘¥Øø(€€€€€€€í•ÉÉ½È€˜˜€ñ‘¥Ø±…ÍÍ9…µ”ô‰•ÉÉ½Èµ‰½àˆùí•ÉÉ½Éôð½‘¥Øùô(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹É…‘•É¥‘ôø(€€€€€€€€€íÉ…‘•Ì¹µ…À ¡É…‘”¤€ôøì(€€€€€€€€€€€½¹ÍÐÍÑ…ÑÌ€ô•ÑÉ…‘•MÑ…ÑÌ¡É…‘”¤ì(€€€€€€€€€€€É•ÑÕÉ¸€ (€€€€€€€€€€€€€€ñ…ÉÑ¥±”±…ÍÍ9…µ”õíÍÑå±•Ì¹É…‘•…É‘ô­•äõíÉ…‘”¹}¥‘ôø(€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”õíÍÑå±•Ì¹É…‘•9Õµ‰•ÉôùíÉ…‘”¹É…‘•9Õµ‰•Éôð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€ñ ÌùíÉ…‘”¹Ñ¥Ñ±•ôð½ Ìø(€€€€€€€€€€€€€€€€ñÀùíÉ…‘”¹Í¡½ÉÑ•ÍÉ¥ÁÑ¥½¹ôð½Àø(€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”õíÍÑå±•Ì¹É…‘•5•Ñ…ôø(€€€€€€€€€€€€€€€€€€ñÍÁ…¸øñˆùíÍÑ…ÑÌ¹ÍÕ‰©•Ñ½Õ¹Ñôð½ˆø³­¹“¬ð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€€ñÍÁ…¸øñˆùíÍÑ…ÑÌ¹™±…Í¡…É‘½Õ¹Ñôð½ˆø™±…Í¡…É‘Ìð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÍ9…µ”õíÍÑå±•Ì¹É…‘•=Á•¹ô½¹±¥¬õì ¤€ôø¡½½Í•É…‘”¡É…‘”¥ôù!…Á”íÉ…‘”¹Ñ¥Ñ±•ôð½‰ÕÑÑ½¸ø(€€€€€€€€€€€€€€ð½…ÉÑ¥±”ø(€€€€€€€€€€€€¤ì(€€€€€€€€€ô¥ô(€€€€€€€€ð½‘¥Øø(€€€€€€ð½Í•Ñ¥½¸ø(€€€€ð½µ…¥¸ø(€€¤ì)ô(