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

export type LessonFormulaUnitStep = {
  _key?: string;
  label?: string;
  expression?: string;
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

export default function LessonFormula({ value }: { value: LessonFormulaBlock }) {
  const variables = Array.isArray(value.variables)
    ? value.variables.filter((item) => item?.symbol || item?.meaning || item?.unit)
    : [];
  const formulaForms = Array.isArray(value.formulaForms)
    ? value.formulaForms.filter((item) => item?.label || item?.expression)
    : [];
  const unitLogic = Array.isArray(value.unitLogic)
    ? value.unitLogic.filter((item) => item?.label || item?.expression || item?.explanation)
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
              <span className={styles.unit}>{variable.unit || "—"}</span>
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
                <code className={styles.quantityExpression} role="math">{item.expression || "—"}</code>
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
            {unitLogic.map((item, index) => (
              <div className={styles.unitStep} key={item._key || `${item.label}-${index}`}>
                <div className={styles.unitStepTop}>
                  <strong>{item.label || "Kontrolli"}</strong>
                  <code className={styles.unitExpression} role="math">{item.expression || "—"}</code>
                </div>
                {item.explanation ? <p>{item.explanation}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {value.sourceNote ? <p className={styles.note}>{value.sourceNote}</p> : null}
    </aside>
  );
}
