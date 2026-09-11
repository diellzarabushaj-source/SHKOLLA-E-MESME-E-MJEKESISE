import styles from "./LessonDiagram.module.css";

export type LessonDiagramBlock = {
  _key?: string;
  _type?: "lessonDiagram";
  kind?: "linearPosition";
  title?: string;
  caption?: string;
  explanation?: string;
  axisLabel?: string;
  startPointLabel?: string;
  endPointLabel?: string;
  startCoordinateLabel?: string;
  endCoordinateLabel?: string;
  intervalLabel?: string;
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

export default function LessonDiagram({ value }: { value: LessonDiagramBlock }) {
  if (!value) return null;

  return (
    <figure className={styles.card} data-lesson-diagram="true">
      <header className={styles.header}>
        <span className={styles.badge}>FIGURË</span>
        {value.title ? <strong>{value.title}</strong> : null}
      </header>
      <div className={styles.canvas}>
        <LinearPositionDiagram value={value} />
      </div>
      {value.explanation ? <p className={styles.explanation}>{value.explanation}</p> : null}
      {value.caption ? <figcaption>{value.caption}</figcaption> : null}
    </figure>
  );
}
