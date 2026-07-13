"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchReviewSchedule, type ProgressRating } from "@/lib/progress/client";

const ACTIVE_WINDOW_MS = 60_000;
const STORAGE_KEY = "medical-portal-active-session-seconds";
const REVIEW_RATINGS: ProgressRating[] = ["again", "hard", "good", "easy"];

function formatTimer(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function normalizedButtonLabel(button: HTMLButtonElement): string {
  return (button.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("sq");
}

function isFlashcardLaunchButton(button: HTMLButtonElement): boolean {
  const label = normalizedButtonLabel(button);
  return (
    label.includes("hape flashcards") ||
    label.includes("testo mësimin") ||
    label.includes("testo krejt kapitullin") ||
    label.includes("përsëriti") && label.includes("kartel")
  );
}

function ratingButton(rating: ProgressRating): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(`.rating-${rating}`);
}

export default function InteractionEnhancements() {
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [isCounting, setIsCounting] = useState(true);
  const lastActiveRef = useRef(Date.now());
  const previewRequestRef = useRef(0);

  useEffect(() => {
    try {
      const saved = Number(window.sessionStorage.getItem(STORAGE_KEY));
      if (Number.isFinite(saved) && saved > 0) setActiveSeconds(Math.floor(saved));
    } catch {
      // The timer still works when session storage is unavailable.
    }
  }, []);

  useEffect(() => {
    const enhanceButtons = () => {
      document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
        button.classList.toggle("flashcard-launch-button", isFlashcardLaunchButton(button));
      });
    };

    const syncStudyMode = () => {
      const studyPage = document.querySelector(".study-page");
      document.body.classList.toggle("flashcard-study-active", Boolean(studyPage));
    };

    const enhanceReviewIntervals = async () => {
      const flashcard = document.querySelector<HTMLElement>(".flashcard[data-progress-flashcard-id]");
      const actions = document.querySelector<HTMLElement>(".rating-actions");
      const flashcardId = flashcard?.dataset.progressFlashcardId;
      if (!flashcardId || !actions) return;
      if (actions.dataset.scheduleFor === flashcardId || actions.dataset.scheduleLoading === flashcardId) return;

      actions.dataset.scheduleLoading = flashcardId;
      const requestId = ++previewRequestRef.current;

      try {
        const schedule = await fetchReviewSchedule(flashcardId);
        const currentCard = document.querySelector<HTMLElement>(".flashcard[data-progress-flashcard-id]");
        const currentActions = document.querySelector<HTMLElement>(".rating-actions");
        if (
          requestId !== previewRequestRef.current ||
          currentCard?.dataset.progressFlashcardId !== flashcardId ||
          currentActions !== actions
        ) return;

        REVIEW_RATINGS.forEach((rating) => {
          const label = ratingButton(rating)?.querySelector<HTMLElement>("span");
          if (label) label.textContent = schedule[rating].label;
        });
        actions.dataset.scheduleFor = flashcardId;
      } catch {
        // Guests keep the built-in learning-step labels; signed-in users receive backend previews.
      } finally {
        delete actions.dataset.scheduleLoading;
      }
    };

    let scheduled = false;
    const refresh = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        syncStudyMode();
        enhanceButtons();
        void enhanceReviewIntervals();
      });
    };

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    refresh();

    return () => {
      observer.disconnect();
      previewRequestRef.current += 1;
      document.body.classList.remove("flashcard-study-active");
    };
  }, []);

  useEffect(() => {
    const markActive = () => {
      lastActiveRef.current = Date.now();
      if (document.visibilityState === "visible") setIsCounting(true);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        lastActiveRef.current = Date.now();
        setIsCounting(true);
      } else {
        setIsCounting(false);
      }
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "scroll",
      "mousemove",
      "touchstart",
    ];

    activityEvents.forEach((eventName) => window.addEventListener(eventName, markActive, { passive: true }));
    document.addEventListener("visibilitychange", onVisibilityChange);

    const timer = window.setInterval(() => {
      const active = document.visibilityState === "visible" && Date.now() - lastActiveRef.current <= ACTIVE_WINDOW_MS;
      setIsCounting(active);
      if (!active) return;

      setActiveSeconds((current) => {
        const next = current + 1;
        if (next % 5 === 0) {
          try {
            window.sessionStorage.setItem(STORAGE_KEY, String(next));
          } catch {
            // Ignore blocked storage; active-time tracking continues in memory.
          }
        }
        return next;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActive));
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const timerLabel = useMemo(() => formatTimer(activeSeconds), [activeSeconds]);

  return (
    <aside className={`active-session-timer ${isCounting ? "is-active" : "is-paused"}`} role="timer" aria-live="off" aria-label={`Koha aktive në portal: ${timerLabel}`}>
      <span className="active-session-dot" aria-hidden="true" />
      <span>
        <small>{isCounting ? "Koha aktive" : "Timeri në pauzë"}</small>
        <strong>{timerLabel}</strong>
      </span>
    </aside>
  );
}
