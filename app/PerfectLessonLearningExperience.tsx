"use client";

import {
  useCallback,
  useEffect,
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
  version?: number;
  revision?: string | null;
  signature?: string;
  visited?: string[];
  completed?: boolean;
  lastHeading?: string;
  readingProgress?: number;
  updatedAt?: string;
};

type Props = {
  lessonId: string;
  lessonTitle: string;
  flashcardCount: number;
  contentRevision?: string;
  children: ReactNode;
};

const STORAGE_PREFIX = "medical-lesson-learning-v2";
const LEGACY_STORAGE_PREFIX = "medical-lesson-learning-v1";
const STORAGE_VERSION = 3;

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

function parseSavedState(value: string | null): SavedLearningState {
  try {
    const parsed = JSON.parse(value || "{}") as SavedLearningState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readSavedState(key: string, legacyKey: string): SavedLearningState {
  const current = window.localStorage.getItem(key);
  if (current) return parseSavedState(current);
  return parseSavedState(window.localStorage.getItem(legacyKey));
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function stableSignature(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `v${STORAGE_VERSION}-${(hash >>> 0).toString(36)}`;
}

function findHeadingElement(article: HTMLElement, id: string): HTMLElement | null {
  return Array.from(article.querySelectorAll<HTMLElement>("h2,h3,h4")).find((element) => element.id === id) || null;
}

export default function PerfectLessonLearningExperience({
  lessonId,
  lessonTitle,
  flashcardCount,
  contentRevision,
  children,
}: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const outlineRef = useRef<HTMLDetailsElement>(null);
  const [headings, setHeadings] = useState<LessonHeading[]>([]);
  const [activeHeading, setActiveHeading] = useState("");
  const [lastHeading, setLastHeading] = useState("");
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [readingProgress, setReadingProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [contentUpdated, setContentUpdated] = useState(false);
  const [loadedStorageKey, setLoadedStorageKey] = useState("");
  const [storedSignature, setStoredSignature] = useState("");
  const [contentSignature, setContentSignature] = useState("");
  const [headingsReady, setHeadingsReady] = useState(false);
  const storageKey = `${STORAGE_PREFIX}:${lessonId}`;
  const legacyStorageKey = `${LEGACY_STORAGE_PREFIX}:${lessonId}`;

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
        heading.tabIndex = -1;
        heading.dataset.learningHeading = "true";
        heading.dataset.learningLevel = String(level);
        return {id, label, level};
      })
      .filter((heading): heading is LessonHeading => Boolean(heading));

    const articleText = (article.textContent || "").replace(/\s+/g, " ").trim();
    const signature = stableSignature([
      lessonTitle,
      articleText,
      next.map((heading) => `${heading.level}:${heading.id}:${heading.label}`).join("|"),
    ].join("\u241f"));

    setHeadings((current) => {
      const currentValue = current.map((heading) => `${heading.id}:${heading.label}:${heading.level}`).join("|");
      const nextValue = next.map((heading) => `${heading.id}:${heading.label}:${heading.level}`).join("|");
      return currentValue === nextValue ? current : next;
    });
    setContentSignature(signature);
    setHeadingsReady(true);
  }, [lessonTitle]);

  useEffect(() => {
    const saved = readSavedState(storageKey, legacyStorageKey);
    const revisionChanged = Boolean(saved.revision && contentRevision && saved.revision !== contentRevision);
    const savedVisited = revisionChanged
      ? []
      : Array.isArray(saved.visited)
        ? saved.visited.filter((item): item is string => typeof item === "string")
        : [];

    setHeadings([]);
    setHeadingsReady(false);
    setContentSignature("");
    setVisited(new Set(savedVisited));
    setCompleted(revisionChanged ? false : saved.completed === true);
    setContentUpdated(revisionChanged);
    setReadingProgress(revisionChanged ? 0 : clamp(typeof saved.readingProgress === "number" ? saved.readingProgress : 0));
    setActiveHeading("");
    setLastHeading(revisionChanged ? "" : typeof saved.lastHeading === "string" ? saved.lastHeading : "");
    setStoredSignature(revisionChanged ? "" : typeof saved.signature === "string" ? saved.signature : "");
    setLoadedStorageKey(storageKey);
  }, [contentRevision, legacyStorageKey, storageKey]);

  useEffect(() => {
    const article = rootRef.current?.querySelector<HTMLElement>("article");
    if (!article) return;
    discoverHeadings();
    const observer = new MutationObserver(discoverHeadings);
    observer.observe(article, {childList: true, subtree: true, characterData: true});
    return () => observer.disconnect();
  }, [children, discoverHeadings]);

  useEffect(() => {
    if (!headingsReady || loadedStorageKey !== storageKey || !contentSignature) return;
    const available = new Set(headings.map((heading) => heading.id));

    setVisited((current) => {
      const filtered = new Set([...current].filter((id) => available.has(id)));
      if (filtered.size === current.size && [...filtered].every((id) => current.has(id))) return current;
      return filtered;
    });
    setLastHeading((current) => available.has(current) ? current : "");

    if (storedSignature && storedSignature !== contentSignature) {
      setVisited(new Set());
      setCompleted(false);
      setContentUpdated(true);
      setReadingProgress(0);
      setLastHeading("");
      setStoredSignature(contentSignature);
      return;
    }

    if (!storedSignature) setStoredSignature(contentSignature);
  }, [contentSignature, headings, headingsReady, loadedStorageKey, storageKey, storedSignature]);

  useEffect(() => {
    const article = rootRef.current?.querySelector<HTMLElement>("article");
    if (!article) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const articleRect = article.getBoundingClientRect();
      const documentTop = window.scrollY + articleRect.top;
      const readableHeight = Math.max(article.offsetHeight - window.innerHeight * 0.45, 1);
      const currentPosition = window.scrollY + window.innerHeight * 0.32 - documentTop;
      const nextProgress = Math.round(clamp((currentPosition / readableHeight) * 100));
      setReadingProgress((current) => completed ? 100 : Math.max(current, nextProgress));

      let active = "";
      for (const heading of headings) {
        const element = findHeadingElement(article, heading.id);
        if (!element) continue;
        if (element.getBoundingClientRect().top <= window.innerHeight * 0.38) active = heading.id;
      }
      if (!active && headings[0]) active = headings[0].id;
      setActiveHeading(active);
      if (active && nextProgress > 0) setLastHeading(active);

      const newlyVisited = headings
        .filter((heading) => {
          const element = findHeadingElement(article, heading.id);
          if (!element) return false;
          const box = element.getBoundingClientRect();
          return box.top <= window.innerHeight * 0.78 && box.bottom >= 0;
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

    const schedule = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener("scroll", schedule, {passive: true});
    window.addEventListener("resize", schedule);
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(article);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resizeObserver.disconnect();
    };
  }, [completed, headings]);

  useEffect(() => {
    if (
      loadedStorageKey !== storageKey ||
      !headingsReady ||
      !contentSignature ||
      storedSignature !== contentSignature
    ) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        version: STORAGE_VERSION,
        revision: contentRevision || null,
        signature: contentSignature,
        visited: [...visited],
        completed,
        lastHeading,
        readingProgress,
        updatedAt: new Date().toISOString(),
      } satisfies SavedLearningState));
    } catch {
      // Progresi mbetet aktiv në faqe edhe kur ruajtja lokale është e bllokuar.
    }
  }, [completed, contentRevision, contentSignature, headingsReady, lastHeading, loadedStorageKey, readingProgress, storageKey, storedSignature, visited]);

  const visitedCount = headings.filter((heading) => visited.has(heading.id)).length;
  const sectionProgress = headings.length ? Math.round((visitedCount / headings.length) * 100) : readingProgress;
  const xp = visitedCount * 5 + (completed ? 25 : 0);
  const level = Math.max(1, Math.floor(xp / 50) + 1);
  const status = completed
    ? "Mësimi u përfundua"
    : contentUpdated && readingProgress <= 5
      ? "Rishiko mësimin e përditësuar"
      : readingProgress > 5
        ? "Mësimi është në vazhdim"
        : "Fillo mësimin";
  const displayProgress = completed ? 100 : Math.max(readingProgress, sectionProgress);
  const activeLabel = headings.find((heading) => heading.id === activeHeading)?.label || "";
  const canResume = !completed && Boolean(lastHeading) && headings.some((heading) => heading.id === lastHeading) && displayProgress > 0;

  function jumpTo(id: string) {
    const article = rootRef.current?.querySelector<HTMLElement>("article");
    const element = article ? findHeadingElement(article, id) : null;
    if (!element) return;
    outlineRef.current?.removeAttribute("open");
    element.scrollIntoView({behavior: "smooth", block: "start"});
    window.history.replaceState(window.history.state, "", `#${id}`);
    setActiveHeading(id);
    setLastHeading(id);
    setVisited((current) => new Set(current).add(id));
    window.setTimeout(() => element.focus({preventScroll: true}), 350);
  }

  function markCompleted() {
    setCompleted(true);
    setContentUpdated(false);
    setReadingProgress(100);
    setVisited(new Set(headings.map((heading) => heading.id)));
    if (headings.at(-1)) setLastHeading(headings.at(-1)?.id || "");
  }

  return (
    <section
      ref={rootRef}
      className={styles.workspace}
      data-learning-experience="perfect-v3"
      data-lesson-id={lessonId}
      data-content-revision={contentRevision || "unknown"}
      data-content-signature={contentSignature}
      data-content-current={storedSignature === contentSignature ? "true" : "false"}
    >
      <header className={styles.dashboard} data-learning-chrome>
        <div className={styles.primaryRow}>
          <div className={styles.progressCopy}>
            <span className={styles.kicker}>{contentUpdated ? "Përmbajtje e përditësuar" : "Mësim aktiv"}</span>
            <strong>{status}</strong>
            <small>{lessonTitle}</small>
            {activeLabel && <span className={styles.currentSection}>Tani: {activeLabel}</span>}
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
          <span style={{width: `${displayProgress}%`}} />
        </div>

        <div className={styles.actionsRow}>
          {headings.length ? (
            <details ref={outlineRef} className={styles.outline}>
              <summary>Harta e mësimit · {headings.length} seksione</summary>
              <nav aria-label="Seksionet e mësimit">
                {headings.map((heading) => (
                  <button
                    className={activeHeading === heading.id ? styles.activeSection : ""}
                    data-level={heading.level}
                    key={heading.id}
                    onClick={() => jumpTo(heading.id)}
                    type="button"
                    aria-current={activeHeading === heading.id ? "location" : undefined}
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
            {canResume && (
              <button className={styles.resumeButton} data-learning-resume onClick={() => jumpTo(lastHeading)} type="button">
                Vazhdo te seksioni i fundit
              </button>
            )}
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
