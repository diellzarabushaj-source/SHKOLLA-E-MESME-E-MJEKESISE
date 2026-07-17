"use client";

import { useEffect, useRef, useState } from "react";
import {
  completeStudySession,
  getSignedInUser,
  recordCardReview,
  startStudySession,
  type ProgressRating,
  type RatingCounts,
  type StudyContext,
} from "@/lib/progress/client";

const GUEST_PROGRESS_KEY = "medical-portal-guest-progress-v1";
const emptyCounts = (): RatingCounts => ({ again: 0, hard: 0, good: 0, easy: 0 });

type SyncState = "idle" | "guest" | "syncing" | "saved" | "error";

type StudySnapshot = {
  context: StudyContext;
  contextKey: string;
  flashcardId: string;
  currentCard: number;
  totalCards: number;
};

function cleanText(value: string | null | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}

function getDataSnapshot(): StudySnapshot | null {
  const flashcard = document.querySelector<HTMLElement>(".flashcard[data-progress-flashcard-id]");
  if (!flashcard) return null;

  const gradeId = flashcard.dataset.progressGradeId;
  const subjectId = flashcard.dataset.progressSubjectId;
  const chapterId = flashcard.dataset.progressChapterId;
  const lessonId = flashcard.dataset.progressLessonId;
  const flashcardId = flashcard.dataset.progressFlashcardId;

  if (!gradeId || !subjectId || !chapterId || !lessonId || !flashcardId) return null;

  const currentCard = positiveNumber(flashcard.dataset.progressCurrentCard, 1);
  const totalCards = positiveNumber(flashcard.dataset.progressTotalCards, currentCard);
  const context: StudyContext = { gradeId, subjectId, chapterId, lessonId };

  return {
    context,
    contextKey: [gradeId, subjectId, chapterId, lessonId].join("::"),
    flashcardId,
    currentCard,
    totalCards,
  };
}

function getLegacySnapshot(): StudySnapshot | null {
  const hierarchy = document.querySelector('[class*="hierarchy"]');
  const labels = hierarchy
    ? Array.from(hierarchy.querySelectorAll("button")).map((button) => cleanText(button.textContent))
    : [];

  if (labels.length < 5) return null;

  const question = cleanText(
    document.querySelector(".answer-question")?.textContent ||
    document.querySelector(".flashcard-front > strong")?.textContent,
  );
  if (!question) return null;

  const counter = cleanText(document.querySelector(".study-context strong")?.textContent);
  const numbers = counter.match(/\d+/g)?.map(Number) || [];
  const currentCard = numbers[0] || 1;
  const totalCards = numbers[1] || currentCard;

  const context: StudyContext = {
    gradeId: labels[1],
    subjectId: labels[2],
    chapterId: labels[3],
    lessonId: labels[4],
  };
  const contextKey = [context.gradeId, context.subjectId, context.chapterId, context.lessonId].join("::");

  return {
    context,
    contextKey,
    flashcardId: `${contextKey}::${question}`,
    currentCard,
    totalCards,
  };
}

function getStudySnapshot(): StudySnapshot | null {
  return getDataSnapshot() || getLegacySnapshot();
}

function saveGuestReview(snapshot: StudySnapshot, rating: ProgressRating): void {
  try {
    const raw = window.localStorage.getItem(GUEST_PROGRESS_KEY);
    const current = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    current[snapshot.flashcardId] = {
      gradeId: snapshot.context.gradeId,
      subjectId: snapshot.context.subjectId,
      chapterId: snapshot.context.chapterId,
      lessonId: snapshot.context.lessonId,
      flashcardId: snapshot.flashcardId,
      rating,
      reviewedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(current));
  } catch {
    // Guest study remains usable even when storage is blocked by the browser.
  }
}

function ratingFromElement(element: Element): ProgressRating | null {
  if (element.closest(".rating-again")) return "again";
  if (element.closest(".rating-hard")) return "hard";
  if (element.closest(".rating-good")) return "good";
  if (element.closest(".rating-easy")) return "easy";
  return null;
}

export default function ProgressTracker() {
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const signedInRef = useRef(false);
  const authCheckedRef = useRef(false);
  const sessionRef = useRef<{ contextKey: string; id: string } | null>(null);
  const countsRef = useRef<RatingCounts>(emptyCounts());
  const revealStartedAtRef = useRef<number>(Date.now());
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const savedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    void getSignedInUser().then((user) => {
      signedInRef.current = Boolean(user);
      authCheckedRef.current = true;
      setSyncState(user ? "idle" : "guest");
    });
  }, []);

  useEffect(() => {
    function showSavedTemporarily() {
      setSyncState("saved");
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
      savedTimerRef.current = window.setTimeout(() => setSyncState("idle"), 2200);
    }

    async function ensureAuthState(): Promise<boolean> {
      if (authCheckedRef.current) return signedInRef.current;
      const user = await getSignedInUser();
      signedInRef.current = Boolean(user);
      authCheckedRef.current = true;
      return signedInRef.current;
    }

    async function finishCurrentSession(): Promise<void> {
      if (!sessionRef.current) return;
      await completeStudySession(sessionRef.current.id, countsRef.current);
      sessionRef.current = null;
      countsRef.current = emptyCounts();
    }

    async function persistRating(snapshot: StudySnapshot, rating: ProgressRating) {
      const isSignedIn = await ensureAuthState();
      if (!isSignedIn) {
        saveGuestReview(snapshot, rating);
        setSyncState("guest");
        return;
      }

      setSyncState("syncing");
      try {
        if (sessionRef.current && sessionRef.current.contextKey !== snapshot.contextKey) {
          await finishCurrentSession();
        }

        if (!sessionRef.current) {
          const id = await startStudySession(snapshot.context, snapshot.totalCards);
          sessionRef.current = { contextKey: snapshot.contextKey, id };
          countsRef.current = emptyCounts();
        }

        const nextCounts = { ...countsRef.current, [rating]: countsRef.current[rating] + 1 };
        const responseTimeMs = Math.max(0, Date.now() - revealStartedAtRef.current);

        await recordCardReview({
          sessionId: sessionRef.current.id,
          context: snapshot.context,
          flashcardId: snapshot.flashcardId,
          rating,
          responseTimeMs,
        });

        countsRef.current = nextCounts;
        if (snapshot.currentCard >= snapshot.totalCards) {
          await finishCurrentSession();
        }
        showSavedTemporarily();
      } catch (error) {
        console.error("Progress sync failed", error);
        setSyncState("error");
      }
    }

    function enqueueRating(rating: ProgressRating) {
      const snapshot = getStudySnapshot();
      if (!snapshot) return;
      queueRef.current = queueRef.current.then(() => persistRating(snapshot, rating));
    }

    function onClick(event: MouseEvent) {
      const element = event.target instanceof Element ? event.target : null;
      if (!element) return;

      const rating = ratingFromElement(element);
      if (rating) {
        enqueueRating(rating);
        return;
      }

      if (element.closest(".reveal-button") || element.closest(".flashcard:not(.is-flipped)")) {
        revealStartedAtRef.current = Date.now();
      }

      const button = element.closest("button");
      const label = cleanText(button?.textContent).toLocaleLowerCase("sq");
      if (label.includes("rifillo") || label === "përziej" || label === "përzieje") {
        queueRef.current = queueRef.current
          .then(() => finishCurrentSession())
          .catch((finishError) => {
            console.error("Study session close failed", finishError);
            sessionRef.current = null;
            countsRef.current = emptyCounts();
          });
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;

      if (event.code === "Space") revealStartedAtRef.current = Date.now();
      if (!document.querySelector(".rating-actions")) return;

      const ratingByKey: Record<string, ProgressRating> = {
        "1": "again",
        "2": "hard",
        "3": "good",
        "4": "easy",
      };
      const rating = ratingByKey[event.key];
      if (rating) enqueueRating(rating);
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKeyDown, true);
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    };
  }, []);

  if (syncState === "idle") return null;

  const label = syncState === "guest"
    ? "Mysafir · progresi ruhet në këtë pajisje"
    : syncState === "syncing"
      ? "Duke ruajtur progresin..."
      : syncState === "saved"
        ? "Progresi u ruajt"
        : "Progresi nuk u sinkronizua";

  return (
    <div className={`progress-sync-badge progress-sync-${syncState}`} role="status" aria-live="polite">
      <span aria-hidden="true" />
      {label}
    </div>
  );
}
