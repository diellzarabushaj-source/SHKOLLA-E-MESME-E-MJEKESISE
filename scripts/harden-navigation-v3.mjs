import { readFileSync, writeFileSync } from "node:fs";

const portalPath = "app/SchoolLearningPortal.tsx";
let source = readFileSync(portalPath, "utf8");

function replaceRequired(label, pattern, replacement) {
  if (!pattern.test(source)) throw new Error(`${label}: expected generated portal pattern was not found`);
  pattern.lastIndex = 0;
  source = source.replace(pattern, replacement);
}

replaceRequired(
  "classes hash must override saved grade",
  /      const savedId = window\.localStorage\.getItem\(SELECTED_GRADE_KEY\);\n      const gradeId = selectedGradeRef\.current\?\._id \|\| savedId;/,
  `      const classesRequested = window.location.hash === "#klasat";
      if (classesRequested) window.localStorage.removeItem(SELECTED_GRADE_KEY);
      const savedId = classesRequested ? null : window.localStorage.getItem(SELECTED_GRADE_KEY);
      const gradeId = classesRequested ? null : selectedGradeRef.current?._id || savedId;`,
);

replaceRequired(
  "URL history parser",
  /  function portalHistoryUrl\(state: PortalHistoryState, hash = ""\): string \{[\s\S]*?\n  \}\n\n  function announcePortalNavigation/,
  `  function portalHistoryUrl(state: PortalHistoryState, hash = ""): string {
    const params = new URLSearchParams();
    if (state.gradeId) params.set("grade", state.gradeId);
    if (state.subjectId) params.set("subject", state.subjectId);
    if (state.chapterId) params.set("chapter", state.chapterId);
    if (state.lessonId) params.set("lesson", state.lessonId);
    if (state.studyKind) params.set("study", state.studyKind);
    const query = params.toString();
    return (query ? "/?" + query : "/") + hash;
  }

  function portalHistoryStateFromUrl(): PortalHistoryState | null {
    const params = new URLSearchParams(window.location.search);
    const gradeId = params.get("grade") || undefined;
    const subjectId = params.get("subject") || undefined;
    const chapterId = params.get("chapter") || undefined;
    const lessonId = params.get("lesson") || undefined;
    const rawStudy = params.get("study");
    const studyKind = rawStudy === "lesson" || rawStudy === "chapter" ? rawStudy : undefined;
    if (!gradeId && !subjectId && !chapterId && !lessonId && !studyKind) return null;
    return { __medicalPortal: true, gradeId, subjectId, chapterId, lessonId, studyKind };
  }

  function announcePortalNavigation`,
);

replaceRequired(
  "complete browser history restoration",
  /  async function restorePortalHistory\(state: PortalHistoryState\) \{[\s\S]*?\n  \}\n\n  useEffect\(\(\) => \{\n    if \(loading \|\| historyReadyRef\.current\) return;[\s\S]*?\n  \}, \[loading\]\);/,
  `  async function restorePortalHistory(state: PortalHistoryState) {
    restoringHistoryRef.current = true;
    setError("");
    try {
      const grade = state.gradeId ? grades.find((item) => item._id === state.gradeId) || null : null;
      const subject = state.subjectId ? grade?.subjects.find((item) => item._id === state.subjectId) || null : null;
      const chapter = state.chapterId ? subject?.chapters.find((item) => item._id === state.chapterId) || null : null;
      const lessonSummary = state.lessonId ? chapter?.lessons.find((item) => item._id === state.lessonId) || null : null;
      let lesson = lessonSummary;

      if (lessonSummary) {
        try {
          const details = await freshClient.fetch<Lesson | null>(
            lessonDetailsQuery,
            { lessonId: lessonSummary._id },
            { perspective: "published" },
          );
          lesson = details || lessonSummary;
        } catch (fetchError) {
          console.error("History lesson refresh failed", fetchError);
          setError("Mësimi u rikthye, por përmbajtja e plotë nuk mund të rifreskohej. Provo përsëri.");
        }
      }

      const validStudyKind = state.studyKind === "chapter" && chapter
        ? "chapter"
        : state.studyKind === "lesson" && chapter && lesson
          ? "lesson"
          : undefined;
      const normalizedState: PortalHistoryState = {
        __medicalPortal: true,
        gradeId: grade?._id,
        subjectId: subject?._id,
        chapterId: chapter?._id,
        lessonId: lesson?._id,
        studyKind: validStudyKind,
        studyTitle: validStudyKind ? state.studyTitle : undefined,
      };
      const classesHash = !grade && window.location.hash === "#klasat" ? "#klasat" : "";
      window.history.replaceState(normalizedState, "", portalHistoryUrl(normalizedState, classesHash));

      if (grade) window.localStorage.setItem(SELECTED_GRADE_KEY, grade._id);
      else window.localStorage.removeItem(SELECTED_GRADE_KEY);

      setSelectedGrade(grade);
      setSelectedSubject(subject);
      setSelectedChapter(chapter);
      setSelectedLesson(lesson);
      selectedGradeRef.current = grade;
      selectedSubjectRef.current = subject;
      selectedChapterRef.current = chapter;
      selectedLessonRef.current = lesson;
      setSearch("");
      resetStudy();

      if (validStudyKind && chapter) {
        await loadStudyScope({
          kind: validStudyKind,
          title: state.studyTitle || (lesson?.title ?? chapter.title),
          chapter,
          lesson: validStudyKind === "lesson" ? lesson || undefined : undefined,
        }, false);
      } else if (classesHash) {
        window.requestAnimationFrame(() => document.getElementById("klasat")?.scrollIntoView({ block: "start" }));
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
    const existingHasLocation = Boolean(
      existing?.__medicalPortal
        && (existing.gradeId || existing.subjectId || existing.chapterId || existing.lessonId || existing.studyKind),
    );
    const fromUrl = portalHistoryStateFromUrl();
    const initialState = existingHasLocation ? existing : fromUrl;
    if (initialState) {
      void restorePortalHistory(initialState);
      return;
    }

    const classesHash = window.location.hash === "#klasat" ? "#klasat" : "";
    pushPortalHistory(currentPortalHistoryState(), { replace: true, hash: classesHash });
    if (classesHash) {
      window.requestAnimationFrame(() => document.getElementById("klasat")?.scrollIntoView({ block: "start" }));
    }
  }, [loading]);`,
);

// Every portal control is an in-page action. Explicit button types prevent a future
// surrounding form from turning navigation controls into accidental submissions.
source = source.replace(/<button\b([^>]*)>/g, (tag, attributes) => {
  if (/\btype\s*=/.test(attributes)) return tag;
  return `<button type="button"${attributes}>`;
});

writeFileSync(portalPath, source);
console.log(`Hardened ${portalPath} for direct links, Back/Forward, Home, Classes and safe buttons.`);
