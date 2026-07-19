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
  flashcardCount: number;
  children: ReactNode;
};

const STORAGE_PREFIX = "medical-lesson-learning-v1";

function safeId(value: string, index: number): string {
  const slug = value
    .toLocaleLowerCase("sq-AL")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9çë]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return `seksioni-${slug || index + 1}`;
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

export default function LessonLearningExperience({
  lessonId,
  lessonTitle,
  flashcardCount,
  children,
}: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const [headings, setHeadings] = useState<LessonHeading[]>([]);
  const [activeHeading, setActiveHeading] = useState("");
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [readingProgress, setReadingProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loadedStorageKey, setLoadedStorageKey] = useState("");
  const storageKey = `${STORAGE_PREFIX}:${lessonId}`;

  const discoverHeadings = useCallback(() => {
    const root = rootRef.current;
    const article = root?.querySelector<HTMLElement>("article");
    if (!article) return;

    const used = new Set<string>();
    const next = Array.from(article.querySelectorAll<HTMLElement>("h2,h3,h4"))
      .filter((heading) => !heading.closest("[data-learning-chrome]"))
      .map((heading, index): LessonHeading | null => {
        const label = (heading.textContent || "").replace(/\s+/g, " ").trim();
        if (!label) return null;
        const level = Number(heading.tagName.slice(1)) as 2 | 3 | 4;
        const base = heading.id || safeId(label, index);
        let id = base;
        let suffix = 2;
        while (used.has(id)) id = `${base}-${suffix++}`;
        used.add(id);
        heading.id = id;
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
    const root = rootRef.current;
    const article = root?.querySelector<HTMLElement>("article");
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
        if (!element) continue;
        if (element.getBoundingClientRect().top <= window.innerHeight * 0.38) active = heading.id;
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
      // Learning progress remains available for the active page even when storage is blocked.
    }
  }, [completed, loadedStorageKey, storageKey, visited]);

  const visitedCount = headings.filter((heading) => visited.has(heading.id)).length;
  const sectionProgress = headings.length ? Math.round((visitedCount / headings.length) * 100) : readingProgress;
  const xp = visitedCount * 5 + (completed ? 25 : 0);
  const level = Math.max(1, Math.floor(xp / 50) + 1);
  const status = completed ? "Mësimi u përfundua" : readingProgress > 5 ? "Mësimi është në vazhdim" : "Fillo mësimin";
  const displayProgress = completed ? 100 : Math.max(readingProgress, sectionProgress);

  const outline = useMemo(() => headings.slice(0, 30), [headings]);

  function jumpTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function markCompleted() {
    setCompleted(true);
    setReadingProgress(100);
    setVisited(new Set(headings.map((heading) => heading.id)));
  }

  return (
    <section ref={rootRef} className={styles.workspace} data-learning-experience data-lesson-id={lessonId}>
      <header className={styles.dashboard} data-learning-chrome>
        <div className={styles.primaryRow}>
          <div className={styles.progressCopy}>
            <span className={styles.kicker}>Mësim aktiv</span>
            <strong>{status}</strong>
            <small>{lessonTitle}</small>
          </div>

          <div className={styles.scoreboard} aria-label="Progresi i mësimit">
            <span><b>{displayProgress}%</b><small>progres</small></span>
            <span><b>{xp} XP</b><small>niveli {level}</small></span>
            <span><b>{headings.length ? `${visitedCount}/${headings.length}` : "—"}</b><small>seksione</small></span>
          </div>
        </div>

        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label="Progresi i leximit"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={displayProgress}
        >
          <span style={{ width: `${displayProgress}%` }} />
        </div>

        <div className={styles.actionsRow}>
          {outline.length ? (
            <details className={styles.outline}>
              <summary>Harta e mësimit · {outline.length} seksione</summary>
              <nav aria-label="Seksionet e mësimit">
                {outline.map((heading) => (
                  <button
                    className={activeHeading === heading.id ? styles.activeSection : ""}
                    data-level={heading.level}
                    key={heading.id}
                    onClick={() => jumpTo(heading.id)}
                    type="button"
                  >
                    <span aria-hidden="true">{visited.has(heading.id) ? "✓" : "○"}</span>
                    <span>{heading.label}</span>
                  </button>
                ))}
              </nav>
            </details>
          ) : (
            <span className={styles.readingHint}>Lexoje materialin me radhë dhe provo flashcards në fund.</span>
          )}

          <div className={styles.actionButtons}>
            {flashcardCount > 0 && <span className={styles.flashcardHint}>{flashcardCount} flashcards</span>}
            <button className={completed ? styles.completedButton : styles.completeButton} onClick={markCompleted} disabled={completed} type="button">
              {completed ? "✓ Përfunduar" : "Shëno si të përfunduar"}
            </button>
          </div>
        </div>
      </header>

      <div className={styles.content}>{children}</div>
      <p className={styles.srStatus} aria-live="polite">{status}. {xp} XP.</p>
    </section>
  );
}
