import styles from "./LessonDiagram.module.css";

export type BodyResistanceDiagramBlock = {
  _key?: string;
  _type?: "lessonDiagram";
  kind?: "bodyResistance";
  title?: string;
  caption?: string;
  explanation?: string;
};

function ArrowDefs() {
  return (
    <defs>
      <marker id="drag-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
        <path d="M0,0 L10,5 L0,10 Z" className={styles.velocityArrowFill} />
      </marker>
      <marker id="drag-arrow-dark" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
        <path d="M0,0 L10,5 L0,10 Z" className={styles.arrowFill} />
      </marker>
    </defs>
  );
}

function ResistanceFigure() {
  return (
    <svg className={styles.svg} viewBox="0 0 760 420" role="img" aria-label="Ndikimi i formës së trupit në rezistencën e fluidit">
      <ArrowDefs />
      <text x="126" y="38" textAnchor="middle" className={styles.pointLabel}>a) trup aerodinamik</text>
      <path d="M68 108 C98 72 158 68 210 108 C160 148 98 144 68 108 Z" fill="var(--medical-color-primary, #314adc)" opacity="0.10" className={styles.axis} />
      <line x1="35" y1="108" x2="65" y2="108" className={styles.velocityVector} markerEnd="url(#drag-arrow)" />
      <line x1="213" y1="108" x2="252" y2="108" className={styles.velocityVector} markerEnd="url(#drag-arrow)" />
      <text x="40" y="91" className={styles.vectorLabel}>v</text>
      <text x="126" y="170" textAnchor="middle" className={styles.coordinate}>rezistencë më e vogël</text>

      <text x="380" y="38" textAnchor="middle" className={styles.pointLabel}>b) sferë</text>
      <circle cx="380" cy="108" r="50" fill="var(--medical-color-primary, #314adc)" opacity="0.10" className={styles.axis} />
      <line x1="292" y1="108" x2="326" y2="108" className={styles.velocityVector} markerEnd="url(#drag-arrow)" />
      <line x1="434" y1="108" x2="480" y2="108" className={styles.velocityVector} markerEnd="url(#drag-arrow)" />
      <path d="M434 86 C470 65 500 78 505 104 C510 128 482 145 454 132" fill="none" className={styles.guide} />
      <text x="380" y="170" textAnchor="middle" className={styles.coordinate}>rezistencë më e madhe</text>

      <text x="635" y="38" textAnchor="middle" className={styles.pointLabel}>c) pllakë</text>
      <rect x="618" y="65" width="34" height="86" rx="4" fill="var(--medical-color-primary, #314adc)" opacity="0.10" className={styles.axis} />
      <line x1="550" y1="108" x2="612" y2="108" className={styles.velocityVector} markerEnd="url(#drag-arrow)" />
      <path d="M654 76 C700 58 726 80 712 104 C700 122 723 140 684 151" fill="none" className={styles.guide} />
      <path d="M654 137 C694 153 716 135 706 116" fill="none" className={styles.guide} />
      <text x="635" y="170" textAnchor="middle" className={styles.coordinate}>rezistencë më e madhe</text>

      <line x1="76" y1="270" x2="684" y2="270" className={styles.guide} />
      <line x1="222" y1="315" x2="110" y2="315" className={styles.velocityVector} markerEnd="url(#drag-arrow-dark)" />
      <text x="232" y="322" className={styles.vectorLabel}>Fᵣ</text>
      <line x1="536" y1="315" x2="650" y2="315" className={styles.velocityVector} markerEnd="url(#drag-arrow)" />
      <text x="520" y="322" className={styles.vectorLabel}>v</text>
      <text x="380" y="365" textAnchor="middle" className={styles.intervalLabel}>forca e rezistencës vepron kundër kahut të lëvizjes</text>
      <text x="380" y="397" textAnchor="middle" className={styles.coordinate}>Fᵣ = 6πηrv për sferën në rrjedhje viskoze</text>
    </svg>
  );
}

export default function BodyResistanceDiagram({ value }: { value: BodyResistanceDiagramBlock }) {
  if (!value) return null;
  return (
    <figure className={styles.card} data-lesson-diagram="true">
      <header className={styles.header}>
        <span className={styles.badge}>FIGURË</span>
        {value.title ? <strong>{value.title}</strong> : null}
      </header>
      <div className={styles.canvas}><ResistanceFigure /></div>
      {value.explanation ? <p className={styles.explanation}>{value.explanation}</p> : null}
      {value.caption ? <figcaption>{value.caption}</figcaption> : null}
    </figure>
  );
}
