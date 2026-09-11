import {chapter} from './chapter'
import {grade} from './grade'
import {lesson} from './lesson'
import {lessonDiagram} from './lesson-diagram'
import {lessonFlashcard} from './lesson-flashcard'
import {lessonFormula} from './lesson-formula'
import {lessonFormulaVariable} from './lesson-formula-variable'
import {lessonTable} from './lesson-table'
import {lessonTableCell} from './lesson-table-cell'
import {lessonTableRow} from './lesson-table-row'
import {subject} from './subject'

export const schemaTypes = [
  grade,
  subject,
  chapter,
  lessonFlashcard,
  lessonFormulaVariable,
  lessonFormula,
  lessonDiagram,
  lessonTableCell,
  lessonTableRow,
  lessonTable,
  lesson,
]
