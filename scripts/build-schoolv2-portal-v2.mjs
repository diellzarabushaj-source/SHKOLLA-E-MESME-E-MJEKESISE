import { readFileSync, writeFileSync } from "node:fs";

const sourcePath = "app/ClassicLearningPortal.tsx";
const outputPath = "app/SchoolLearningPortal.tsx";
// Normalize checkout line endings so the generator behaves identically on Windows and CI.
let source = readFileSync(sourcePath, "utf8").replace(/\r\n?/g, "\n");

function replacePattern(label, pattern, replacement) {
  const matches = source.match(pattern);
  if (!matches) throw new Error(`${label}: source pattern was not found`);
  source = source.replace(pattern, replacement);
}

replacePattern(
  "flashcard data types",
  /type Flashcard = \{[\s\S]*?\n\};\n\ntype Lesson =/,
  `type Flashcard = {
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

type EmbeddedFlashcard = {
  _key: string;
  title?: string;
  front: string;
  back: string;
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
  image?: SanityImage;
  imageSide?: "front" | "back" | "both";
};

type LessonDeck = {
  _id: string;
  title: string;
  cards?: EmbeddedFlashcard[];
};

type Lesson =`,
);

replacePattern(
  "Sanity client",
  /const client = createClient\(\{[\s\S]*?\n\}\);/,
  `const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "e1tm3f7l",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET_V2 || "schoolv2",
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-07-17",
  useCdn: true,
});`,
);

const optimizedDataLayer = `const portalQuery = \`
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
                "flashcardCount": count(flashcards[isActive != false])
              }
          }
      }
  }
\`;

const lessonDetailsQuery = \`
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
\`;

const lessonCardsQuery = \`
  *[_type == "lesson" && _id == $lessonId && isActive != false] {
    _id,
    title,
    "cards": flashcards[isActive != false] | order(order asc) {
      _key,
      title,
      front,
      back,
      explanation,
      difficulty,
      tags,
      imageSide,
      image { alt, caption, "asset": asset->{url} }
    }
  }
\`;

const chapterCardsQuery = \`
  *[_type == "lesson" && chapter._ref == $chapterId && isActive != false]
  | order(order asc, title asc) {
    _id,
    title,
    "cards": flashcards[isActive != false] | order(order asc) {
      _key,
      title,
      front,
      back,
      explanation,
      difficulty,
      tags,
      imageSide,
      image { alt, caption, "asset": asset->{url} }
    }
  }
\`;

function normalizeCards(decks: LessonDeck[]): Flashcard[] {
  return decks.flatMap((lesson) =>
    (lesson.cards || []).map((card) => ({
      _id: lesson._id + "." + card._key,
      title: card.title,
      front: card.front,
      back: card.back,
      explanation: card.explanation,
      difficulty: card.difficulty,
      tags: card.tags,
      image: card.image,
      imageSide: card.imageSide,
      lessonId: lesson._id,
      lessonTitle: lesson.title,
    })),
  );
}`;

replacePattern(
  "Sanity data layer",
  /const portalQuery = `[\s\S]*?(?=function safePortableHref)/,
  optimizedDataLayer + "\n\n",
);

replacePattern(
  "lazy lesson loading",
  /  function chooseLesson\(lesson: Lesson\) \{[\s\S]*?\n  \}\n\n  async function startTest/,
  `  async function chooseLesson(lesson: Lesson) {
    setLoading(true);
    setError("");
    resetStudy();

    try {
      const details = await client.fetch<Lesson | null>(
        lessonDetailsQuery,
        { lessonId: lesson._id },
        { perspective: "published" },
      );
      setSelectedLesson(details || lesson);
      pushPortalHistory({
        __medicalPortal: true,
        gradeId: selectedGrade?._id,
        subjectId: selectedSubject?._id,
        chapterId: selectedChapter?._id,
        lessonId: lesson._id,
      });
    } catch (fetchError) {
      console.error(fetchError);
      setSelectedLesson(lesson);
      setError("Mësimi nuk mund të ngarkohej plotësisht. Provo përsëri.");
      pushPortalHistory({
        __medicalPortal: true,
        gradeId: selectedGrade?._id,
        subjectId: selectedSubject?._id,
        chapterId: selectedChapter?._id,
        lessonId: lesson._id,
      });
    } finally {
      setLoading(false);
    }

    scrollTop();
  }

  async function startTest`,
);

replacePattern(
  "embedded deck loading",
  /      const result = await client\.fetch<Flashcard\[\]>\(query, params, \{ perspective: "published" \}\);\n      setCards\(result\);/,
  `      const result = await client.fetch<LessonDeck[]>(query, params, { perspective: "published" });
      setCards(normalizeCards(result));`,
);

replacePattern(
  "portal history type",
  /type StudyScope = \{[\s\S]*?\n\};\n/,
  `type StudyScope = {
  kind: "lesson" | "chapter";
  title: string;
  chapter: Chapter;
  lesson?: Lesson;
};

type PortalHistoryState = {
  __medicalPortal: true;
  gradeId?: string;
  subjectId?: string;
  chapterId?: string;
  lessonId?: string;
  studyKind?: "lesson" | "chapter";
  studyTitle?: string;
};
`,
);

replacePattern(
  "portal history refs",
  /  const selectedLessonRef = useRef<Lesson \| null>\(null\);/,
  `  const selectedLessonRef = useRef<Lesson | null>(null);
  const historyReadyRef = useRef(false);
  const restoringHistoryRef = useRef(false);`,
);

replacePattern(
  "portal history helpers",
  /  function resetStudy\(\) \{[\s\S]*?\n  \}\n\n  function chooseGrade/,
  `  function resetStudy() {
    setStudying(false);
    setStudyScope(null);
    setCards([]);
    setCardIndex(0);
    setRevealed(false);
    setFinished(false);
    setRatings(emptyRatings);
  }

  function currentPortalHistoryState(): PortalHistoryState {
    return {
      __medicalPortal: true,
      gradeId: selectedGrade?._id,
      subjectId: selectedSubject?._id,
      chapterId: selectedChapter?._id,
      lessonId: selectedLesson?._id,
      studyKind: studying ? studyScope?.kind : undefined,
      studyTitle: studying ? studyScope?.title : undefined,
    };
  }

  function portalHistoryUrl(state: PortalHistoryState, hash = ""): string {
    const params = new URLSearchParams();
    if (state.gradeId) params.set("grade", state.gradeId);
    if (state.subjectId) params.set("subject", state.subjectId);
    if (state.chapterId) params.set("chapter", state.chapterId);
    if (state.lessonId) params.set("lesson", state.lessonId);
    if (state.studyKind) params.set("study", state.studyKind);
    const query = params.toString();
    return (query ? "/?" + query : "/") + hash;
  }

  function announcePortalNavigation() {
    window.dispatchEvent(new CustomEvent("medical-portal:navigation"));
  }

  function pushPortalHistory(state: PortalHistoryState, options?: { replace?: boolean; hash?: string }) {
    if (restoringHistoryRef.current) return;
    const method = options?.replace ? "replaceState" : "pushState";
    window.history[method](state, "", portalHistoryUrl(state, options?.hash));
    announcePortalNavigation();
  }

  function chooseGrade`,
);

replacePattern(
  "choose grade history",
  /  function chooseGrade\(grade: Grade\) \{[\s\S]*?\n  \}\n\n  function changeGrade/,
  `  function chooseGrade(grade: Grade) {
    window.localStorage.setItem(SELECTED_GRADE_KEY, grade._id);
    setSelectedGrade(grade);
    setSelectedSubject(null);
    setSelectedChapter(null);
    setSelectedLesson(null);
    setSearch("");
    resetStudy();
    pushPortalHistory({ __medicalPortal: true, gradeId: grade._id });
    scrollTop();
  }

  function changeGrade`,
);

replacePattern(
  "change grade history",
  /  function changeGrade\(\) \{[\s\S]*?\n  \}\n\n  function goToGrade/,
  `  function changeGrade() {
    window.localStorage.removeItem(SELECTED_GRADE_KEY);
    setSelectedGrade(null);
    setSelectedSubject(null);
    setSelectedChapter(null);
    setSelectedLesson(null);
    setSearch("");
    resetStudy();
    pushPortalHistory({ __medicalPortal: true });
    scrollTop();
  }

  function goToGrade`,
);

replacePattern(
  "go to grade history",
  /  function goToGrade\(\) \{[\s\S]*?\n  \}\n\n  function goToSubject/,
  `  function goToGrade() {
    setSelectedSubject(null);
    setSelectedChapter(null);
    setSelectedLesson(null);
    resetStudy();
    pushPortalHistory({ __medicalPortal: true, gradeId: selectedGrade?._id });
    scrollTop();
  }

  function goToSubject`,
);

replacePattern(
  "go to subject history",
  /  function goToSubject\(\) \{[\s\S]*?\n  \}\n\n  function goToChapter/,
  `  function goToSubject() {
    setSelectedChapter(null);
    setSelectedLesson(null);
    resetStudy();
    pushPortalHistory({
      __medicalPortal: true,
      gradeId: selectedGrade?._id,
      subjectId: selectedSubject?._id,
    });
    scrollTop();
  }

  function goToChapter`,
);

replacePattern(
  "go to chapter history",
  /  function goToChapter\(\) \{[\s\S]*?\n  \}\n\n  function chooseSubject/,
  `  function goToChapter() {
    setSelectedLesson(null);
    resetStudy();
    pushPortalHistory({
      __medicalPortal: true,
      gradeId: selectedGrade?._id,
      subjectId: selectedSubject?._id,
      chapterId: selectedChapter?._id,
    });
    scrollTop();
  }

  function chooseSubject`,
);

replacePattern(
  "choose subject history",
  /  function chooseSubject\(subject: Subject\) \{[\s\S]*?\n  \}\n\n  function chooseChapter/,
  `  function chooseSubject(subject: Subject) {
    setSelectedSubject(subject);
    setSelectedChapter(null);
    setSelectedLesson(null);
    resetStudy();
    pushPortalHistory({
      __medicalPortal: true,
      gradeId: selectedGrade?._id,
      subjectId: subject._id,
    });
    scrollTop();
  }

  function chooseChapter`,
);

replacePattern(
  "choose chapter history",
  /  function chooseChapter\(chapter: Chapter\) \{[\s\S]*?\n  \}\n\n  function applySavedLesson/,
  `  function chooseChapter(chapter: Chapter) {
    setSelectedChapter(chapter);
    setSelectedLesson(null);
    resetStudy();
    pushPortalHistory({
      __medicalPortal: true,
      gradeId: selectedGrade?._id,
      subjectId: selectedSubject?._id,
      chapterId: chapter._id,
    });
    scrollTop();
  }

  function applySavedLesson`,
);

replacePattern(
  "study history",
  /  async function startTest\(scope: StudyScope\) \{[\s\S]*?\n  \}\n\n  function rateCard/,
  `  async function loadStudyScope(scope: StudyScope, recordHistory: boolean) {
    setSelectedChapter(scope.chapter);
    setSelectedLesson(scope.lesson || null);
    setStudyScope(scope);
    setLoading(true);
    setError("");

    try {
      const query = scope.kind === "lesson" ? lessonCardsQuery : chapterCardsQuery;
      const params = scope.kind === "lesson" ? { lessonId: scope.lesson?._id } : { chapterId: scope.chapter._id };
      const result = await client.fetch<LessonDeck[]>(query, params, { perspective: "published" });
      setCards(normalizeCards(result));
      setCardIndex(0);
      setRevealed(false);
      setFinished(false);
      setRatings(emptyRatings);
      setStudying(true);
      if (recordHistory) {
        pushPortalHistory({
          __medicalPortal: true,
          gradeId: selectedGrade?._id,
          subjectId: selectedSubject?._id,
          chapterId: scope.chapter._id,
          lessonId: scope.lesson?._id,
          studyKind: scope.kind,
          studyTitle: scope.title,
        });
      }
    } catch (fetchError) {
      console.error(fetchError);
      setError("Flashcards nuk mund të ngarkoheshin.");
      setStudying(false);
    } finally {
      setLoading(false);
    }

    scrollTop();
  }

  async function startTest(scope: StudyScope) {
    await loadStudyScope(scope, true);
  }

  function exitStudy() {
    resetStudy();
    pushPortalHistory({
      __medicalPortal: true,
      gradeId: selectedGrade?._id,
      subjectId: selectedSubject?._id,
      chapterId: selectedChapter?._id,
      lessonId: selectedLesson?._id,
    });
    scrollTop();
  }

  function rateCard`,
);

source = source.replaceAll("onClick={resetStudy}", "onClick={exitStudy}");

replacePattern(
  "browser and global navigation effects",
  /  useEffect\(\(\) => \{\n    function onKeyDown\(event: KeyboardEvent\) \{/,
  `  async function restorePortalHistory(state: PortalHistoryState) {
    restoringHistoryRef.current = true;
    try {
      const grade = state.gradeId ? grades.find((item) => item._id === state.gradeId) || null : null;
      const subject = state.subjectId ? grade?.subjects.find((item) => item._id === state.subjectId) || null : null;
      const chapter = state.chapterId ? subject?.chapters.find((item) => item._id === state.chapterId) || null : null;
      const lesson = state.lessonId ? chapter?.lessons.find((item) => item._id === state.lessonId) || null : null;

      if (grade) window.localStorage.setItem(SELECTED_GRADE_KEY, grade._id);
      else window.localStorage.removeItem(SELECTED_GRADE_KEY);

      setSelectedGrade(grade);
      setSelectedSubject(subject);
      setSelectedChapter(chapter);
      setSelectedLesson(lesson);
      setSearch("");
      resetStudy();

      if (state.studyKind && chapter) {
        await loadStudyScope({
          kind: state.studyKind,
          title: state.studyTitle || (lesson?.title ?? chapter.title),
          chapter,
          lesson: state.studyKind === "lesson" ? lesson || undefined : undefined,
        }, false);
      } else {
        scrollTop();
      }
    } finally {
      window.setTimeout(() => {
        restoringHistoryRef.current = false;
        announcePortalNavigation();
      }, 0);
    }
  }

  useEffect(() => {
    if (loading || historyReadyRef.current) return;
    historyReadyRef.current = true;
    const existing = window.history.state as PortalHistoryState | null;
    if (existing?.__medicalPortal && (existing.subjectId || existing.chapterId || existing.lessonId || existing.studyKind)) {
      void restorePortalHistory(existing);
      return;
    }
    pushPortalHistory(currentPortalHistoryState(), { replace: true });
  }, [loading]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const state = event.state as PortalHistoryState | null;
      void restorePortalHistory(state?.__medicalPortal ? state : { __medicalPortal: true });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [grades]);

  useEffect(() => {
    const resetToHome = () => {
      window.localStorage.removeItem(SELECTED_GRADE_KEY);
      setSelectedGrade(null);
      setSelectedSubject(null);
      setSelectedChapter(null);
      setSelectedLesson(null);
      setSearch("");
      resetStudy();
      pushPortalHistory({ __medicalPortal: true });
      scrollTop();
    };
    const resetToClasses = () => {
      window.localStorage.removeItem(SELECTED_GRADE_KEY);
      setSelectedGrade(null);
      setSelectedSubject(null);
      setSelectedChapter(null);
      setSelectedLesson(null);
      setSearch("");
      resetStudy();
      pushPortalHistory({ __medicalPortal: true }, { hash: "#klasat" });
      window.requestAnimationFrame(() => document.getElementById("klasat")?.scrollIntoView({ block: "start" }));
    };
    window.addEventListener("medical-portal:home", resetToHome);
    window.addEventListener("medical-portal:classes", resetToClasses);
    return () => {
      window.removeEventListener("medical-portal:home", resetToHome);
      window.removeEventListener("medical-portal:classes", resetToClasses);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {`,
);

source = source.replace(
  `"use client";`,
  `"use client";\n\n// Generated from ClassicLearningPortal.tsx. Keep all UI changes in the template file.`,
);

writeFileSync(outputPath, source);
console.log(`Generated ${outputPath} with optimized data and safe browser navigation.`);
