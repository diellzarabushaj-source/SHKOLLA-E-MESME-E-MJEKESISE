"use client";

import { useEffect, useRef } from "react";
import { markLessonOpened, sendActivityHeartbeat, type StudyContext } from "@/lib/progress/client";

const HEARTBEAT_MS = 15000;
const ACTIVE_WINDOW_MS = 5 * 60_000;

function currentContext(): { type: "app" | "lesson" | "flashcards"; context?: StudyContext; scroll: number } {
  const flashcard = document.querySelector<HTMLElement>(".flashcard[data-progress-flashcard-id]");
  if (flashcard) {
    const { progressGradeId: gradeId, progressSubjectId: subjectId, progressChapterId: chapterId, progressLessonId: lessonId } = flashcard.dataset;
    if (gradeId && subjectId && chapterId && lessonId) return { type: "flashcards", context: { gradeId, subjectId, chapterId, lessonId }, scroll: 100 };
  }

  const lessonPage = document.querySelector<HTMLElement>('[data-progress-page="lesson"]');
  if (lessonPage) {
    const { progressGradeId: gradeId, progressSubjectId: subjectId, progressChapterId: chapterId, progressLessonId: lessonId } = lessonPage.dataset;
    if (gradeId && subjectId && chapterId && lessonId) {
      const documentHeight = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const scroll = Math.min(100, Math.max(0, Math.round((window.scrollY / documentHeight) * 100)));
      return { type: "lesson", context: { gradeId, subjectId, chapterId, lessonId }, scroll };
    }
  }

  return { type: "app", scroll: 0 };
}

export default function LearningActivityTracker() {
  const lastActive = useRef(Date.now());
  const sessionId = useRef<string | undefined>(undefined);
  const sessionKey = useRef("");
  const openedLesson = useRef("");
  const busy = useRef(false);
  const lastTickAt = useRef(Date.now());

  useEffect(() => {
    const markActive = () => { lastActive.current = Date.now(); };
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "mousemove", "touchstart"];
    events.forEach((event) => window.addEventListener(event, markActive, { passive: true }));

    const resetTickClock = () => { lastTickAt.current = Date.now(); };

    const tick = async () => {
      const now = Date.now();
      let elapsedSeconds = Math.min(30, Math.max(0, Math.round((now - lastTickAt.current) / 1000)));
      lastTickAt.current = now;

      if (busy.current || document.visibilityState !== "visible" || now - lastActive.current > ACTIVE_WINDOW_MS) return;
      busy.current = true;
      try {
        const current = currentContext();
        const key = `${current.type}:${current.context?.gradeId || ""}:${current.context?.subjectId || ""}:${current.context?.chapterId || ""}:${current.context?.lessonId || ""}`;
        if (key !== sessionKey.current) {
          sessionId.current = undefined;
          sessionKey.current = key;
          elapsedSeconds = 0;
        }
        if (current.type === "lesson" && current.context && openedLesson.current !== key) {
          await markLessonOpened(current.context);
          openedLesson.current = key;
        }
        if (elapsedSeconds < 1) return;
        sessionId.current = await sendActivityHeartbeat({
          sessionId: sessionId.current,
          activityType: current.type,
          context: current.context,
          activeSeconds: elapsedSeconds,
          maxScrollPercent: current.scroll,
        });
      } catch (error) {
        if (!(error instanceof Error && error.message === "AUTH_REQUIRED")) console.error("Activity tracking failed", error);
      } finally {
        busy.current = false;
      }
    };

    const interval = window.setInterval(() => void tick(), HEARTBEAT_MS);
    document.addEventListener("visibilitychange", resetTickClock);
    void tick();
    return () => {
      window.clearInterval(interval);
      events.forEach((event) => window.removeEventListener(event, markActive));
      document.removeEventListener("visibilitychange", resetTickClock);
    };
  }, []);

  return null;
}
