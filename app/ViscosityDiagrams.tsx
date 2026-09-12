import styles from "./LessonDiagram.module.css";

export type ViscosityDiagramBlock = {
  _key?: string;
  _type?: "lessonDiagram";
  kind?: "viscousLayeredPipe" | "velocityGradient" | "laminarPipeProfile";
  title?: string;
  caption?: string;
  explanation?: string;
};

function ArrowDefs() {
  return (
    <defs>
      <marker id="visc-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
        <path d="M0,0 L10,5 L0,10 Z" className={styles.velocityArrowFill} />
      </marker>
      <marker id="visc-open-start" markerWidth="8" markerHeight="8" refX="2" refY="4" orient="auto">
        <path d="M8,0 L0,4 L8,8" className={styles.intervalStroke} />
      </marker>
      <marker id="visc-open-end" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8" className={styles.intervalStroke} />
      </marker>
    </defs>
  );
}

function ViscousLayeredPipeDiagram() {
  const layers = [88, 116, 144, 172, 200, 228];
  const lengths = [42, 92, 148, 148, 92, 42];
  return (
    <svg className={styles.svg} viewBox="0 0 760 320" role="img" aria-label="Shtresat e lëngut viskoz në një gyp">
      <ArrowDefs />
      <path d="M92 58 L668 58 M92 258 L668 258" className={styles.axis} />
      <text x="76" y="64" textAnchor="end" className={styles.coordinate}>muri</text>
      <text x="76" y="264" textAnchor="end" className={styles.coordinate}>muri</text>
      {layers.map((y, i) => (
        <g key={y}>
          <line x1="120" y1={y} x2="640" y2={y} className={styles.guide} strokeDasharray="5 8" />
          <line x1="210" y1={y} x2={210 + lengths[i]} y2={y} className={styles.velocityVector} markerEnd="url(#visc-arrow)" />
        </g>
      ))}
      <text x="390" y="150" className={styles.vectorLabel}>v më e madhe</text>
      <text x="114" y="46" className={styles.coordinate}>v = 0 pranë murit</text>
      <text x="114" y="286" className={styles.coordinate}>v = 0 pranë murit</text>
      <text x="380" y="304" textAnchor="middle" className={styles.intervalLabel}>shtresat rrëshqasin njëra mbi tjetrën</text>
    </svg>
  );
}

function VelocityGradientDiagram() {
  const plane = (y: number) => `M205 ${y} L475 ${y} L555 ${y + 34} L285 ${y + 34} Z`;
  return (
    <svg className={styles.svg} viewBox="0 0 760 390" role="img" aria-label="Gradienti i shpejtësisë ndërmjet shtresave të lëngut">
      <ArrowDefs />
      <path d={plane(60)} fill="var(--medical-color-primary, #314adc)" opacity="0.05" className={styles.axis} />
      <path d={plane(160)} fill="var(--medical-color-primary, #314adc)" opacity="0.08" className={styles.axis} />
      <path d={plane(260)} fill="var(--medical-color-primary, #314adc)" opacity="0.11" className={styles.axis} />
      <line x1="468" y1="77" x2="635" y2="77" className={styles.velocityVector} markerEnd="url(#visc-arrow)" />
      <line x1="468" y1="177" x2="600" y2="177" className={styles.velocityVector} markerEnd="url(#visc-arrow)" />
      <line x1="468" y1="277" x2="565" y2="277" className={styles.velocityVector} markerEnd="url(#visc-arrow)" />
      <text x="642" y="84" className={styles.vectorLabel}>v₁</text>
      <text x="607" y="184" className={styles.vectorLabel}>v</text>
      <text x="572" y="284" className={styles.vectorLabel}>v₂</text>
      <text x="346" y="154" textAnchor="middle" className={styles.coordinate}>ΔS</text>
      <line x1="166" y1="82" x2="166" y2="276" className={styles.interval} markerStart="url(#visc-open-start)" markerEnd="url(#visc-open-end)" />
      <text x="140" y="184" textAnchor="middle" className={styles.intervalLabel}>Δx</text>
      <text x="380" y="354" textAnchor="middle" className={styles.intervalLabel}>Δv = v₁ − v₂</text>
    </svg>
  );
}

function LaminarPipeProfileDiagram() {
  const rows = [82, 110, 138, 166, 194, 222, 250];
  const lengths = [18, 74, 130, 180, 130, 74, 18];
  return (
    <svg className={styles.svg} viewBox="0 0 760 350" role="img" aria-label="Profili i shpejtësisë në rrjedhjen laminare">
      <ArrowDefs />
      <path d="M92 62 L668 62 M92 270 L668 270" className={styles.axis} />
      <line x1="128" y1="166" x2="650" y2="166" className={styles.guide} strokeDasharray="8 8" />
      {rows.map((y, i) => (
        <line key={y} x1="170" y1={y} x2={170 + lengths[i]} y2={y} className={styles.velocityVector} markerEnd="url(#visc-arrow)" />
      ))}
      <path d="M188 82 C300 102 345 128 350 166 C345 204 300 230 188 250" fill="none" className={styles.trajectory} />
      <text x="365" y="154" className={styles.vectorLabel}>vmax</text>
      <text x="106" y="48" className={styles.coordinate}>v = 0</text>
      <text x="106" y="296" className={styles.coordinate}>v = 0</text>
      <text x="380" y="326" textAnchor="middle" className={styles.intervalLabel}>shpejtësia rritet nga muri drejt boshtit</text>
    </svg>
  );
}

function DiagramCanvas({ value }: { value: ViscosityDiagramBlock }) {
  switch (value.kind) {
    case "viscousLayeredPipe":
      return <ViscousLayeredPipeDiagram />;
    case "velocityGradient":
      return <VelocityGradientDiagram />;
    case "laminarPipeProfile":
      return <LaminarPipeProfileDiagram />;
    default:
      return null;
  }
}

export default function ViscosityDiagrams({ value }: { value: ViscosityDiagramBlock }) {
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
