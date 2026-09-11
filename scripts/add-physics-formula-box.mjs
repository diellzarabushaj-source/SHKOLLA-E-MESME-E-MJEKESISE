import {readFileSync, writeFileSync} from "node:fs";

const path = "app/SchoolLearningPortal.tsx";
let source = readFileSync(path, "utf8").replace(/\r\n?/g, "\n");

const importLine = 'import LessonTable, { type LessonTableBlock } from "./LessonTable";';
const formulaImport = 'import LessonFormula, { type LessonFormulaBlock } from "./LessonFormula";';
const diagramImport = 'import LessonDiagram, { type LessonDiagramBlock } from "./LessonDiagram";';

if (!source.includes(formulaImport)) {
  if (!source.includes(importLine)) throw new Error("Formula UI: LessonTable import anchor not found");
  source = source.replace(importLine, `${importLine}\n${formulaImport}`);
}

if (!source.includes(diagramImport)) {
  const anchor = source.includes(formulaImport) ? formulaImport : importLine;
  if (!source.includes(anchor)) throw new Error("Diagram UI: import anchor not found");
  source = source.replace(anchor, `${anchor}\n${diagramImport}`);
}

const rendererLine = '    lessonTable: ({ value }) => <LessonTable value={value as LessonTableBlock} />,';
const formulaRenderer = '    lessonFormula: ({ value }) => <LessonFormula value={value as LessonFormulaBlock} />,';
const diagramRenderer = '    lessonDiagram: ({ value }) => <LessonDiagram value={value as LessonDiagramBlock} />,';

if (!source.includes(formulaRenderer)) {
  if (!source.includes(rendererLine)) throw new Error("Formula UI: PortableText renderer anchor not found");
  source = source.replace(rendererLine, `${rendererLine}\n${formulaRenderer}`);
}

if (!source.includes(diagramRenderer)) {
  const anchor = source.includes(formulaRenderer) ? formulaRenderer : rendererLine;
  if (!source.includes(anchor)) throw new Error("Diagram UI: PortableText renderer anchor not found");
  source = source.replace(anchor, `${anchor}\n${diagramRenderer}`);
}

writeFileSync(path, source);
console.log("Physics formula and diagram UI enabled in SchoolLearningPortal.tsx");
