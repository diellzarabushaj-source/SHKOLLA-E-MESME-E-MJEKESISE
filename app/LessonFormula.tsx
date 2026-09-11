import styles from "./LessonFormula.module.css";

export type LessonFormulaVariable = {
  _key?: string;
  symbol?: string;
  meaning?: string;
  unit?: string;
};

export type LessonFormulaBlock = {
  _key?: string;
  _type?: "lessonFormula";
  title?: string;
  formula?: string;
  description?: string;
  variables?: LessonFormulaVariable[];
  sourceNote?: string;
};

export default function LessonFormula({ value }: { value: LessonFormulaBlock }) {
  const variables = Array.isArray(value.variables)
    ? value.variables.filter((item) => item?.symbol || item?.meaning || item?.unit)
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
            <span>Njësia</span>
          </div>
          {variables.map((variable, index) => (
            <div className={styles.variableRow} key={variable._key || `${variable.symbol}-${index}`}>
              <code>{variable.symbol || "—"}</code>
              <span>{variable.meaning || "—"}</span>
              <span className={styles.unit}>{variable.unit || "—"}</span>
            </div>
          ))}
        </div>
      ) : null}

      {value.sourceNote ? <p className={styles.note}>{value.sourceNote}</p> : null}
    </aside>
  );
}
