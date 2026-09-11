import styles from "./LessonDiagram.module.css";

export type LessonDiagramBlock = {
  _key?: string;
  _type?: "lessonDiagram";
  kind?: "linearPosition" | "curvedVelocity" | "hydrostaticPressure" | "hydrostaticParadox";
  title?: string;
  caption?: string;
  explanation?: string;
  axisLabel?: string;
  startPointLabel?: string;
  endPointLabel?: string;
  startCoordinateLabel?: string;
  endCoordinateLabel?: string;
  intervalLabel?: string;
  startVectorLabel?: string;
  endVectorLabel?: string;
};

function LinearPositionDiagram({ value }: { value: LessonDiagramBlock }) {
  const axis = value.axisLabel || "x";
  const pointA = value.startPointLabel || "A";
  const pointB = value.endPointLabel || "B";
  const x0 = value.startCoordinateLabel || "x₀";
  const x = value.endCoordinateLabel || "x";
  const delta = value.intervalLabel || "Δx = x − x₀";

  return (
    <svg className={styles.svg} viewBox="0 0 760 260" role="img" aria-labelledby="linear-motion-title linear-motion-desc">
      <title id="linear-motion-title">{value.title || "Pozita e trupit gjatë lëvizjes drejtvizore"}</title>
      <desc id="linear-motion-desc">
        Pika materiale lëviz nga A në B. Pozita fillestare është x₀, pozita përfundimtare është x dhe ndryshimi i pozitës është Δx = x − x₀.
      </desc>

      <defs>
        <marker id="axis-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" className={styles.arrowFill} />
        </marker>
        <marker id="interval-arrow-start" markerWidth="8" markerHeight="8" refX="2" refY="4" orient="auto">
          <path d="M8,0 L0,4 L8,8" className={styles.intervalStroke} />
        </marker>
        <marker id="interval-arrow-end" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8" className={styles.intervalStroke} />
        </marker>
      </defs>

      <line x1="72" y1="156" x2="692" y2="156" className={styles.axis} markerEnd="url(#axis-arrow)" />
      <text x="712" y="162" className={styles.axisText}>{axis}</text>

      <line x1="270" y1="138" x2="270" y2="174" className={styles.tick} />
      <line x1="558" y1="138" x2="558" y2="174" className={styles.tick} />
      <circle cx="270" cy="156" r="7" className={styles.point} />
      <circle cx="558" cy="156" r="7" className={styles.point} />

      <text x="270" y="118" textAnchor="middle" className={styles.pointLabel}>{pointA}</text>
      <text x="558" y="118" textAnchor="middle" className={styles.pointLabel}>{pointB}</text>
      <text x="270" y="204" textAnchor="middle" className={styles.coordinate}>{x0}</text>
      <text x="558" y="204" textAnchor="middle" className={styles.coordinate}>{x}</text>

      <line
        x1="282"
        y1="82"
        x2="546"
        y2="82"
        className={styles.interval}
        markerStart="url(#interval-arrow-start)"
        markerEnd="url(#interval-arrow-end)"
      />
      <line x1="270" y1="94" x2="270" y2="128" className={styles.guide} />
      <line x1="558" y1="94" x2="558" y2="128" className={styles.guide} />
      <text x="414" y="60" textAnchor="middle" className={styles.intervalLabel}>{delta}</text>
    </svg>
  );
}

function UniformMotionAxisDiagram({ value }: { value: LessonDiagramBlock }) {
  const axis = value.axisLabel || "x";
  const originLabel = value.startPointLabel || "t = 0";
  const pathLabel = value.intervalLabel || "s = x";

  return (
    <svg className={styles.svg} viewBox="0 0 760 280" role="img" aria-labelledby="uniform-motion-title uniform-motion-desc">
      <title id="uniform-motion-title">{value.title || "Lëvizja e njëtrajtshme përgjatë boshtit Ox"}</title>
      <desc id="uniform-motion-desc">
        Origjina e sistemit të koordinatave përputhet me fillimin e lëvizjes në t baras me zero. Trupi lëviz vetëm përgjatë boshtit Ox dhe rruga është s baras me x.
      </desc>

      <defs>
        <marker id="motion-axis-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" className={styles.arrowFill} />
        </marker>
      </defs>

      <line x1="176" y1="178" x2="682" y2="178" className={styles.axis} markerEnd="url(#motion-axis-arrow)" />
      <line x1="176" y1="178" x2="102" y2="232" className={styles.axis} markerEnd="url(#motion-axis-arrow)" />
      <line x1="176" y1="178" x2="176" y2="54" className={styles.axis} markerEnd="url(#motion-axis-arrow)" />

      <text x="704" y="184" className={styles.axisText}>{axis}</text>
      <text x="82" y="246" className={styles.axisText}>y</text>
      <text x="166" y="40" className={styles.axisText}>z</text>

      <circle cx="176" cy="178" r="9" className={styles.point} />
      <circle cx="560" cy="178" r="10" className={styles.point} />

      <text x="176" y="216" textAnchor="middle" className={styles.coordinate}>{originLabel}</text>
      <text x="370" y="148" textAnchor="middle" className={styles.intervalLabel}>{pathLabel}</text>
      <text x="560" y="216" textAnchor="middle" className={styles.coordinate}>{value.endCoordinateLabel || "x"}</text>
    </svg>
  );
}

function CurvedVelocityDiagram({ value }: { value: LessonDiagramBlock }) {
  const point1 = value.startPointLabel || "1";
  const point2 = value.endPointLabel || "2";
  const time1 = value.startCoordinateLabel || "t";
  const time2 = value.endCoordinateLabel || "t + Δt";
  const arc = value.intervalLabel || "Δs";
  const velocity1 = value.startVectorLabel || "v₁";
  const velocity2 = value.endVectorLabel || "v₂";

  return (
    <svg className={styles.svg} viewBox="0 0 760 340" role="img" aria-labelledby="curved-motion-title curved-motion-desc">
      <title id="curved-motion-title">{value.title || "Shpejtësia gjatë lëvizjes së lakuar"}</title>
      <desc id="curved-motion-desc">
        Trupi lëviz nëpër një trajektore të lakuar nga pozita 1 në pozitën 2 gjatë intervalit Δt. Harku i përshkuar është Δs, ndërsa vektorët e shpejtësisë v₁ dhe v₂ janë tangjentë me trajektoren në pikat përkatëse.
      </desc>

      <defs>
        <marker id="velocity-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" className={styles.velocityArrowFill} />
        </marker>
      </defs>

      <path
        d="M180 300 C205 250 210 190 270 150 C320 116 382 126 422 170 C458 211 476 264 532 254 C590 244 618 190 612 132"
        className={styles.trajectory}
      />

      <path
        d="M278 148 C330 118 386 132 425 173 C452 201 465 230 487 246"
        className={styles.arcHighlight}
      />

      <circle cx="282" cy="143" r="8" className={styles.point} />
      <circle cx="503" cy="252" r="8" className={styles.point} />

      <line x1="282" y1="143" x2="365" y2="104" className={styles.velocityVector} markerEnd="url(#velocity-arrow)" />
      <line x1="503" y1="252" x2="554" y2="309" className={styles.velocityVector} markerEnd="url(#velocity-arrow)" />

      <text x="261" y="127" className={styles.pointLabel}>{point1}</text>
      <text x="514" y="239" className={styles.pointLabel}>{point2}</text>
      <text x="332" y="88" className={styles.vectorLabel}>{velocity1}</text>
      <text x="560" y="318" className={styles.vectorLabel}>{velocity2}</text>
      <text x="342" y="215" className={styles.intervalLabel}>{arc}</text>
      <text x="224" y="169" className={styles.coordinate}>{time1}</text>
      <text x="520" y="278" className={styles.coordinate}>{time2}</text>
    </svg>
  );
}

function HydrostaticPressureDiagram({ value }: { value: LessonDiagramBlock }) {
  const topForce = value.startVectorLabel || "p₀ΔS";
  const bottomForce = value.endVectorLabel || "pΔS";
  const height = value.intervalLabel || "h";

  return (
    <svg className={styles.svg} viewBox="0 0 760 340" role="img" aria-labelledby="hydrostatic-pressure-title hydrostatic-pressure-desc">
      <title id="hydrostatic-pressure-title">{value.title || "Element vëllimor i lëngut në ekuilibër"}</title>
      <desc id="hydrostatic-pressure-desc">
        Element cilindrik me sipërfaqe ΔS dhe lartësi h brenda lëngut. Në faqen e sipërme vepron shtypja p₀, në faqen e poshtme shtypja p, ndërsa pesha e shtyllës së lëngut vepron poshtë.
      </desc>
      <defs>
        <marker id="pressure-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" className={styles.velocityArrowFill} />
        </marker>
        <marker id="height-arrow-start" markerWidth="8" markerHeight="8" refX="2" refY="4" orient="auto">
          <path d="M8,0 L0,4 L8,8" className={styles.intervalStroke} />
        </marker>
        <marker id="height-arrow-end" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8" className={styles.intervalStroke} />
        </marker>
      </defs>

      <rect x="150" y="62" width="460" height="230" rx="8" fill="none" className={styles.axis} />
      <rect x="154" y="92" width="452" height="196" fill="var(--medical-color-primary, #314adc)" opacity="0.08" />
      <line x1="154" y1="92" x2="606" y2="92" className={styles.guide} />

      <rect x="330" y="130" width="100" height="108" rx="46" fill="var(--medical-color-bg-container, #fff)" className={styles.axis} />
      <line x1="380" y1="80" x2="380" y2="127" className={styles.velocityVector} markerEnd="url(#pressure-arrow)" />
      <line x1="380" y1="286" x2="380" y2="241" className={styles.velocityVector} markerEnd="url(#pressure-arrow)" />
      <text x="398" y="72" className={styles.vectorLabel}>{topForce}</text>
      <text x="398" y="310" className={styles.vectorLabel}>{bottomForce}</text>
      <text x="380" y="126" textAnchor="middle" className={styles.coordinate}>ΔS</text>
      <text x="380" y="263" textAnchor="middle" className={styles.coordinate}>ΔS</text>

      <line x1="486" y1="136" x2="486" y2="232" className={styles.interval} markerStart="url(#height-arrow-start)" markerEnd="url(#height-arrow-end)" />
      <text x="508" y="190" className={styles.intervalLabel}>{height}</text>
      <line x1="430" y1="130" x2="500" y2="130" className={styles.guide} />
      <line x1="430" y1="238" x2="500" y2="238" className={styles.guide} />
    </svg>
  );
}

function HydrostaticParadoxDiagram({ value }: { value: LessonDiagramBlock }) {
  const height = value.intervalLabel || "h";
  const base = value.axisLabel || "S";

  return (
    <svg className={styles.svg} viewBox="0 0 760 330" role="img" aria-labelledby="hydrostatic-paradox-title hydrostatic-paradox-desc">
      <title id="hydrostatic-paradox-title">{value.title || "Paradoksi hidrostatik"}</title>
      <desc id="hydrostatic-paradox-desc">
        Tri enë me forma të ndryshme kanë të njëjtën sipërfaqe fundore S dhe të njëjtën lartësi të lëngut h. Shtypja dhe forca hidrostatike në fund varen nga h dhe S, jo nga forma e enës.
      </desc>

      <g transform="translate(80 46)">
        <path d="M55 220 L92 54 L178 54 L215 220 Z" fill="var(--medical-color-primary, #314adc)" opacity="0.08" />
        <path d="M55 220 L92 54 M178 54 L215 220 M55 220 L215 220" className={styles.axis} />
        <line x1="84" y1="78" x2="186" y2="78" className={styles.guide} />
        <text x="135" y="250" textAnchor="middle" className={styles.coordinate}>{base}</text>
        <text x="238" y="142" className={styles.intervalLabel}>{height}</text>
        <text x="135" y="286" textAnchor="middle" className={styles.pointLabel}>a)</text>
      </g>

      <g transform="translate(280 46)">
        <rect x="55" y="54" width="160" height="166" fill="var(--medical-color-primary, #314adc)" opacity="0.08" />
        <path d="M55 220 L55 54 M215 54 L215 220 M55 220 L215 220" className={styles.axis} />
        <line x1="55" y1="78" x2="215" y2="78" className={styles.guide} />
        <text x="135" y="250" textAnchor="middle" className={styles.coordinate}>{base}</text>
        <text x="238" y="142" className={styles.intervalLabel}>{height}</text>
        <text x="135" y="286" textAnchor="middle" className={styles.pointLabel}>b)</text>
      </g>

      <g transform="translate(480 46)">
        <path d="M55 220 L92 54 L178 54 L215 220 Z" fill="var(--medical-color-primary, #314adc)" opacity="0.08" transform="matrix(-1 0 0 1 270 0)" />
        <path d="M55 220 L18 54 M252 54 L215 220 M55 220 L215 220" className={styles.axis} />
        <line x1="18" y1="78" x2="252" y2="78" className={styles.guide} />
        <text x="135" y="250" textAnchor="middle" className={styles.coordinate}>{base}</text>
        <text x="276" y="142" className={styles.intervalLabel}>{height}</text>
        <text x="135" y="286" textAnchor="middle" className={styles.pointLabel}>c)</text>
      </g>
    </svg>
  );
}

function isUniformMotionFigure(value: LessonDiagramBlock) {
  return value.startPointLabel?.trim() === "t = 0" && value.intervalLabel?.replace(/\s+/g, "").toLowerCase() === "s=x";
}

export default function LessonDiagram({ value }: { value: LessonDiagramBlock }) {
  if (!value) return null;

  return (
    <figure className={styles.card} data-lesson-diagram="true">
      <header className={styles.header}>
        <span className={styles.badge}>FIGURË</span>
        {value.title ? <strong>{value.title}</strong> : null}
      </header>
      <div className={styles.canvas}>
        {value.kind === "curvedVelocity"
          ? <CurvedVelocityDiagram value={value} />
          : value.kind === "hydrostaticPressure"
            ? <HydrostaticPressureDiagram value={value} />
            : value.kind === "hydrostaticParadox"
              ? <HydrostaticParadoxDiagram value={value} />
              : isUniformMotionFigure(value)
                ? <UniformMotionAxisDiagram value={value} />
                : <LinearPositionDiagram value={value} />}
      </div>
      {value.explanation ? <p className={styles.explanation}>{value.explanation}</p> : null}
      {value.caption ? <figcaption>{value.caption}</figcaption> : null}
    </figure>
  );
}
