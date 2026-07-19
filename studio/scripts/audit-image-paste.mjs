import {existsSync, readFileSync} from 'node:fs'

const failures = []
const read = (path) => existsSync(path)
  ? readFileSync(path, 'utf8')
  : (failures.push(`${path} mungon.`), '')

function requireAll(label, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) failures.push(`${label}: mungon ${JSON.stringify(token)}.`)
  }
}

const packageSource = read('package.json')
const config = read('sanity.config.ts')
const cli = read('sanity.cli.ts')
const input = read('components/portable-text-image-paste-input.tsx')
const lesson = read('schemaTypes/lesson.ts')
const table = read('schemaTypes/lesson-table.ts')
const tableRow = read('schemaTypes/lesson-table-row.ts')
const tableCell = read('schemaTypes/lesson-table-cell.ts')
const schemas = read('schemaTypes/index.ts')

requireAll('Studio package', packageSource, [
  '"sanity": "6.5.0"',
  '"build": "sanity build"',
  '"typecheck": "tsc --noEmit"',
  '"check": "npm run typecheck && npm run audit && npm run build"',
])
requireAll('Canonical Studio configuration', config + cli, [
  "projectId: 'u5d5zn7n'",
  "dataset: 'schoolv2'",
  "appId: 'xwvsfazcnhh889nw18ldkuvk'",
  'structureTool()',
])
requireAll('Direct clipboard image and table input', input, [
  'PortableTextInput',
  'onPaste={onPaste}',
  'data.event.clipboardData',
  "client.assets.upload('image'",
  'MAX_IMAGE_BYTES = 12 * 1024 * 1024',
  'MAX_IMAGES_PER_PASTE = 5',
  'MAX_TABLES_PER_PASTE = 5',
  'MAX_ROWS_PER_TABLE = 100',
  'MAX_CELLS_PER_ROW = 30',
  'MAX_CELL_TEXT = 6000',
  "'image/png'",
  "'image/jpeg'",
  "'image/webp'",
  "'image/gif'",
  "'image/avif'",
  'return {insert: insertedImages}',
  'return {insert: tables}',
  "_type: 'image'",
  "_type: 'reference'",
  "_type: 'lessonTable'",
  "_type: 'lessonTableRow'",
  "_type: 'lessonTableCell'",
  "querySelectorAll('table')",
  "split('\\t')",
  'Ngjit foto ose tabelë direkt me Ctrl/⌘ + V',
  'Word, Excel, Google Sheets',
])
if (input.includes("'image/svg+xml'")) failures.push('SVG nuk duhet të lejohet nga clipboard image paste.')
requireAll('Lesson Portable Text schema', lesson, [
  'input: PortableTextClipboardPasteInput',
  "name: 'body'",
  "type: 'block'",
  "name: 'image'",
  'options: {hotspot: true}',
  "type: 'lessonTable'",
  "name: 'alt'",
  "name: 'caption'",
  "name: 'audio'",
  "accept: 'audio/*'",
  "name: 'flashcards'",
])
requireAll('Table schemas', table + tableRow + tableCell, [
  "name: 'lessonTable'",
  "name: 'rows'",
  "name: 'lessonTableRow'",
  "name: 'cells'",
  "name: 'lessonTableCell'",
  "name: 'text'",
  "name: 'isHeader'",
  "name: 'rowSpan'",
  "name: 'colSpan'",
  'max(100)',
  'max(30)',
  'max(6000)',
])
requireAll('Schema registration', schemas, [
  'grade',
  'subject',
  'chapter',
  'lessonFlashcard',
  'lessonTableCell',
  'lessonTableRow',
  'lessonTable',
  'lesson',
])

if (failures.length) {
  console.error('\nSanity Studio clipboard audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Sanity Studio clipboard audit passed direct Ctrl/Cmd+V image upload and table insertion, cursor placement, normal insertion controls, schema alignment and safety limits.')
