import {readFileSync, writeFileSync} from "node:fs";

const path = "app/SchoolLearningPortal.tsx";
let source = readFileSync(path, "utf8").replace(/\r\n?/g, "\n");

const importLine = 'import LessonTable, { type LessonTableBlock } from "./LessonTable";';
const formulaImport = 'import LessonFormula, { type LessonFormulaBlock } from "./LessonFormula";';

if (!source.includes(formulaImport)) {
  if (!source.includes(importLine)) throw new Error("Formula UI: LessonTable import anchor not found");
  source = source.replace(importLine, `${importLine}\n${formulaImport}`);
}

const rendererLine = '    lessonTable: ({ value }) => <LessonTable value={value as LessonTableBlock} />,';
const formulaRenderer = '    lessonFormula: ({ value }) => <LessonFormula value={value as LessonFormulaBlock} />,';

if (!source.includes(formulaRenderer)) {
  if (!source.includes(rendererLine)) throw new Error("Formula UI: PortableText renderer anchor not found");
  source = source.replace(rendererLine, `${rendererLine}\n${formulaRenderer}`);
}

writeFileSync(path, source);
console.log("Physics formula UI enabled in SchoolLearningPortal.tsx");
