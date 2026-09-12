import styles from "./LessonDiagram.module.css";

export type CardiovascularDiagramBlock = {
  _key?: string;
  _type?: "lessonDiagram";
  kind?: "bloodVesselModel" | "heartCycleCardiogram";
  title?: string;
  caption?: string;
  explanation?: string;
};

function ArrowDefs() {
  return (
    <defs>
      <marker id="cardio-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
        <path d="M0,0 L9,4.5 L0,9 Z" className={styles.velocityArrowFill} />
      </marker>
    </defs>
  );
}

function Stage({ x, label, expanded, recovery }: { x: number; label: string; expanded?: boolean; recovery?: boolean }) {
  const vesselTop = expanded ? 150 : 162;
  const vesselBottom = expanded ? 230 : 218;
  return (
    <g transform={`translate(${x} 0)`}>
      <text x="105" y="35" textAnchor="middle" className={styles.vectorLabel}>{label}</text>
      <ellipse cx="105" cy="82" rx="48" ry="25" className={styles.axis} />
      <text x="105" y="88" textAnchor="middle" className={styles.vectorLabel}>P</text>
      <text x="28" y="92" className={styles.coordinate}>A</text>
      <text x="176" y="92" className={styles.coordinate}>B</text>
      <line x1="57" y1="82" x2="22" y2="82" className={styles.velocityVector} markerEnd="url(#cardio-arrow)" />
      <line x1="153" y1="82" x2="188" y2="82" className={styles.velocityVector} markerEnd="url(#cardio-arrow)" />
      <path d={`M42 ${vesselTop} C70 ${vesselTop - 18} 140 ${vesselTop - 18} 168 ${vesselTop} L168 ${vesselBottom} C140 ${vesselBottom + 18} 70 ${vesselBottom + 18} 42 ${vesselBottom} Z`} className={styles.trajectory} fill="none" />
      <path d="M105 118 L105 144 M82 144 L128 144 M82 144 L68 166 M105 144 L105 166 M128 144 L142 166" className={styles.guide} />
      <path d="M68 166 L68 202 M105 166 L105 202 M142 166 L142 202" className={styles.guide} />
      <path d="M68 202 L50 218 M105 202 L105 222 M142 202 L160 218" className={styles.guide} />
      {expanded ? <text x="105" y="260" textAnchor="middle" className={styles.intervalLabel}>muri elastik zgjerohet</text> : null}
      {recovery ? <text x="105" y="260" textAnchor="middle" className={styles.intervalLabel}>muri ngushtohet gradualisht</text> : null}
    </g>
  );
}

function BloodVesselModelDiagram() {
  return (
    <svg className={styles.svg} viewBox="0 0 780 330" role="img" aria-label="Modeli fizik i enëve të gjakut me pompë, valvula dhe gypa elastikë">
      <ArrowDefs />
      <Stage x={15} label="a" />
      <Stage x={275} label="b" expanded />
      <Stage x={535} label="c" recovery />
      <text x="390" y="306" textAnchor="middle" className={styles.intervalLabel}>P = pompa · A/B = sistemi i gypave elastikë</text>
    </svg>
  );
}

function HeartCycleCardiogramDiagram() {
  return (
    <svg className={styles.svg} viewBox="0 0 780 330" role="img" aria-label="Kardiogram mekanik me sistolë, diastolë dhe pauzë">
      <line x1="70" y1="245" x2="715" y2="245" className={styles.axis} />
      <path
        d="M82 245 C96 245 100 150 116 150 C132 150 136 245 150 245 C164 245 168 150 184 150 C200 150 204 245 218 245 C232 245 236 150 252 150 C268 150 272 245 286 245 C300 245 304 150 320 150 C336 150 340 245 354 245 C368 245 372 150 388 150 C404 150 408 245 422 245 C436 245 440 150 456 150 C472 150 476 245 490 245 C504 245 508 150 524 150 C540 150 544 245 558 245 C572 245 576 160 592 160 C608 160 612 245 626 245 C645 245 654 260 675 260 C690 260 700 260 708 260"
        fill="none"
        className={styles.trajectory}
      />
      <line x1="535" y1="72" x2="575" y2="144" className={styles.guide} />
      <text x="515" y="62" className={styles.vectorLabel}>sistolë</text>
      <line x1="610" y1="88" x2="620" y2="215" className={styles.guide} />
      <text x="598" y="76" className={styles.vectorLabel}>diastolë</text>
      <line x1="659" y1="286" x2="665" y2="263" className={styles.guide} />
      <text x="639" y="308" className={styles.vectorLabel}>pauzë</text>
      <text x="390" y="45" textAnchor="middle" className={styles.intervalLabel}>Kardiogrami mekanik i cikleve të zemrës</text>
      <text x="390" y="290" textAnchor="middle" className={styles.coordinate}>krahu ngjitës → sistola · krahu zbritës → diastola</text>
    </svg>
  );
}

function DiagramCanvas({ value }: { value: CardiovascularDiagramBlock }) {
  switch (value.kind) {
    case "bloodVesselModel":
      return <BloodVesselModelDiagram />;
    case "heartCycleCardiogram":
      return <HeartCycleCardiogramDiagram />;
    default:
      return null;
  }
}

export default function CardiovascularDiagrams({ value }: { value: CardiovascularDiagramBlock }) {
  if (!value) return null;
  return (
    <figure className={styles.card} data-lesson-diagram="true">
      <header className={styles.header}>
        <span className={styles.badge}>FIGURË</span>
        {value.title ? <strong>{value.title}</strong> : null}
      </header>
      <div className={styles.canvas}><DiagramCanvas value={value} /></div>
      {value.explanation ? <p className={styles.explanation}>{value.explanation}</p> : null}
      {value.caption ? <figcaption>{value.caption}</figcaption> : null}
    </figure>
  );
}
