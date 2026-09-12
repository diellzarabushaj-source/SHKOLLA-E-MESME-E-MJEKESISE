import styles from "./LessonDiagram.module.css";

export type SolidStateDiagramBlock = {
  _key?: string;
  _type?: "lessonDiagram";
  kind?: "crystalForms" | "crystalLattice" | "crystalAnisotropy";
  title?: string;
  caption?: string;
  explanation?: string;
};

function CrystalFormsDiagram() {
  return (
    <svg className={styles.svg} viewBox="0 0 900 330" role="img" aria-label="Format karakteristike të kristaleve: kub, prizëm gjashtëkëndor dhe oktaedër">
      <g transform="translate(90 70)">
        <path d="M35 65 L155 65 L155 185 L35 185 Z M35 65 L75 30 L195 30 L155 65 M155 65 L195 30 L195 150 L155 185" className={styles.trajectory} fill="none" />
        <text x="115" y="235" textAnchor="middle" className={styles.vectorLabel}>a. kub</text>
      </g>
      <g transform="translate(340 65)">
        <path d="M70 45 L165 45 L205 85 L165 125 L70 125 L30 85 Z" className={styles.trajectory} fill="none" />
        <path d="M70 45 L70 165 M165 45 L165 165 M205 85 L205 205 M30 85 L30 205 M70 165 L165 165 L205 205 L110 205 L30 205 L70 165" className={styles.trajectory} fill="none" />
        <path d="M70 165 L30 205 M165 165 L205 205" className={styles.guide} />
        <text x="117" y="250" textAnchor="middle" className={styles.vectorLabel}>b. prizëm gjashtëkëndor</text>
      </g>
      <g transform="translate(650 55)">
        <path d="M105 25 L170 120 L105 220 L40 120 Z" className={styles.trajectory} fill="none" />
        <path d="M105 25 L105 220 M40 120 L170 120 M105 25 L70 120 L105 220 M105 25 L140 120 L105 220" className={styles.guide} />
        <text x="105" y="265" textAnchor="middle" className={styles.vectorLabel}>c. oktaedër</text>
      </g>
      <text x="450" y="30" textAnchor="middle" className={styles.intervalLabel}>Forma gjeometrike karakteristike të kristaleve</text>
    </svg>
  );
}

function CrystalLatticeDiagram() {
  const cells = [];
  for (let z = 0; z < 3; z += 1) {
    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 3; x += 1) {
        const ox = 145 + x * 105 + z * 35;
        const oy = 55 + y * 72 - z * 22;
        cells.push(<circle key={`n-${x}-${y}-${z}`} cx={ox} cy={oy} r="5" className={styles.velocityArrowFill} />);
      }
    }
  }
  return (
    <svg className={styles.svg} viewBox="0 0 780 350" role="img" aria-label="Rrjeti kristalin me celulën elementare të theksuar">
      <g className={styles.guide}>
        {[0,1,2].map((z) => [0,1,2].map((y) => <line key={`h-${z}-${y}`} x1={145+z*35} y1={55+y*72-z*22} x2={355+z*35} y2={55+y*72-z*22} />))}
        {[0,1,2].map((z) => [0,1,2].map((x) => <line key={`v-${z}-${x}`} x1={145+x*105+z*35} y1={55-z*22} x2={145+x*105+z*35} y2={199-z*22} />))}
        {[0,1,2].map((y) => [0,1,2].map((x) => <line key={`d-${y}-${x}`} x1={145+x*105} y1={55+y*72} x2={215+x*105} y2={11+y*72} />))}
      </g>
      {cells}
      <path d="M145 55 L250 55 L285 33 L180 33 Z M145 55 L145 127 L180 105 L180 33 M250 55 L250 127 L285 105 L285 33 M145 127 L250 127 L285 105" className={styles.trajectory} fill="none" />
      <text x="215" y="250" textAnchor="middle" className={styles.vectorLabel}>celula elementare</text>
      <text x="540" y="95" className={styles.intervalLabel}>përsëritje periodike</text>
      <text x="540" y="125" className={styles.coordinate}>→ rrjet kristalin</text>
      <text x="390" y="315" textAnchor="middle" className={styles.coordinate}>nyjat = pozitat e ekuilibrit të grimcave</text>
    </svg>
  );
}

function CrystalAnisotropyDiagram() {
  return (
    <svg className={styles.svg} viewBox="0 0 780 350" role="img" aria-label="Drejtime të ndryshme në monokristal që shpjegojnë anizotropinë">
      <g transform="translate(210 35)">
        <path d="M70 85 L250 85 L250 255 L70 255 Z M70 85 L135 35 L315 35 L250 85 M250 85 L315 35 L315 205 L250 255" className={styles.trajectory} fill="none" />
        <path d="M70 170 L250 170 L315 120 L135 120 Z" className={styles.guide} fill="none" />
        <path d="M160 35 L160 255 M70 170 L315 120" className={styles.guide} />
        <circle cx="160" cy="170" r="6" className={styles.velocityArrowFill} />
        <text x="147" y="190" className={styles.vectorLabel}>O</text>
        <line x1="160" y1="170" x2="90" y2="110" className={styles.velocityVector} />
        <line x1="160" y1="170" x2="270" y2="125" className={styles.velocityVector} />
        <line x1="160" y1="170" x2="160" y2="70" className={styles.velocityVector} />
        <text x="78" y="105" className={styles.vectorLabel}>A</text>
        <text x="278" y="120" className={styles.vectorLabel}>B</text>
        <text x="168" y="65" className={styles.vectorLabel}>C</text>
      </g>
      <text x="390" y="325" textAnchor="middle" className={styles.intervalLabel}>OA, OB, OC → drejtime të ndryshme në monokristal</text>
    </svg>
  );
}

function DiagramCanvas({ value }: { value: SolidStateDiagramBlock }) {
  switch (value.kind) {
    case "crystalForms": return <CrystalFormsDiagram />;
    case "crystalLattice": return <CrystalLatticeDiagram />;
    case "crystalAnisotropy": return <CrystalAnisotropyDiagram />;
    default: return null;
  }
}

export default function SolidStateDiagrams({ value }: { value: SolidStateDiagramBlock }) {
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
