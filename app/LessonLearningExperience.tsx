"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./LessonLearningExperience.module.css";
import qa from "./LessonLearningExperienceQA.module.css";
import { isLessonOutlineHeading } from "./LessonHeadingPolicy";

type LessonHeading = {
  id: string;
  label: string;
  level: 2 | 3 | 4;
};

type SavedLearningState = {
  visited?: string[];
  completed?: boolean;
};

type Props = {
  lessonId: string;
  lessonTitle: string;
  lessonSummary: string;
  gradeTitle: string;
  subjectTitle: string;
  chapterTitle: string;
  flashcardCount: number;
  coverImage?: ReactNode;
  onStartFlashcards: () => void;
  children: ReactNode;
};

const STORAGE_PREFIX = "medical-lesson-learning-v1";

function safeId(value: string, index: number, prefix = "seksioni"): string {
  const slug = value
    .toLocaleLowerCase("sq-AL")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9çë]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return `${prefix}-${slug || index + 1}`;
}

function readSavedState(key: string): SavedLearningState {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "{}") as SavedLearningState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

function outlineLabel(value: string): string {
  return value
    .replace(/^(?:(?:\d+(?:\.\d+){0,5})\.?|(?:[A-ZÇË]|[IVXLCDM]{1,7})[.)])\s+/i, "")
    .trim();
}

// bullet-outline-navigation-v1

export default function LessonLearningExperience({
  lessonId,
  lessonTitle,
  lessonSummary,
  gradeTitle,
  subjectTitle,
  chapterTitle,
  flashcardCount,
  coverImage,
  onStartFlashcards,
  children,
}: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const mobileOutlineRef = useRef<HTMLDetailsElement>(null);
  const [headings, setHeadings] = useState<LessonHeading[]>([]);
  const [activeHeading, setActiveHeading] = useState("");
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [readingProgress, setReadingProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loadedStorageKey, setLoadedStorageKey] = useState("");
  const storageKey = `${STORAGE_PREFIX}:${lessonId}`;
  const lessonTitleId = useMemo(() => safeId(lessonTitle, 0, "titulli-i-mesimit"), [lessonTitle]);

  const discoverHeadings = useCallback(() => {
    const article = rootRef.current?.querySelector<HTMLElement>("article");
    if (!article) return;

    const used = new Set<string>();
    const next = Array.from(article.querySelectorAll<HTMLElement>("h1,h2,h3,h4"))
      .filter((heading) => !heading.closest("[data-learning-chrome]"))
      .map((heading, index): LessonHeading | null => {
        const label = (heading.textContent || "").replace(/\s+/g, " ").trim();
        if (!label) return null;

        const source = heading.dataset.headingSource || "sanity";
        if (!isLessonOutlineHeading(label, source)) {
          heading.dataset.learningRejectedHeading = "true";
          heading.setAttribute("role", "presentation");
          heading.removeAttribute("aria-level");
          heading.removeAttribute("data-learning-heading");
          heading.removeAttribute("data-learning-level");
          heading.removeAttribute("tabindex");
          return null;
        }

        delete heading.dataset.learningRejectedHeading;
        const tagLevel = Number(heading.tagName.slice(1));
        const level = (tagLevel === 1 ? 2 : tagLevel) as 2 | 3 | 4;
        if (tagLevel === 1) {
          heading.setAttribute("role", "heading");
          heading.setAttribute("aria-level", "2");
        } else {
          if (heading.getAttribute("role") === "presentation") heading.removeAttribute("role");
          heading.removeAttribute("aria-level");
        }
        const base = heading.id || safeId(label, index);
        let id = base;
        let suffix = 2;
        while (used.has(id)) id = `${base}-${suffix++}`;
        used.add(id);
        heading.id = id;
        heading.tabIndex = -1;
        heading.dataset.learningHeading = "true";
        heading.dataset.learningLevel = String(level);
        return { id, label, level };
      })
      .filter((heading): heading is LessonHeading => Boolean(heading));

    setHeadings((current) => {
      const currentSignature = current.map((heading) => `${heading.id}:${heading.label}:${heading.level}`).join("|");
      const nextSignature = next.map((heading) => `${heading.id}:${heading.label}:${heading.level}`).join("|");
      return currentSignature === nextSignature ? current : next;
    });
  }, []);

  useEffect(() => {
    const saved = readSavedState(storageKey);
    setVisited(new Set(Array.isArray(saved.visited) ? saved.visited.filter((item): item is string => typeof item === "string") : []));
    setCompleted(saved.completed === true);
    setReadingProgress(0);
    setActiveHeading("");
    setLoadedStorageKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    discoverHeadings();
    const observer = new MutationObserver(discoverHeadings);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [children, discoverHeadings]);

  useEffect(() => {
    const article = rootRef.current?.querySelector<HTMLElement>("article");
    if (!article) return;

    const update = () => {
      const articleRect = article.getBoundingClientRect();
      const documentTop = window.scrollY + articleRect.top;
      const readableHeight = Math.max(article.offsetHeight - window.innerHeight * 0.45, 1);
      const current = window.scrollY + window.innerHeight * 0.32 - documentTop;
      setReadingProgress(Math.round(clamp((current / readableHeight) * 100)));

      let active = "";
      for (const heading of headings) {
        const element = document.getElementById(heading.id);
        if (element && element.getBoundingClientRect().top <= window.innerHeight * 0.38) active = heading.id;
      }
      if (!active && headings[0]) active = headings[0].id;
      setActiveHeading(active);

      const newlyVisited = headings
        .filter((heading) => {
          const element = document.getElementById(heading.id);
          return element ? element.getBoundingClientRect().top <= window.innerHeight * 0.76 : false;
        })
        .map((heading) => heading.id);

      if (newlyVisited.length) {
        setVisited((currentVisited) => {
          const next = new Set(currentVisited);
          let changed = false;
          for (const id of newlyVisited) {
            if (!next.has(id)) {
              next.add(id);
              changed = true;
            }
          }
          return changed ? next : currentVisited;
        });
      }
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(article);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      resizeObserver.disconnect();
    };
  }, [headings]);

  useEffect(() => {
    if (loadedStorageKey !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ visited: [...visited], completed }));
    } catch {
      // The active lesson still works when browser storage is unavailable.
    }
  }, [completed, loadedStorageKey, storageKey, visited]);

  const outline = useMemo(() => headings, [headings]);
  const activePrimaryHeading = useMemo(() => {
    let primary = "";
    for (const heading of outline) {
      if (heading.level === 2) primary = heading.id;
      if (heading.id === activeHeading) return primary || heading.id;
    }
    return outline.find((heading) => heading.level === 2)?.id || "";
  }, [activeHeading, outline]);
  const visitedCount = headings.filter((heading) => visited.has(heading.id)).length;
  const sectionProgress = headings.length ? Math.round((visitedCount / headings.length) * 100) : readingProgress;
  const rawProgress = Math.max(readingProgress, sectionProgress);
  const displayProgress = completed ? 100 : Math.min(rawProgress, 99);
  const status = completed ? "Mësimi u përfundua" : displayProgress > 5 ? "Mësimi është në vazhdim" : "Gati për të filluar";

  const jumpTo = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    if (mobileOutlineRef.current?.open) mobileOutlineRef.current.open = false;
    window.requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: preferredScrollBehavior(), block: "start" });
      element.focus({ preventScroll: true });
    });
  }, []);

  function continueReading() {
    const firstUnread = headings.find((heading) => !visited.has(heading.id));
    const target = firstUnread?.id || activeHeading || outline[0]?.id || headings[0]?.id;
    if (target) jumpTo(target);
    else rootRef.current?.querySelector<HTMLElement>("article")?.scrollIntoView({ behavior: preferredScrollBehavior(), block: "start" });
  }

  function markCompleted() {
    setCompleted(true);
    setReadingProgress(100);
    setVisited(new Set(headings.map((heading) => heading.id)));
  }

  const outlineItems = outline.map((heading) => {
    const levelClass = heading.level === 3 ? qa.outlineLevel3 : heading.level === 4 ? qa.outlineLevel4 : qa.outlineLevel2;
    const isCurrent = activeHeading === heading.id;
    const isPrimaryActive = heading.level === 2 && activePrimaryHeading === heading.id;
    return (
      <button
        className={`${qa.outlineButton} ${levelClass} ${isPrimaryActive ? styles.activeSection : ""}`}
        data-level={heading.level}
        data-section-active={isPrimaryActive ? "true" : undefined}
        style={isCurrent && heading.level > 2 ? { background: "transparent", borderLeftColor: "transparent", transition: "none" } : undefined}
        key={heading.id}
        onClick={() => jumpTo(heading.id)}
        type="button"
        aria-current={isCurrent ? "location" : undefined}
      >
        <span className={qa.outlineBullet} aria-hidden="true" />
        <span>{outlineLabel(heading.label)}</span>
      </button>
    );
  });

  return (
    <section
      ref={rootRef}
      className={`${styles.workspace} ${qa.workspace}`}
      data-learning-experience
      data-lesson-id={lessonId}
      aria-labelledby={lessonTitleId}
    >
      <div
        className={styles.topProgress}
        data-learning-chrome
        role="progressbar"
        aria-label="Progresi i leximit"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={displayProgress}
        aria-valuetext={completed ? "Mësimi u përfundua" : `${displayProgress}% i lexuar`}
      >
        <span style={{ width: `${displayProgress}%` }} />
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar} data-learning-chrome aria-label="Përmbajtja e mësimit">
          <div className={styles.context}>
            <span>{gradeTitle}</span>
            <strong className={qa.contextTitle}>{subjectTitle}</strong>
            <p>{chapterTitle}</p>
          </div>

          <nav className={styles.outline} aria-label="Seksionet e mësimit">
            {outlineItems.length ? outlineItems : <p>Përmbajtja shfaqet sapo të ngarkohet mësimi.</p>}
          </nav>

          <div className={styles.sidebarProgress}>
            <span className={qa.progressLabel}>Përparimi në mësim</span>
            <div><b>{displayProgress}%</b><small>{visitedCount}/{headings.length || 0} seksione</small></div>
            <span className={styles.progressTrack} aria-hidden="true"><span style={{ width: `${displayProgress}%` }} /></span>
          </div>
        </aside>

        <div className={styles.stage}>
          <details ref={mobileOutlineRef} className={`${styles.mobileOutline} ${qa.mobileOutline}`} data-learning-chrome>
            <summary>Përmbajtja e mësimit · {outline.length || headings.length} seksione</summary>
            <nav aria-label="Seksionet e mësimit në telefon">{outlineItems}</nav>
          </details>

          <header className={styles.hero} data-learning-chrome>
            <div className={`${styles.heroCopy} ${qa.heroCopy}`}>
              <span className={styles.kicker}>Mësimi · {gradeTitle}</span>
              <h1 id={lessonTitleId} className={qa.heroTitle}>{lessonTitle}</h1>
              <p>{lessonSummary}</p>
            </div>

            <div className={`${styles.heroActions} ${qa.heroActions}`}>
              <button className={`${styles.continueButton} ${qa.focusControl}`} type="button" onClick={continueReading}>
                {displayProgress > 5 ? "Vazhdo leximin" : "Fillo leximin"}
              </button>
              <button
                className={`${styles.flashcardButton} ${qa.focusControl}`}
                type="button"
                onClick={onStartFlashcards}
                disabled={flashcardCount === 0}
              >
                {flashcardCount ? `${flashcardCount} flashcards` : "Ende pa flashcards"}
              </button>
            </div>

            {coverImage && <div className={`${styles.heroMedia} ${qa.heroMedia}`}>{coverImage}</div>}
          </header>

          <div className={styles.lessonMeta} data-learning-chrome>
            <div>
              <span>{status}</span>
              <strong>{displayProgress}% i lexuar</strong>
            </div>
            <button
              className={`${completed ? styles.completedButton : styles.completeButton} ${qa.focusControl}`}
              onClick={markCompleted}
              disabled={completed}
              type="button"
            >
              {completed ? "Përfunduar" : "Shëno si të përfunduar"}
            </button>
          </div>

          <div className={styles.content}>{children}</div>
        </div>
      </div>

      <p className={styles.srStatus} aria-live="polite">{completed ? "Mësimi u shënua si i përfunduar." : ""}</p>
    </section>
  );
}
