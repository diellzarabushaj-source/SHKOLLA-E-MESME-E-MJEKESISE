import {readFileSync, writeFileSync} from "node:fs";

const path = "app/SchoolLearningPortal.tsx";
let source = readFileSync(path, "utf8").replace(/\r\n?/g, "\n");

const formulaImport = 'import LessonFormula, { type LessonFormulaBlock } from "./LessonFormula";';
const tableImport = 'import LessonTable, { type LessonTableBlock } from "./LessonTable";';
const diagramImport = 'import LessonDiagram, { type LessonDiagramBlock } from "./LessonDiagram";';

if (!source.includes(diagramImport)) {
  const anchor = source.includes(formulaImport) ? formulaImport : tableImport;
  if (!source.includes(anchor)) throw new Error("Diagram UI: import anchor not found");
  source = source.replace(anchor, `${anchor}\n${diagramImport}`);
}

const formulaRenderer = '    lessonFormula: ({ value }) => <LessonFormula value={value as LessonFormulaBlock} />,';
const tableRenderer = '    lessonTable: ({ value }) => <LessonTable value={value as LessonTableBlock} />,';
const diagramRenderer = '    lessonDiagram: ({ value }) => <LessonDiagram value={value as LessonDiagramBlock} />,';

if (!source.includes(diagramRenderer)) {
  const anchor = source.includes(formulaRenderer) ? formulaRenderer : tableRenderer;
  if (!source.includes(anchor)) throw new Error("Diagram UI: PortableText renderer anchor not found");
  source = source.replace(anchor, `${anchor}\n${diagramRenderer}`);
}

writeFileSync(path, source);
console.log("Physics diagram UI enabled in SchoolLearningPortal.tsx");
