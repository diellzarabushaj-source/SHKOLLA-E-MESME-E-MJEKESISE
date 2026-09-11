import styles from "./LessonFormula.module.css";

export type LessonFormulaVariable = {
  _key?: string;
  symbol?: string;
  meaning?: string;
  unit?: string;
};

export type LessonFormulaForm = {
  _key?: string;
  label?: string;
  expression?: string;
};

export type UnitMathToken = {
  _key?: string;
  text?: string;
  cancelled?: boolean;
};

export type UnitMathPart = {
  _key?: string;
  kind?: "text" | "fraction";
  text?: string;
  cancelled?: boolean;
  numerator?: UnitMathToken[];
  denominator?: UnitMathToken[];
};

export type LessonFormulaUnitStep = {
  _key?: string;
  label?: string;
  expression?: string;
  visualParts?: UnitMathPart[];
  explanation?: string;
};

export type LessonFormulaBlock = {
  _key?: string;
  _type?: "lessonFormula";
  title?: string;
  formula?: string;
  description?: string;
  variables?: LessonFormulaVariable[];
  formulaForms?: LessonFormulaForm[];
  unitLogicIntro?: string;
  unitLogic?: LessonFormulaUnitStep[];
  sourceNote?: string;
};

function Fraction({ numerator = [], denominator = [] }: { numerator?: UnitMathToken[]; denominator?: UnitMathToken[] }) {
  return (
    <span className={styles.fraction} aria-label="thyesë">
      <span className={styles.numerator}>
        {numerator.map((token, index) => <MathToken key={token._key || `${token.text}-${index}`} token={token} />)}
      </span>
      <span className={styles.denominator}>
        {denominator.map((token, index) => <MathToken key={token._key || `${token.text}-${index}`} token={token} />)}
      </span>
    </span>
  );
}

function MathToken({ token }: { token: UnitMathToken }) {
  const text = token.text || "";
  const pieces = text.split("/").map((part) => part.trim());
  const content = pieces.length === 2 && pieces[0] && pieces[1]
    ? <Fraction numerator={[{text: pieces[0]}]} denominator={[{text: pieces[1]}]} />
    : text;

  return <span className={token.cancelled ? styles.cancelled : undefined}>{content}</span>;
}

function UnitVisualExpression({ parts }: { parts?: UnitMathPart[] }) {
  if (!Array.isArray(parts) || !parts.length) return null;

  return (
    <span className={styles.visualExpression} role="math">
      {parts.map((part, index) => {
        if (part.kind === "fraction") {
          return <Fraction key={part._key || `fraction-${index}`} numerator={part.numerator} denominator={part.denominator} />;
        }
        return (
          <span key={part._key || `${part.text}-${index}`} className={part.cancelled ? styles.cancelled : undefined}>
            {part.text || ""}
          </span>
        );
      })}
    </span>
  );
}

function SimpleFractionExpression({ expression }: { expression?: string }) {
  if (!expression) return <>—</>;
  const [left, right] = expression.split("=").map((part) => part.trim());
  if (!left || !right || !right.includes("/") || right.split("/").length !== 2) {
    return <>{expression}</>;
  }
  const [numerator, denominator] = right.split("/").map((part) => part.trim());
  return (
    <span className={styles.inlineEquation} role="math">
      <span>{left}</span><span>=</span>
      <Fraction numerator={[{text: numerator}]} denominator={[{text: denominator}]} />
    </span>
  );
}

function UnitDisplay({ unit }: { unit?: string }) {
  if (!unit) return <>—</>;
  if (unit.includes("/") && unit.split("/").length === 2) {
    const [numerator, denominator] = unit.split("/").map((part) => part.trim());
    return <Fraction numerator={[{text: numerator}]} denominator={[{text: denominator}]} />;
  }
  return <Fraction numerator={[{text: unit}]} denominator={[{text: "1"}]} />;
}

function normalizeLabel(value?: string) {
  return (value || "").trim().toLocaleLowerCase("sq-AL");
}

export default function LessonFormula({ value }: { value: LessonFormulaBlock }) {
  const variables = Array.isArray(value.variables)
    ? value.variables.filter((item) => item?.symbol || item?.meaning || item?.unit)
    : [];
  const formulaForms = Array.isArray(value.formulaForms)
    ? value.formulaForms.filter((item) => item?.label || item?.expression)
    : [];
  const unitLogic = Array.isArray(value.unitLogic)
    ? value.unitLogic.filter((item) => item?.label || item?.expression || item?.visualParts || item?.explanation)
    : [];

  if (!value.formula) return null;

  return (
    <aside className={styles.card} data-lesson-formula="true" aria-label={value.title || "Formulë"}>
      <header className={styles.header}>
        <span className={styles.badge}>FORMULË</span>
        {value.title && value.title.toLocaleLowerCase("sq-AL") !== "formulë" ? <strong>{value.title}</strong> : null}
      </header>

      <div className={styles.formula} role="math" aria-label={`Formula: ${value.formula}`}>
        {value.formula}
      </div>

      {value.description ? <p className={styles.description}>{value.description}</p> : null}

      {variables.length ? (
        <div className={styles.variables}>
          <div className={styles.tableHeader} aria-hidden="true">
            <span>Simboli</span>
            <span>Çfarë paraqet</span>
            <span>Njësia SI</span>
          </div>
          {variables.map((variable, index) => (
            <div className={styles.variableRow} key={variable._key || `${variable.symbol}-${index}`}>
              <code className={styles.quantitySymbol}>{variable.symbol || "—"}</code>
              <span>{variable.meaning || "—"}</span>
              <span className={styles.unit}><UnitDisplay unit={variable.unit} /></span>
            </div>
          ))}
        </div>
      ) : null}

      {formulaForms.length ? (
        <section className={styles.logicSection} aria-label="Logjika e formulës">
          <h4>Logjika e formulës</h4>
          <p className={styles.logicHint}>E njëjta formulë mund të riorganizohet sipas madhësisë që kërkohet.</p>
          <div className={styles.logicGrid}>
            {formulaForms.map((item, index) => (
              <div className={styles.logicRow} key={item._key || `${item.label}-${index}`}>
                <span>{item.label || "Madhësia"}</span>
                <code className={styles.quantityExpression}><SimpleFractionExpression expression={item.expression} /></code>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {unitLogic.length ? (
        <section className={styles.unitLogicSection} aria-label="Thjeshtimi i njësive">
          <h4>Thjeshtimi i njësive</h4>
          {value.unitLogicIntro ? <p className={styles.logicHint}>{value.unitLogicIntro}</p> : null}
          <div className={styles.unitSteps}>
            {unitLogic.map((item, index) => {
              const matchingFormula = formulaForms.find((formula) => normalizeLabel(formula.label) === normalizeLabel(item.label));

              return (
                <div className={styles.unitStep} key={item._key || `${item.label}-${index}`}>
                  <div className={styles.unitFormulaRow}>
                    <strong>{item.label || "Kontrolli"}</strong>
                    <div className={styles.unitFormulaValue}>
                      <span>Formula</span>
                      <code className={styles.unitFormulaExpression}>
                        <SimpleFractionExpression expression={matchingFormula?.expression} />
                      </code>
                    </div>
                  </div>

                  <div className={styles.unitStepTop}>
                    <span className={styles.unitsCaption}>Njësitë</span>
                    <code className={styles.unitExpression}>
                      {Array.isArray(item.visualParts) && item.visualParts.length
                        ? <UnitVisualExpression parts={item.visualParts} />
                        : item.expression || "—"}
                    </code>
                  </div>
                  {item.explanation ? <p>{item.explanation}</p> : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {value.sourceNote ? <p className={styles.note}>{value.sourceNote}</p> : null}
    </aside>
  );
}
