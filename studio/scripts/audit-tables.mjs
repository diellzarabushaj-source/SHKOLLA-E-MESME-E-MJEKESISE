import {existsSync, readFileSync} from 'node:fs'

const failures = []
const read = (file) => existsSync(file) ? readFileSync(file, 'utf8') : (failures.push(`${file} mungon.`), '')
const requireAll = (label, source, values) => {
  for (const value of values) {
    if (!source.includes(value)) failures.push(`${label}: mungon ${JSON.stringify(value)}.`)
  }
}

const tableSchema = read('schemaTypes/lesson-table.ts')
const lessonSchema = read('schemaTypes/lesson.ts')
const schemaIndex = read('schemaTypes/index.ts')

requireAll('Structured table schema', tableSchema, [
  "name: 'lessonTable'",
  "name: 'lessonTableColumn'",
  "name: 'lessonTableRow'",
  "name: 'lessonTableCell'",
  "name: 'columns'",
  "name: 'rows'",
  "name: 'cells'",
  "name: 'showHeader'",
  'rule.required().min(1).max(12)',
  'rule.required().min(1).max(50)',
  'duhet të ketë saktësisht',
])

requireAll('Lesson Portable Text table option', lessonSchema, [
  "name: 'lessonTable'",
  "title: 'Tabelë'",
  "type: 'lessonTable'",
  'Insert → Tabelë',
])

requireAll('Registered table schema types', schemaIndex, [
  'lessonTableColumn',
  'lessonTableCell',
  'lessonTableRow',
  'lessonTable,',
])

if (/<table|dangerouslySetInnerHTML|type:\s*['"]html['"]/.test(tableSchema)) {
  failures.push('Tabela në Sanity duhet të ruhet si të dhëna të strukturuara, jo si HTML.')
}

if (failures.length) {
  console.error('Sanity lesson table audit failed:')
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Sanity lesson table schema audit passed.')
