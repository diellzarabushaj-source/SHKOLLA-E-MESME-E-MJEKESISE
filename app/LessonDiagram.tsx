import styles from "./LessonDiagram.module.css";

export type LessonDiagramBlock = {
  _key?: string;
  _type?: "lessonDiagram";
  kind?:
    | "linearPosition"
    | "curvedVelocity"
    | "hydrostaticPressure"
    | "hydrostaticParadox"
    | "pascalTransmission"
    | "pascalEqualPressure"
    | "communicatingVessels"
    | "hydraulicPress"
    | "surfaceEnergy"
    | "surfaceTensionFilm"
    | "capillaryWetting"
    | "capillaryLevels"
    | "capillaryBalance"
    | "fluidStreamlines"
    | "continuityTube";
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

function ArrowDefs() {
  return (
    <defs>
      <marker id="diag-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
        <path d="M0,0 L10,5 L0,10 Z" className={styles.velocityArrowFill} />
      </marker>
      <marker id="diag-arrow-dark" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
        <path d="M0,0 L10,5 L0,10 Z" className={styles.arrowFill} />
      </marker>
      <marker id="diag-open-start" markerWidth="8" markerHeight="8" refX="2" refY="4" orient="auto">
        <path d="M8,0 L0,4 L8,8" className={styles.intervalStroke} />
      </marker>
      <marker id="diag-open-end" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8" className={styles.intervalStroke} />
      </marker>
    </defs>
  );
}

function LinearPositionDiagram({ value }: { value: LessonDiagramBlock }) {
  const axis = value.axisLabel || "x";
  const pointA = value.startPointLabel || "A";
  const pointB = value.endPointLabel || "B";
  const x0 = value.startCoordinateLabel || "x₀";
  const x = value.endCoordinateLabel || "x";
  const delta = value.intervalLabel || "Δx = x − x₀";
  return (
    <svg className={styles.svg} viewBox="0 0 760 260" role="img">
      <ArrowDefs />
      <line x1="72" y1="156" x2="692" y2="156" className={styles.axis} markerEnd="url(#diag-arrow-dark)" />
      <text x="712" y="162" className={styles.axisText}>{axis}</text>
      <line x1="270" y1="138" x2="270" y2="174" className={styles.tick} />
      <line x1="558" y1="138" x2="558" y2="174" className={styles.tick} />
      <circle cx="270" cy="156" r="7" className={styles.point} />
      <circle cx="558" cy="156" r="7" className={styles.point} />
      <text x="270" y="118" textAnchor="middle" className={styles.pointLabel}>{pointA}</text>
      <text x="558" y="118" textAnchor="middle" className={styles.pointLabel}>{pointB}</text>
      <text x="270" y="204" textAnchor="middle" className={styles.coordinate}>{x0}</text>
      <text x="558" y="204" textAnchor="middle" className={styles.coordinate}>{x}</text>
      <line x1="282" y1="82" x2="546" y2="82" className={styles.interval} markerStart="url(#diag-open-start)" markerEnd="url(#diag-open-end)" />
      <line x1="270" y1="94" x2="270" y2="128" className={styles.guide} />
      <line x1="558" y1="94" x2="558" y2="128" className={styles.guide} />
      <text x="414" y="60" textAnchor="middle" className={styles.intervalLabel}>{delta}</text>
    </svg>
  );
}

function UniformMotionAxisDiagram({ value }: { value: LessonDiagramBlock }) {
  return (
    <svg className={styles.svg} viewBox="0 0 760 280" role="img">
      <ArrowDefs />
      <line x1="176" y1="178" x2="682" y2="178" className={styles.axis} markerEnd="url(#diag-arrow-dark)" />
      <line x1="176" y1="178" x2="102" y2="232" className={styles.axis} markerEnd="url(#diag-arrow-dark)" />
      <line x1="176" y1="178" x2="176" y2="54" className={styles.axis} markerEnd="url(#diag-arrow-dark)" />
      <text x="704" y="184" className={styles.axisText}>{value.axisLabel || "x"}</text>
      <text x="82" y="246" className={styles.axisText}>y</text>
      <text x="166" y="40" className={styles.axisText}>z</text>
      <circle cx="176" cy="178" r="9" className={styles.point} />
      <circle cx="560" cy="178" r="10" className={styles.point} />
      <text x="176" y="216" textAnchor="middle" className={styles.coordinate}>{value.startPointLabel || "t = 0"}</text>
      <text x="370" y="148" textAnchor="middle" className={styles.intervalLabel}>{value.intervalLabel || "s = x"}</text>
      <text x="560" y="216" textAnchor="middle" className={styles.coordinate}>{value.endCoordinateLabel || "x"}</text>
    </svg>
  );
}

function CurvedVelocityDiagram({ value }: { value: LessonDiagramBlock }) {
  return (
    <svg className={styles.svg} viewBox="0 0 760 340" role="img">
      <ArrowDefs />
      <path d="M180 300 C205 250 210 190 270 150 C320 116 382 126 422 170 C458 211 476 264 532 254 C590 244 618 190 612 132" className={styles.trajectory} />
      <path d="M278 148 C330 118 386 132 425 173 C452 201 465 230 487 246" className={styles.arcHighlight} />
      <circle cx="282" cy="143" r="8" className={styles.point} />
      <circle cx="503" cy="252" r="8" className={styles.point} />
      <line x1="282" y1="143" x2="365" y2="104" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <line x1="503" y1="252" x2="554" y2="309" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <text x="261" y="127" className={styles.pointLabel}>{value.startPointLabel || "1"}</text>
      <text x="514" y="239" className={styles.pointLabel}>{value.endPointLabel || "2"}</text>
      <text x="332" y="88" className={styles.vectorLabel}>{value.startVectorLabel || "v₁"}</text>
      <text x="560" y="318" className={styles.vectorLabel}>{value.endVectorLabel || "v₂"}</text>
      <text x="342" y="215" className={styles.intervalLabel}>{value.intervalLabel || "Δs"}</text>
      <text x="224" y="169" className={styles.coordinate}>{value.startCoordinateLabel || "t"}</text>
      <text x="520" y="278" className={styles.coordinate}>{value.endCoordinateLabel || "t + Δt"}</text>
    </svg>
  );
}

function HydrostaticPressureDiagram({ value }: { value: LessonDiagramBlock }) {
  return (
    <svg className={styles.svg} viewBox="0 0 760 340" role="img">
      <ArrowDefs />
      <rect x="150" y="62" width="460" height="230" rx="8" fill="none" className={styles.axis} />
      <rect x="154" y="92" width="452" height="196" fill="var(--medical-color-primary, #314adc)" opacity="0.08" />
      <line x1="154" y1="92" x2="606" y2="92" className={styles.guide} />
      <rect x="330" y="130" width="100" height="108" rx="46" fill="var(--medical-color-bg-container, #fff)" className={styles.axis} />
      <line x1="380" y1="80" x2="380" y2="127" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <line x1="380" y1="286" x2="380" y2="241" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <text x="398" y="72" className={styles.vectorLabel}>{value.startVectorLabel || "p₀ΔS"}</text>
      <text x="398" y="310" className={styles.vectorLabel}>{value.endVectorLabel || "pΔS"}</text>
      <text x="380" y="126" textAnchor="middle" className={styles.coordinate}>ΔS</text>
      <text x="380" y="263" textAnchor="middle" className={styles.coordinate}>ΔS</text>
      <line x1="486" y1="136" x2="486" y2="232" className={styles.interval} markerStart="url(#diag-open-start)" markerEnd="url(#diag-open-end)" />
      <text x="508" y="190" className={styles.intervalLabel}>{value.intervalLabel || "h"}</text>
    </svg>
  );
}

function HydrostaticParadoxDiagram({ value }: { value: LessonDiagramBlock }) {
  const h = value.intervalLabel || "h";
  const s = value.axisLabel || "S";
  return (
    <svg className={styles.svg} viewBox="0 0 760 330" role="img">
      {[80, 300, 520].map((x, i) => (
        <g key={x} transform={`translate(${x} 46)`}>
          {i === 0 ? <path d="M35 220 L72 54 L158 54 L195 220 Z" fill="var(--medical-color-primary, #314adc)" opacity="0.08" /> : null}
          {i === 1 ? <rect x="35" y="54" width="160" height="166" fill="var(--medical-color-primary, #314adc)" opacity="0.08" /> : null}
          {i === 2 ? <path d="M35 220 L-2 54 L232 54 L195 220 Z" fill="var(--medical-color-primary, #314adc)" opacity="0.08" /> : null}
          {i === 0 ? <path d="M35 220 L72 54 M158 54 L195 220 M35 220 L195 220" className={styles.axis} /> : null}
          {i === 1 ? <path d="M35 220 L35 54 M195 54 L195 220 M35 220 L195 220" className={styles.axis} /> : null}
          {i === 2 ? <path d="M35 220 L-2 54 M232 54 L195 220 M35 220 L195 220" className={styles.axis} /> : null}
          <text x="115" y="250" textAnchor="middle" className={styles.coordinate}>{s}</text>
          <text x="210" y="142" className={styles.intervalLabel}>{h}</text>
          <text x="115" y="286" textAnchor="middle" className={styles.pointLabel}>{String.fromCharCode(97 + i)})</text>
        </g>
      ))}
    </svg>
  );
}

function PascalTransmissionDiagram({ value }: { value: LessonDiagramBlock }) {
  const force = value.startVectorLabel || "F";
  const rays = [0,45,90,135,180,225,270,315];
  return (
    <svg className={styles.svg} viewBox="0 0 760 330" role="img">
      <ArrowDefs />
      <circle cx="400" cy="170" r="92" fill="var(--medical-color-primary, #314adc)" opacity="0.08" />
      <circle cx="400" cy="170" r="92" fill="none" className={styles.axis} />
      <rect x="218" y="142" width="92" height="56" fill="var(--medical-color-bg-container, #fff)" className={styles.axis} />
      <line x1="150" y1="170" x2="215" y2="170" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <text x="154" y="147" className={styles.vectorLabel}>{force}</text>
      {rays.map((deg) => {
        const r1 = 102; const r2 = 142; const a = deg * Math.PI / 180;
        return <line key={deg} x1={400 + Math.cos(a)*r1} y1={170 + Math.sin(a)*r1} x2={400 + Math.cos(a)*r2} y2={170 + Math.sin(a)*r2} className={styles.velocityVector} markerEnd="url(#diag-arrow)" />;
      })}
      <text x="400" y="176" textAnchor="middle" className={styles.intervalLabel}>p</text>
    </svg>
  );
}

function PascalEqualPressureDiagram({ value }: { value: LessonDiagramBlock }) {
  return (
    <svg className={styles.svg} viewBox="0 0 760 340" role="img">
      <ArrowDefs />
      <circle cx="390" cy="180" r="92" fill="var(--medical-color-primary, #314adc)" opacity="0.08" />
      <circle cx="390" cy="180" r="92" fill="none" className={styles.axis} />
      <rect x="358" y="38" width="64" height="58" fill="var(--medical-color-bg-container, #fff)" className={styles.axis} />
      <rect x="205" y="153" width="92" height="54" fill="var(--medical-color-bg-container, #fff)" className={styles.axis} />
      <rect x="483" y="153" width="92" height="54" fill="var(--medical-color-bg-container, #fff)" className={styles.axis} />
      <line x1="390" y1="18" x2="390" y2="36" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <line x1="168" y1="180" x2="203" y2="180" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <line x1="612" y1="180" x2="577" y2="180" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <text x="410" y="26" className={styles.vectorLabel}>{value.startVectorLabel || "F"}</text>
      <text x="155" y="154" className={styles.vectorLabel}>F₁</text>
      <text x="590" y="154" className={styles.vectorLabel}>F₂</text>
      <text x="244" y="226" className={styles.coordinate}>{value.startCoordinateLabel || "S₁"}</text>
      <text x="520" y="226" className={styles.coordinate}>{value.endCoordinateLabel || "S₂"}</text>
      <text x="390" y="186" textAnchor="middle" className={styles.intervalLabel}>p = F/S = F₁/S₁ = F₂/S₂</text>
    </svg>
  );
}

function CommunicatingVesselsDiagram({ value }: { value: LessonDiagramBlock }) {
  return (
    <svg className={styles.svg} viewBox="0 0 760 330" role="img">
      <ArrowDefs />
      <path d="M190 72 L190 245 Q190 270 215 270 L545 270 Q570 270 570 245 L570 72" className={styles.axis} />
      <path d="M220 114 L220 238 Q220 242 226 242 L534 242 Q540 242 540 238 L540 114" fill="none" className={styles.guide} />
      <rect x="192" y="115" width="376" height="125" fill="var(--medical-color-primary, #314adc)" opacity="0.08" />
      <line x1="190" y1="114" x2="220" y2="114" className={styles.guide} />
      <line x1="540" y1="114" x2="570" y2="114" className={styles.guide} />
      <text x="174" y="104" className={styles.coordinate}>{value.startCoordinateLabel || "S₁"}</text>
      <text x="576" y="104" className={styles.coordinate}>{value.endCoordinateLabel || "S₂"}</text>
      <text x="380" y="298" textAnchor="middle" className={styles.intervalLabel}>{value.intervalLabel || "p₁ = p₂"}</text>
    </svg>
  );
}

function HydraulicPressDiagram({ value }: { value: LessonDiagramBlock }) {
  return (
    <svg className={styles.svg} viewBox="0 0 760 360" role="img">
      <ArrowDefs />
      <path d="M130 268 L130 160 L240 160 L240 268 L530 268 L530 116 L650 116 L650 268 Z" fill="var(--medical-color-primary, #314adc)" opacity="0.08" />
      <path d="M130 268 L130 160 L240 160 L240 268 L530 268 L530 116 L650 116 L650 268" className={styles.axis} />
      <rect x="144" y="146" width="82" height="20" fill="var(--medical-color-bg-container, #fff)" className={styles.axis} />
      <rect x="544" y="102" width="92" height="20" fill="var(--medical-color-bg-container, #fff)" className={styles.axis} />
      <line x1="185" y1="72" x2="185" y2="142" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <line x1="590" y1="146" x2="590" y2="82" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <text x="202" y="86" className={styles.vectorLabel}>{value.startVectorLabel || "F₁"}</text>
      <text x="606" y="88" className={styles.vectorLabel}>{value.endVectorLabel || "F₂"}</text>
      <text x="185" y="193" textAnchor="middle" className={styles.coordinate}>{value.startCoordinateLabel || "S₁"}</text>
      <text x="590" y="149" textAnchor="middle" className={styles.coordinate}>{value.endCoordinateLabel || "S₂"}</text>
      <rect x="532" y="34" width="116" height="38" rx="8" fill="none" className={styles.axis} />
      <circle cx="554" cy="74" r="12" fill="none" className={styles.axis} />
      <circle cx="626" cy="74" r="12" fill="none" className={styles.axis} />
      <text x="380" y="324" textAnchor="middle" className={styles.intervalLabel}>{value.intervalLabel || "F₁/S₁ = F₂/S₂"}</text>
    </svg>
  );
}

function SurfaceEnergyDiagram({ value }: { value: LessonDiagramBlock }) {
  const ring = [0, 45, 90, 135, 180, 225, 270, 315];
  const surfaceNeighbors = [
    [442, 82], [486, 82], [530, 82], [574, 82], [618, 82],
    [464, 122], [508, 122], [552, 122], [596, 122],
    [486, 162], [530, 162], [574, 162],
  ];
  return (
    <svg className={styles.svg} viewBox="0 0 760 380" role="img" aria-label="Molekulë në brendi dhe molekulë në sipërfaqen e lirë të lëngut">
      <ArrowDefs />
      <text x="205" y="42" textAnchor="middle" className={styles.pointLabel}>Molekulë në brendi</text>
      <circle cx="205" cy="202" r="22" fill="none" className={styles.axis} />
      {ring.map((deg) => {
        const a = deg * Math.PI / 180;
        const cx = 205 + Math.cos(a) * 62;
        const cy = 202 + Math.sin(a) * 62;
        return <circle key={`n-${deg}`} cx={cx} cy={cy} r="20" fill="none" className={styles.axis} />;
      })}
      {ring.map((deg) => {
        const a = deg * Math.PI / 180;
        return <line key={`a-${deg}`} x1="205" y1="202" x2={205 + Math.cos(a) * 44} y2={202 + Math.sin(a) * 44} className={styles.velocityVector} markerEnd="url(#diag-arrow)" />;
      })}
      <text x="205" y="316" textAnchor="middle" className={styles.intervalLabel}>R = 0</text>
      <text x="536" y="42" textAnchor="middle" className={styles.pointLabel}>Molekulë në sipërfaqe</text>
      <line x1="392" y1="61" x2="668" y2="61" className={styles.guide} />
      {surfaceNeighbors.map(([cx, cy], index) => (
        <circle key={`s-${index}`} cx={cx} cy={cy} r="20" fill="none" className={styles.axis} />
      ))}
      <circle cx="530" cy="82" r="22" fill="var(--medical-color-primary, #314adc)" opacity="0.12" className={styles.axis} />
      <line x1="530" y1="82" x2="486" y2="122" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <line x1="530" y1="82" x2="530" y2="150" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <line x1="530" y1="82" x2="574" y2="122" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <line x1="530" y1="82" x2="530" y2="230" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <text x="552" y="238" className={styles.vectorLabel}>{value.startVectorLabel || "F"}</text>
      <text x="530" y="316" textAnchor="middle" className={styles.coordinate}>forcat nuk kompensohen plotësisht</text>
    </svg>
  );
}

function SurfaceTensionFilmDiagram({ value }: { value: LessonDiagramBlock }) {
  return (
    <svg className={styles.svg} viewBox="0 0 760 360" role="img" aria-label="Film i hollë lëngu me shufrën lëvizëse AB">
      <ArrowDefs />
      <rect x="145" y="72" width="455" height="220" fill="var(--medical-color-primary, #314adc)" opacity="0.07" />
      <rect x="145" y="72" width="455" height="220" fill="none" className={styles.axis} />
      <line x1="500" y1="72" x2="500" y2="292" className={styles.guide} strokeDasharray="8 7" />
      <line x1="552" y1="72" x2="552" y2="292" className={styles.axis} />
      <text x="566" y="90" className={styles.pointLabel}>{value.startPointLabel || "A"}</text>
      <text x="566" y="294" className={styles.pointLabel}>{value.endPointLabel || "B"}</text>
      <line x1="620" y1="182" x2="558" y2="182" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <text x="626" y="170" className={styles.vectorLabel}>{value.startVectorLabel || "F"}</text>
      <line x1="504" y1="322" x2="548" y2="322" className={styles.interval} markerStart="url(#diag-open-start)" markerEnd="url(#diag-open-end)" />
      <text x="526" y="346" textAnchor="middle" className={styles.intervalLabel}>{value.intervalLabel || "Δx"}</text>
      <line x1="112" y1="78" x2="112" y2="286" className={styles.interval} markerStart="url(#diag-open-start)" markerEnd="url(#diag-open-end)" />
      <text x="92" y="187" textAnchor="middle" className={styles.intervalLabel}>{value.axisLabel || "l"}</text>
      <text x="318" y="166" textAnchor="middle" className={styles.coordinate}>film i hollë i lëngut</text>
      <text x="318" y="194" textAnchor="middle" className={styles.coordinate}>dy sipërfaqe</text>
      <text x="526" y="52" textAnchor="middle" className={styles.coordinate}>shufra AB zhvendoset</text>
    </svg>
  );
}

function CapillaryWettingDiagram() {
  return (
    <svg className={styles.svg} viewBox="0 0 760 360" role="img" aria-label="Lagia dhe moslagia e qelqit nga lëngu">
      <ArrowDefs />
      <text x="190" y="38" textAnchor="middle" className={styles.pointLabel}>Ujë - qelq</text>
      <line x1="90" y1="70" x2="90" y2="300" className={styles.axis} />
      <path d="M90 206 Q150 158 250 206" fill="none" className={styles.trajectory} />
      <path d="M90 206 L90 300 L250 300 L250 206 Q150 158 90 206" fill="var(--medical-color-primary, #314adc)" opacity="0.08" />
      <line x1="126" y1="194" x2="98" y2="151" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <line x1="126" y1="194" x2="175" y2="220" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <text x="86" y="142" className={styles.vectorLabel}>Fₐ</text>
      <text x="176" y="238" className={styles.vectorLabel}>Fₖ</text>
      <text x="145" y="334" textAnchor="middle" className={styles.coordinate}>θ &lt; 90° - lag enën</text>
      <text x="565" y="38" textAnchor="middle" className={styles.pointLabel}>Merkur - qelq</text>
      <line x1="470" y1="70" x2="470" y2="300" className={styles.axis} />
      <path d="M470 220 Q540 168 650 220" fill="none" className={styles.trajectory} />
      <path d="M470 220 L470 300 L650 300 L650 220 Q540 168 470 220" fill="var(--medical-color-primary, #314adc)" opacity="0.08" />
      <line x1="505" y1="206" x2="478" y2="165" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <line x1="505" y1="206" x2="558" y2="184" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <text x="465" y="157" className={styles.vectorLabel}>Fₐ</text>
      <text x="562" y="176" className={styles.vectorLabel}>Fₖ</text>
      <text x="555" y="334" textAnchor="middle" className={styles.coordinate}>90° &lt; θ &lt; 180° - nuk e lag enën</text>
    </svg>
  );
}

function CapillaryLevelsDiagram() {
  const tubes = [170, 260, 350];
  const widths = [42, 28, 18];
  const rise = [176, 145, 112];
  return (
    <svg className={styles.svg} viewBox="0 0 760 390" role="img" aria-label="Elevacioni dhe depresioni kapilar">
      <text x="210" y="34" textAnchor="middle" className={styles.pointLabel}>Elevacion kapilar</text>
      <rect x="70" y="205" width="310" height="115" fill="var(--medical-color-primary, #314adc)" opacity="0.08" />
      <line x1="70" y1="205" x2="380" y2="205" className={styles.guide} />
      {tubes.map((x, i) => (
        <g key={x}>
          <path d={`M${x-widths[i]} 70 L${x-widths[i]} 320 M${x+widths[i]} 70 L${x+widths[i]} 320`} className={styles.axis} />
          <rect x={x-widths[i]+2} y={rise[i]} width={2*widths[i]-4} height={320-rise[i]} fill="var(--medical-color-primary, #314adc)" opacity="0.11" />
          <path d={`M${x-widths[i]+2} ${rise[i]} Q${x} ${rise[i]+16} ${x+widths[i]-2} ${rise[i]}`} fill="none" className={styles.trajectory} />
        </g>
      ))}
      <text x="215" y="354" textAnchor="middle" className={styles.coordinate}>R më i vogël → h më e madhe</text>
      <text x="575" y="34" textAnchor="middle" className={styles.pointLabel}>Depresion kapilar</text>
      <rect x="450" y="175" width="240" height="145" fill="var(--medical-color-primary, #314adc)" opacity="0.08" />
      <line x1="450" y1="175" x2="690" y2="175" className={styles.guide} />
      {[525, 610].map((x, i) => (
        <g key={x}>
          <path d={`M${x-24+i*8} 70 L${x-24+i*8} 320 M${x+24-i*8} 70 L${x+24-i*8} 320`} className={styles.axis} />
          <rect x={x-22+i*8} y={215+i*22} width={44-i*16} height={105-i*22} fill="var(--medical-color-primary, #314adc)" opacity="0.11" />
          <path d={`M${x-22+i*8} ${215+i*22} Q${x} ${195+i*22} ${x+22-i*8} ${215+i*22}`} fill="none" className={styles.trajectory} />
        </g>
      ))}
      <text x="570" y="354" textAnchor="middle" className={styles.coordinate}>niveli në kapilar bie nën nivelin e enës</text>
    </svg>
  );
}

function CapillaryBalanceDiagram({ value }: { value: LessonDiagramBlock }) {
  return (
    <svg className={styles.svg} viewBox="0 0 760 390" role="img" aria-label="Baraspesha e forcave në kapilar">
      <ArrowDefs />
      <rect x="125" y="225" width="510" height="95" fill="var(--medical-color-primary, #314adc)" opacity="0.08" />
      <line x1="125" y1="225" x2="635" y2="225" className={styles.guide} />
      <path d="M330 55 L330 320 M430 55 L430 320" className={styles.axis} />
      <rect x="333" y="124" width="94" height="196" fill="var(--medical-color-primary, #314adc)" opacity="0.12" />
      <path d="M333 124 Q380 148 427 124" fill="none" className={styles.trajectory} />
      <line x1="304" y1="225" x2="304" y2="124" className={styles.interval} markerStart="url(#diag-open-start)" markerEnd="url(#diag-open-end)" />
      <text x="282" y="178" className={styles.intervalLabel}>{value.intervalLabel || "h"}</text>
      <line x1="380" y1="123" x2="380" y2="72" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <text x="395" y="84" className={styles.vectorLabel}>{value.startVectorLabel || "F = σ·2πR"}</text>
      <line x1="380" y1="170" x2="380" y2="218" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <text x="397" y="210" className={styles.vectorLabel}>{value.endVectorLabel || "mg"}</text>
      <line x1="334" y1="350" x2="426" y2="350" className={styles.interval} markerStart="url(#diag-open-start)" markerEnd="url(#diag-open-end)" />
      <text x="380" y="377" textAnchor="middle" className={styles.coordinate}>diametri = 2R</text>
    </svg>
  );
}

function FluidStreamlinesDiagram() {
  const ys = [92, 122, 152, 182, 212, 242];
  return (
    <svg className={styles.svg} viewBox="0 0 760 340" role="img" aria-label="Vijat e rrymimit në një gyp që ngushtohet">
      <ArrowDefs />
      <path d="M90 72 L330 72 Q430 72 500 126 L670 126 M90 262 L330 262 Q430 262 500 208 L670 208" fill="none" className={styles.axis} />
      {ys.map((y, i) => {
        const endY = 138 + i * 12;
        return <path key={y} d={`M105 ${y} C310 ${y} 405 ${y} 500 ${endY} L645 ${endY}`} fill="none" className={styles.trajectory} markerEnd="url(#diag-arrow-dark)" />;
      })}
      <text x="190" y="302" textAnchor="middle" className={styles.coordinate}>vijat më të rralla → shpejtësi më e vogël</text>
      <text x="575" y="302" textAnchor="middle" className={styles.coordinate}>vijat më të dendura → shpejtësi më e madhe</text>
      <text x="380" y="42" textAnchor="middle" className={styles.pointLabel}>tub rryme</text>
    </svg>
  );
}

function ContinuityTubeDiagram({ value }: { value: LessonDiagramBlock }) {
  return (
    <svg className={styles.svg} viewBox="0 0 760 360" role="img" aria-label="Ekuacioni i kontinuitetit në dy prerje të gypit">
      <ArrowDefs />
      <path d="M90 88 L310 88 Q420 88 500 136 L670 136 M90 272 L310 272 Q420 272 500 224 L670 224" fill="none" className={styles.axis} />
      <line x1="190" y1="88" x2="190" y2="272" className={styles.guide} strokeDasharray="7 6" />
      <line x1="575" y1="136" x2="575" y2="224" className={styles.guide} strokeDasharray="7 6" />
      <text x="165" y="78" className={styles.pointLabel}>{value.startPointLabel || "A"}</text>
      <text x="550" y="126" className={styles.pointLabel}>{value.endPointLabel || "B"}</text>
      <text x="205" y="184" className={styles.intervalLabel}>{value.startCoordinateLabel || "S₁"}</text>
      <text x="590" y="184" className={styles.intervalLabel}>{value.endCoordinateLabel || "S₂"}</text>
      <line x1="230" y1="180" x2="330" y2="180" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <line x1="535" y1="180" x2="655" y2="180" className={styles.velocityVector} markerEnd="url(#diag-arrow)" />
      <text x="265" y="158" className={styles.vectorLabel}>{value.startVectorLabel || "v₁"}</text>
      <text x="586" y="158" className={styles.vectorLabel}>{value.endVectorLabel || "v₂"}</text>
      <text x="380" y="320" textAnchor="middle" className={styles.coordinate}>{value.intervalLabel || "v₁S₁ = v₂S₂"}</text>
    </svg>
  );
}

function isUniformMotionFigure(value: LessonDiagramBlock) {
  return value.startPointLabel?.trim() === "t = 0" && value.intervalLabel?.replace(/\s+/g, "").toLowerCase() === "s=x";
}

function DiagramCanvas({ value }: { value: LessonDiagramBlock }) {
  switch (value.kind) {
    case "curvedVelocity": return <CurvedVelocityDiagram value={value} />;
    case "hydrostaticPressure": return <HydrostaticPressureDiagram value={value} />;
    case "hydrostaticParadox": return <HydrostaticParadoxDiagram value={value} />;
    case "pascalTransmission": return <PascalTransmissionDiagram value={value} />;
    case "pascalEqualPressure": return <PascalEqualPressureDiagram value={value} />;
    case "communicatingVessels": return <CommunicatingVesselsDiagram value={value} />;
    case "hydraulicPress": return <HydraulicPressDiagram value={value} />;
    case "surfaceEnergy": return <SurfaceEnergyDiagram value={value} />;
    case "surfaceTensionFilm": return <SurfaceTensionFilmDiagram value={value} />;
    case "capillaryWetting": return <CapillaryWettingDiagram />;
    case "capillaryLevels": return <CapillaryLevelsDiagram />;
    case "capillaryBalance": return <CapillaryBalanceDiagram value={value} />;
    case "fluidStreamlines": return <FluidStreamlinesDiagram />;
    case "continuityTube": return <ContinuityTubeDiagram value={value} />;
    default: return isUniformMotionFigure(value) ? <UniformMotionAxisDiagram value={value} /> : <LinearPositionDiagram value={value} />;
  }
}

export default function LessonDiagram({ value }: { value: LessonDiagramBlock }) {
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
