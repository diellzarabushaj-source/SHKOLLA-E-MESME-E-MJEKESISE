import {defineArrayMember, defineField, defineType} from 'sanity'

type TableCellValue = {
  text?: string
}

type TableRowValue = {
  cells?: TableCellValue[]
}

type LessonTableValue = {
  caption?: string
  columns?: Array<{heading?: string}>
  rows?: TableRowValue[]
  showHeader?: boolean
}

function tableDimensions(value?: LessonTableValue): {columns: number; rows: number} {
  const declaredColumns = Array.isArray(value?.columns) ? value.columns.length : 0
  const rowColumns = Array.isArray(value?.rows)
    ? value.rows.reduce((maximum, row) => Math.max(maximum, Array.isArray(row?.cells) ? row.cells.length : 0), 0)
    : 0

  return {
    columns: Math.max(declaredColumns, rowColumns),
    rows: Array.isArray(value?.rows) ? value.rows.length : 0,
  }
}

export const lessonTableColumn = defineType({
  name: 'lessonTableColumn',
  title: 'Kolonë',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'Titulli i kolonës',
      type: 'string',
      validation: (rule) => rule.max(300),
    }),
  ],
  preview: {
    select: {title: 'heading'},
    prepare: ({title}: {title?: string}) => ({
      title: title?.trim() || 'Kolonë pa titull',
    }),
  },
})

export const lessonTableCell = defineType({
  name: 'lessonTableCell',
  title: 'Qelizë',
  type: 'object',
  fields: [
    defineField({
      name: 'text',
      title: 'Teksti',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(5000),
    }),
  ],
  preview: {
    select: {title: 'text'},
    prepare: ({title}: {title?: string}) => ({
      title: title?.trim() || 'Qelizë e zbrazët',
    }),
  },
})

export const lessonTableRow = defineType({
  name: 'lessonTableRow',
  title: 'Rresht',
  type: 'object',
  fields: [
    defineField({
      name: 'cells',
      title: 'Qelizat',
      description: 'Shto nga një qelizë për secilën kolonë, në të njëjtin rend.',
      type: 'array',
      of: [defineArrayMember({type: 'lessonTableCell', title: 'Qelizë'})],
      validation: (rule) => rule.required().min(1).max(12),
    }),
  ],
  preview: {
    select: {cells: 'cells'},
    prepare: ({cells}: {cells?: TableCellValue[]}) => {
      const values = Array.isArray(cells)
        ? cells.map((cell) => cell?.text?.trim()).filter(Boolean)
        : []
      return {
        title: values.slice(0, 3).join(' · ') || 'Rresht i zbrazët',
        subtitle: `${Array.isArray(cells) ? cells.length : 0} qeliza`,
      }
    },
  },
})

export const lessonTable = defineType({
  name: 'lessonTable',
  title: 'Tabelë',
  type: 'object',
  fields: [
    defineField({
      name: 'caption',
      title: 'Titulli / përshkrimi i tabelës',
      type: 'string',
      validation: (rule) => rule.max(500),
    }),
    defineField({
      name: 'showHeader',
      title: 'Shfaq rreshtin e titujve',
      description: 'Kur aktivizohet, titujt e kolonave shfaqen në krye të tabelës.',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'columns',
      title: 'Kolonat',
      description: 'Përcakto numrin dhe titullin e kolonave. Lejohen deri në 12 kolona.',
      type: 'array',
      of: [defineArrayMember({type: 'lessonTableColumn', title: 'Kolonë'})],
      initialValue: [
        {_key: 'column-1', _type: 'lessonTableColumn', heading: 'Kolona 1'},
        {_key: 'column-2', _type: 'lessonTableColumn', heading: 'Kolona 2'},
      ],
      validation: (rule) => rule.required().min(1).max(12),
    }),
    defineField({
      name: 'rows',
      title: 'Rreshtat',
      description: 'Çdo rresht duhet të ketë të njëjtin numër qelizash sa kolonat.',
      type: 'array',
      of: [defineArrayMember({type: 'lessonTableRow', title: 'Rresht'})],
      initialValue: [
        {
          _key: 'row-1',
          _type: 'lessonTableRow',
          cells: [
            {_key: 'row-1-cell-1', _type: 'lessonTableCell', text: ''},
            {_key: 'row-1-cell-2', _type: 'lessonTableCell', text: ''},
          ],
        },
        {
          _key: 'row-2',
          _type: 'lessonTableRow',
          cells: [
            {_key: 'row-2-cell-1', _type: 'lessonTableCell', text: ''},
            {_key: 'row-2-cell-2', _type: 'lessonTableCell', text: ''},
          ],
        },
      ],
      validation: (rule) => rule.required().min(1).max(50),
    }),
  ],
  validation: (rule) => rule.custom((rawValue) => {
    if (!rawValue || typeof rawValue !== 'object') return true
    const value = rawValue as LessonTableValue
    const columnCount = Array.isArray(value.columns) ? value.columns.length : 0
    const rows = Array.isArray(value.rows) ? value.rows : []

    if (!columnCount) return 'Tabela duhet të ketë së paku një kolonë.'
    const invalidRow = rows.findIndex((row) => !Array.isArray(row?.cells) || row.cells.length !== columnCount)
    if (invalidRow >= 0) {
      return `Rreshti ${invalidRow + 1} duhet të ketë saktësisht ${columnCount} qeliza.`
    }

    return true
  }),
  preview: {
    select: {
      caption: 'caption',
      columns: 'columns',
      rows: 'rows',
      showHeader: 'showHeader',
    },
    prepare: (value: LessonTableValue) => {
      const dimensions = tableDimensions(value)
      return {
        title: value.caption?.trim() || 'Tabelë',
        subtitle: `${dimensions.rows} rreshta × ${dimensions.columns} kolona${value.showHeader === false ? ' · pa header' : ''}`,
      }
    },
  },
})
