import {chapter} from './chapter'
import {grade} from './grade'
import {lesson} from './lesson'
import {lessonFlashcard} from './lesson-flashcard'
import {lessonTable} from './lesson-table'
import {lessonTableCell} from './lesson-table-cell'
import {lessonTableRow} from './lesson-table-row'
import {subject} from './subject'

export const schemaTypes = [
  grade,
  subject,
  chapter,
  lessonFlashcard,
  lessonTableCell,
  lessonTableRow,
  lessonTable,
  lesson,
]
