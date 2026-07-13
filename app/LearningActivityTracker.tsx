"use client";

import { useEffect, useRef } from "react";
import { markLessonOpened, sendActivityHeartbeat, type StudyContext } from "@/lib/progress/client";

const HEARTBEAT_MS = 15000;
const ACTIVE_WINDOW_MS = 60000;

function text(element: Element | null): string {
  return (element?.textContent || "").replace(/\s+/g, " ").trim();
}

function currentContext(): { type: "app" | "lesson" | "flashcards"; context?: StudyContext; scroll: number } {
  const flashcard = document.querySelector<HTMLElement>(".flashcard[data-progress-flashcard-id]");
  if (flashcard) {
    const { progressGradeId: gradeId, progressSubjectId: subjectId, progressChapterId: chapterId, progressLessonId: lessonId } = flashcard.dataset;
    if (gradeId && subjectId && chapterId && lessonId) return { type: "flashcards", context: { gradeId, subjectId, chapterId, lessonId }, scroll: 100 };
  }

  const lessonBody = document.querySelector('[class*="lessonBody"]');
  if (lessonBody) {
    const hierarchy = document.querySelector('[class*="hierarchy"]');
    const labels = hierarchy ? Array.from(hierarchy.querySelectorAll("button, span")).map(text).filter((item) => item && item !== "/") : [];
    if (labels.length >= 5) {
      const documentHeight = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const scroll = Math.min(100, Math.max(0, Math.round((window.scrollY / documentHeight) * 100)));
      return { type: "lesson", context: { gradeId: labels[1], subjectId: labels[2], chapterId: labels[3], lessonId: labels[4] }, scroll };
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

  useEffect(() => {
    const markActive = () => { lastActive.current = Date.now(); };
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "mousemove", "touchstart"];
    events.forEach((event) => window.addEventListener(event, markActive, { passive: true }));

    const tick = async () => {
      if (busy.current || document.visibilityState !== "visible" || Date.now() - lastActive.current > ACTIVE_WINDOW_MS) return;
      busy.current = true;
      try {
        const current = currentContext();
        const key = `${current.type}:${current.context?.gradeId || ""}:${current.context?.subjectId || ""}:${current.context?.chapterId || ""}:${current.context?.lessonId || ""}`;
        if (key !== sessionKey.current) {
          sessionId.current = undefined;
          sessionKey.current = key;
        }
        if (current.type === "lesson" && current.context && openedLesson.current !== key) {
          await markLessonOpened(current.context);
          openedLesson.current = key;
        }
        sessionId.current = await sendActivityHeartbeat({
          sessionId: sessionId.current,
          activityType: current.type,
          context: current.context,
          activeSeconds: HEARTBEAT_MS / 1000,
          maxScrollPercent: current.scroll,
        });
      } catch (error) {
        if (!(error instanceof Error && error.message === "AUTH_REQUIRED")) console.error("Activity tracking failed", error);
      } finally {
        busy.current = false;
      }
    };

    const interval = window.setInterval(() => void tick(), HEARTBEAT_MS);
    void tick();
    return () => {
      window.clearInterval(interval);
      events.forEach((event) => window.removeEventListener(event, markActive));
    };
  }, []);

  return null;
}
