"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Rating = "again" | "hard" | "good" | "easy";
type RatingCounts = Record<Rating, number>;
type ViewMode = "summary" | "review" | "review-done";

type CapturedCard = {
  id: string;
  gradeId: string;
  subjectId: string;
  chapterId: string;
  lessonId: string;
  question: string;
  answer: string;
  explanation: string;
  imageUrl: string;
  imageAlt: string;
  rating: Rating;
  sequence: number;
};

type ResultSummary = {
  title: string;
  total: number;
  activeSeconds: number;
  counts: RatingCounts;
  cards: CapturedCard[];
};

const emptyCounts = (): RatingCounts => ({ again: 0, hard: 0, good: 0, easy: 0 });
const ratingLabels: Record<Rating, string> = {
  again: "Përsëri",
  hard: "Vështirë",
  good: "Mirë",
  easy: "Lehtë",
};

function cleanText(value: string | null | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function positiveNumber(value: string | undefined, fallback = 1): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

function ratingFromElement(element: Element): Rating | null {
  if (element.closest(".rating-again")) return "again";
  if (element.closest(".rating-hard")) return "hard";
  if (element.closest(".rating-good")) return "good";
  if (element.closest(".rating-easy")) return "easy";
  return null;
}

function countRatings(cards: CapturedCard[]): RatingCounts {
  return cards.reduce<RatingCounts>((counts, card) => {
    counts[card.rating] += 1;
    return counts;
  }, emptyCounts());
}

function countsFromFinishCard(host: HTMLElement): RatingCounts {
  const counts = emptyCounts();
  for (const item of Array.from(host.querySelectorAll<HTMLElement>(".finish-stats > div"))) {
    const label = cleanText(item.querySelector("span")?.textContent).toLocaleLowerCase("sq");
    const value = Number(cleanText(item.querySelector("strong")?.textContent)) || 0;
    if (label.includes("përsëri")) counts.again = value;
    else if (label.includes("vështirë")) counts.hard = value;
    else if (label.includes("mirë")) counts.good = value;
    else if (label.includes("lehtë")) counts.easy = value;
  }
  return counts;
}

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}min`;
  if (minutes > 0) return `${minutes} min ${remainder} sek`;
  return `${Math.max(1, remainder)} sek`;
}

function globalCardPosition(): { current: number; total: number } {
  const counter = cleanText(document.querySelector(".study-context strong")?.textContent);
  const values = counter.match(/\d+/g)?.map(Number) || [];
  return { current: values[0] || 1, total: values[1] || values[0] || 1 };
}

function captureVisibleCard(rating: Rating): CapturedCard | null {
  const flashcard = document.querySelector<HTMLElement>(
    ".study-page .study-shell .flashcard[data-progress-flashcard-id]",
  );
  if (!flashcard) return null;

  const id = flashcard.dataset.progressFlashcardId;
  const gradeId = flashcard.dataset.progressGradeId;
  const subjectId = flashcard.dataset.progressSubjectId;
  const chapterId = flashcard.dataset.progressChapterId;
  const lessonId = flashcard.dataset.progressLessonId;
  if (!id || !gradeId || !subjectId || !chapterId || !lessonId) return null;

  const image = flashcard.querySelector<HTMLImageElement>(".flashcard-back img, .flashcard-front img");
  const position = globalCardPosition();

  return {
    id,
    gradeId,
    subjectId,
    chapterId,
    lessonId,
    question: cleanText(
      flashcard.querySelector(".answer-question")?.textContent ||
      flashcard.querySelector(".flashcard-front > strong")?.textContent,
    ),
    answer: cleanText(flashcard.querySelector(".answer")?.textContent),
    explanation: cleanText(flashcard.querySelector(".explanation")?.textContent),
    imageUrl: image?.src || "",
    imageAlt: image?.alt || "",
    rating,
    sequence: position.current,
  };
}

function hiddenOriginalButton(host: HTMLElement, label: string): HTMLButtonElement | null {
  const expected = label.toLocaleLowerCase("sq");
  return Array.from(host.querySelectorAll<HTMLButtonElement>("button"))
    .filter((button) => !button.closest(".enhanced-results"))
    .find((button) => cleanText(button.textContent).toLocaleLowerCase("sq").includes(expected)) || null;
}

export default function EnhancedTestResults() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [summary, setSummary] = useState<ResultSummary | null>(null);
  const [mode, setMode] = useState<ViewMode>("summary");
  const [showProblems, setShowProblems] = useState(false);
  const [reviewCards, setReviewCards] = useState<CapturedCard[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewRevealed, setReviewRevealed] = useState(false);
  const [reviewCounts, setReviewCounts] = useState<RatingCounts>(emptyCounts());

  const cardsRef = useRef(new Map<string, CapturedCard>());
  const activeSecondsRef = useRef(0);
  const testRunningRef = useRef(false);
  const lastActiveRef = useRef(Date.now());
  const hostRef = useRef<HTMLElement | null>(null);

  function resetCapture() {
    cardsRef.current.clear();
    activeSecondsRef.current = 0;
    testRunningRef.current = false;
    hostRef.current = null;
    setHost(null);
    setSummary(null);
    setMode("summary");
    setShowProblems(false);
    setReviewCards([]);
    setReviewIndex(0);
    setReviewRevealed(false);
    setReviewCounts(emptyCounts());
  }

  function finalizeResult(finishCard: HTMLElement) {
    const capturedCards = Array.from(cardsRef.current.values()).sort((a, b) => a.sequence - b.sequence);
    const originalCounts = countsFromFinishCard(finishCard);
    const originalTotal = Object.values(originalCounts).reduce((sum, value) => sum + value, 0);
    const counts = originalTotal > 0 ? originalCounts : countRatings(capturedCards);
    const total = originalTotal || capturedCards.length;

    finishCard.dataset.enhanced = "true";
    finishCard.classList.add("is-enhanced");
    hostRef.current = finishCard;
    setHost(finishCard);
    setSummary({
      title: cleanText(finishCard.querySelector("h2")?.textContent) || "Testi i flashcards",
      total,
      activeSeconds: activeSecondsRef.current,
      counts,
      cards: capturedCards,
    });
    setMode("summary");
    setShowProblems(false);
  }

  useEffect(() => {
    const markActive = () => { lastActiveRef.current = Date.now(); };
    const activityEvents: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, markActive, { passive: true }));

    const timer = window.setInterval(() => {
      if (
        testRunningRef.current &&
        document.visibilityState === "visible" &&
        Date.now() - lastActiveRef.current <= 60_000
      ) {
        activeSecondsRef.current += 1;
      }
    }, 1000);

    const inspectPortal = () => {
      const studyShell = document.querySelector(".study-page .study-shell");
      const finishCard = document.querySelector<HTMLElement>(".study-page .finish-card");

      if (studyShell && !finishCard && !testRunningRef.current) {
        cardsRef.current.clear();
        activeSecondsRef.current = 0;
        lastActiveRef.current = Date.now();
        testRunningRef.current = true;
        setHost(null);
        setSummary(null);
        setMode("summary");
        setShowProblems(false);
      }

      if (finishCard && !finishCard.dataset.enhanced) {
        testRunningRef.current = false;
        finalizeResult(finishCard);
      }

      if (!document.querySelector(".study-page") && hostRef.current && !hostRef.current.isConnected) {
        resetCapture();
      }
    };

    const observer = new MutationObserver(inspectPortal);
    observer.observe(document.body, { childList: true, subtree: true });
    inspectPortal();

    const onClick = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      if (!element || element.closest(".enhanced-results")) return;
      const rating = ratingFromElement(element);
      if (!rating) return;
      const card = captureVisibleCard(rating);
      if (card) cardsRef.current.set(card.id, card);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (mode === "review" || !document.querySelector(".study-page .study-shell .rating-actions")) return;
      const ratingByKey: Record<string, Rating> = { "1": "again", "2": "hard", "3": "good", "4": "easy" };
      const rating = ratingByKey[event.key];
      if (!rating) return;
      const card = captureVisibleCard(rating);
      if (card) cardsRef.current.set(card.id, card);
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActive));
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [mode]);

  const problemCards = useMemo(
    () => summary?.cards.filter((card) => card.rating === "again" || card.rating === "hard") || [],
    [summary],
  );

  const currentReviewCard = reviewCards[reviewIndex];
  const currentReviewPosition = useMemo(() => {
    if (!currentReviewCard) return { current: 1, total: 1 };
    return {
      current: reviewCards.slice(0, reviewIndex + 1).filter((card) => card.lessonId === currentReviewCard.lessonId).length,
      total: reviewCards.filter((card) => card.lessonId === currentReviewCard.lessonId).length,
    };
  }, [currentReviewCard, reviewCards, reviewIndex]);

  function beginProblemReview(cards = problemCards) {
    if (!cards.length) return;
    setReviewCards(cards);
    setReviewIndex(0);
    setReviewRevealed(false);
    setReviewCounts(emptyCounts());
    setMode("review");
    setShowProblems(false);
    lastActiveRef.current = Date.now();
    testRunningRef.current = true;
  }

  function rateReviewCard(rating: Rating) {
    if (!currentReviewCard || !reviewRevealed || !summary) return;

    const updatedCard = { ...currentReviewCard, rating };
    cardsRef.current.set(updatedCard.id, updatedCard);
    const updatedCards = summary.cards.map((card) => card.id === updatedCard.id ? updatedCard : card);
    const nextReviewCounts = { ...reviewCounts, [rating]: reviewCounts[rating] + 1 };
    const nextSummary = {
      ...summary,
      cards: updatedCards,
      counts: countRatings(updatedCards),
      activeSeconds: activeSecondsRef.current,
    };

    setReviewCounts(nextReviewCounts);
    setSummary(nextSummary);
    setReviewRevealed(false);

    if (reviewIndex >= reviewCards.length - 1) {
      testRunningRef.current = false;
      setMode("review-done");
    } else {
      setReviewIndex((index) => index + 1);
    }
  }

  useEffect(() => {
    if (mode !== "review") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (event.code === "Space") {
        event.preventDefault();
        setReviewRevealed((value) => !value);
        return;
      }
      if (!reviewRevealed) return;
      const ratingByKey: Record<string, Rating> = { "1": "again", "2": "hard", "3": "good", "4": "easy" };
      const rating = ratingByKey[event.key];
      if (rating) rateReviewCard(rating);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, reviewRevealed, currentReviewCard, reviewIndex, reviewCards, reviewCounts, summary]);

  function runOriginalAction(label: string) {
    if (!host) return;
    const button = hiddenOriginalButton(host, label);
    if (!button) return;
    resetCapture();
    button.click();
  }

  if (!host || !summary) return null;

  const known = summary.counts.good + summary.counts.easy;
  const difficult = summary.counts.again + summary.counts.hard;
  const percentage = summary.total ? Math.round((known / summary.total) * 100) : 0;
  const resultMessage = difficult
    ? `Shumë mirë! Përsëriti ${difficult} kartelat e vështira për ta forcuar këtë temë.`
    : "Shkëlqyeshëm! I ke kaluar të gjitha kartelat pa vështirësi.";

  const content = mode === "review" && currentReviewCard ? (
    <div className="enhanced-results enhanced-review-view">
      <div className="enhanced-review-heading">
        <div>
          <span className="eyebrow">Përsëritje e fokusuar</span>
          <h2>Kartelat e vështira</h2>
          <p>{reviewIndex + 1} nga {reviewCards.length}</p>
        </div>
        <span className="enhanced-review-counter">{reviewIndex + 1}/{reviewCards.length}</span>
      </div>

      <div className="progress-track" aria-label={`${Math.round(((reviewIndex + 1) / reviewCards.length) * 100)}% e përfunduar`}>
        <span style={{ width: `${((reviewIndex + 1) / reviewCards.length) * 100}%` }} />
      </div>

      <button
        className={`flashcard enhanced-review-card ${reviewRevealed ? "is-flipped" : ""}`}
        type="button"
        onClick={() => setReviewRevealed((value) => !value)}
        aria-label={reviewRevealed ? "Kthehu te pyetja" : "Shfaq përgjigjen"}
        data-progress-grade-id={currentReviewCard.gradeId}
        data-progress-subject-id={currentReviewCard.subjectId}
        data-progress-chapter-id={currentReviewCard.chapterId}
        data-progress-lesson-id={currentReviewCard.lessonId}
        data-progress-flashcard-id={currentReviewCard.id}
        data-progress-current-card={currentReviewPosition.current}
        data-progress-total-cards={currentReviewPosition.total}
      >
        <span className="flashcard-inner">
          <span className="flashcard-face flashcard-front">
            <span className="card-kicker"><b>PYETJA</b><i className="hard">Për përsëritje</i></span>
            {currentReviewCard.imageUrl && <img className="enhanced-review-image" src={currentReviewCard.imageUrl} alt={currentReviewCard.imageAlt || currentReviewCard.question} />}
            <strong>{currentReviewCard.question}</strong>
            <small>Preke kartelën ose shtyp Space</small>
          </span>
          <span className="flashcard-face flashcard-back">
            <span className="card-kicker"><b>PËRGJIGJJA</b><i className="answer-ready">Gati për vlerësim</i></span>
            <span className="answer-question">{currentReviewCard.question}</span>
            {currentReviewCard.imageUrl && <img className="enhanced-review-image" src={currentReviewCard.imageUrl} alt={currentReviewCard.imageAlt || currentReviewCard.question} />}
            <span className="answer">{currentReviewCard.answer}</span>
            {currentReviewCard.explanation && <span className="explanation">{currentReviewCard.explanation}</span>}
            <small>Vlerësoje më poshtë</small>
          </span>
        </span>
      </button>

      {!reviewRevealed ? (
        <button className="reveal-button" onClick={() => setReviewRevealed(true)} type="button">
          Shfaq përgjigjen <kbd>Space</kbd>
        </button>
      ) : (
        <div className="rating-actions" aria-label="Vlerëso kartelën">
          <button className="rating-again" onClick={() => rateReviewCard("again")}><b>Përsëri</b><span>&lt; 1 min</span><kbd>1</kbd></button>
          <button className="rating-hard" onClick={() => rateReviewCard("hard")}><b>Vështirë</b><span>6 min</span><kbd>2</kbd></button>
          <button className="rating-good" onClick={() => rateReviewCard("good")}><b>Mirë</b><span>10 min</span><kbd>3</kbd></button>
          <button className="rating-easy" onClick={() => rateReviewCard("easy")}><b>Lehtë</b><span>4 ditë</span><kbd>4</kbd></button>
        </div>
      )}
    </div>
  ) : mode === "review-done" ? (
    <div className="enhanced-results enhanced-result-summary">
      <span className="finish-icon">✓</span>
      <span className="eyebrow">Përsëritja përfundoi</span>
      <h2>{problemCards.length ? `${problemCards.length} kartela duhen parë përsëri` : "Të gjitha kartelat u përmirësuan"}</h2>
      <p>{problemCards.length ? "Vazhdo edhe një raund të shkurtër ose kthehu te rezultati." : "Shumë mirë — tash mund të vazhdosh te kapitulli."}</p>
      <div className="enhanced-mini-stats">
        <span><strong>{reviewCounts.again + reviewCounts.hard}</strong> të vështira</span>
        <span><strong>{reviewCounts.good + reviewCounts.easy}</strong> të ditura</span>
        <span><strong>{formatDuration(summary.activeSeconds)}</strong> kohë aktive</span>
      </div>
      <div className="enhanced-primary-actions">
        {problemCards.length > 0 && <button className="primary-button" onClick={() => beginProblemReview(problemCards)}>Përsëriti prapë {problemCards.length}</button>}
        <button className="secondary-button" onClick={() => setMode("summary")}>Kthehu te rezultati</button>
        <button className="secondary-button" onClick={() => runOriginalAction("kthehu")}>Kthehu te kapitulli</button>
      </div>
      <div className="enhanced-save-status" role="status">✓ Progresi u ruajt</div>
    </div>
  ) : (
    <div className="enhanced-results enhanced-result-summary">
      <span className="finish-icon">✓</span>
      <span className="eyebrow">Testi përfundoi</span>
      <h2>{summary.title}</h2>

      <div className="enhanced-score">
        <strong>{known} <small>/ {summary.total}</small></strong>
        <span>Kartela të ditura</span>
      </div>

      <div className="enhanced-highlights">
        <span><strong>{percentage}%</strong> të sigurta</span>
        <span><strong>{difficult}</strong> për përsëritje</span>
        <span><strong>{formatDuration(summary.activeSeconds)}</strong> kohë aktive</span>
      </div>

      <p className="enhanced-result-message">{resultMessage}</p>

      <div className="finish-stats enhanced-finish-stats">
        <div><strong>{summary.counts.again}</strong><span>Përsëri</span></div>
        <div><strong>{summary.counts.hard}</strong><span>Vështirë</span></div>
        <div><strong>{summary.counts.good}</strong><span>Mirë</span></div>
        <div><strong>{summary.counts.easy}</strong><span>Lehtë</span></div>
      </div>

      <div className="enhanced-primary-actions">
        <button className="primary-button enhanced-main-action" onClick={() => beginProblemReview()} disabled={!problemCards.length}>
          {problemCards.length ? `Përsëriti ${problemCards.length} kartelat e vështira` : "Nuk ka kartela për përsëritje"}
        </button>
      </div>

      {problemCards.length > 0 && (
        <button className="enhanced-problem-toggle" type="button" onClick={() => setShowProblems((value) => !value)} aria-expanded={showProblems}>
          {showProblems ? "Fshihi kartelat problematike" : "Shiko kartelat problematike"}
        </button>
      )}

      {showProblems && (
        <ol className="enhanced-problem-list">
          {problemCards.map((card) => (
            <li key={card.id}>
              <span>{card.question}</span>
              <b data-rating={card.rating}>{ratingLabels[card.rating]}</b>
            </li>
          ))}
        </ol>
      )}

      <div className="enhanced-secondary-actions">
        <button className="secondary-button" onClick={() => runOriginalAction("rifillo")}>Rifillo krejt testin</button>
        <button className="secondary-button" onClick={() => runOriginalAction("përzie")}>Përzieji kartelat</button>
        <button className="secondary-button" onClick={() => runOriginalAction("kthehu")}>Kthehu te kapitulli</button>
      </div>

      <div className="enhanced-save-status" role="status">✓ Progresi u ruajt</div>
    </div>
  );

  return createPortal(content, host);
}
