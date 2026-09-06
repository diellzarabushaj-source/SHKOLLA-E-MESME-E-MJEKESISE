"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import StethoscopeLogo from "./StethoscopeLogo";
import styles from "./PortalHero.module.css";

/** A decorative, progressively enhanced illustration. Never participates in navigation. */
export default function PortalHero() {
  const scene = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  function resetPerspective() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    scene.current?.style.removeProperty("--rotate-x");
    scene.current?.style.removeProperty("--rotate-y");
  }

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => { if (motion.matches) resetPerspective(); };
    motion.addEventListener("change", onMotionChange);
    return () => {
      motion.removeEventListener("change", onMotionChange);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  function followPointer(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const { clientX, clientY, currentTarget } = event;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const bounds = currentTarget.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (clientX - bounds.left) / bounds.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (clientY - bounds.top) / bounds.height * 2 - 1));
      scene.current?.style.setProperty("--rotate-x", `${-y * 4}deg`);
      scene.current?.style.setProperty("--rotate-y", `${x * 5}deg`);
      frame.current = null;
    });
  }

  return (
    <section className={`hero ${styles.hero}`} aria-labelledby="portal-welcome">
      <div className={styles.copy}>
        <span className={styles.eyebrow}><i aria-hidden="true" /> Portali i shkollës sonë</span>
        <h1 id="portal-welcome">Mësime dhe<br />flashcards.<em>Të ndara sipas klasës.</em></h1>
        <p>Zgjidhe klasën tënde. Klasa ruhet dhe pastaj i sheh të gjitha lëndët e saj.</p>
        <a className={styles.action} href="#klasat">Zgjidh klasën <span aria-hidden="true">↗</span></a>
        <div className={styles.signature} aria-hidden="true"><span />Mjekësi Pejë<span /></div>
      </div>

      <div className={styles.visual} onPointerMove={followPointer} onPointerLeave={resetPerspective} onPointerCancel={resetPerspective} aria-hidden="true">
        <div className={styles.grid} />
        <div className={styles.orbit}><i /><i /></div>
        <div className={styles.scene} ref={scene}>
          <div className={styles.backSheet} />
          <div className={styles.atlas}>
            <div className={styles.atlasHeader}><span>PORTALI MËSIMOR</span><span className={styles.cross}>+</span></div>
            <div className={styles.specimen}>
              <span className={styles.specimenRing} />
              <div className={styles.heart}><StethoscopeLogo /></div>
              <span className={styles.annotationOne} /><span className={styles.annotationTwo} />
            </div>
            <div className={styles.atlasFooter}><b>Klasa → Të gjitha lëndët</b><small>Strukturë e qartë</small></div>
          </div>
          <div className={styles.studyCard}>
            <span className={styles.studyIcon}>
              <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="13" height="15" rx="3" /><path d="M8 8h4M8 12h4M16 8h2a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H9" /></svg>
            </span>
            <div><small>ZGJIDH MËNYRËN</small><b>Mësimet ose Flashcards</b></div>
            <span className={styles.studyArrow}>↗</span>
          </div>
          <div className={styles.note}><span>✓</span> Vetëm një buton</div>
        </div>
        <svg className={styles.signal} viewBox="0 0 260 40" fill="none"><path d="M0 23h66l9-9 10 18 13-29 17 35 10-15h135" /></svg>
      </div>
    </section>
  );
}
