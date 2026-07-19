import {chapter} from './chapter'
import {grade} from './grade'
import {lesson} from './lesson'
import {lessonFlashcard} from './lesson-flashcard'
import {lessonTable, lessonTableCell, lessonTableColumn, lessonTableRow} from './lesson-table'
import {subject} from './subject'

export const schemaTypes = [
  grade,
  subject,
  chapter,
  lessonFlashcard,
  lessonTableColumn,
  lessonTableCell,
  lessonTableRow,
  lessonTable,
  lesson,
]
