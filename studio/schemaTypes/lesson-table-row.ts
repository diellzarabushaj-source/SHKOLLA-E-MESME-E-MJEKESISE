import {defineArrayMember, defineField, defineType} from 'sanity'

export const lessonTableRow = defineType({
  name: 'lessonTableRow',
  title: 'Rresht i tabelës',
  type: 'object',
  fields: [
    defineField({
      name: 'cells',
      title: 'Qelizat',
      type: 'array',
      of: [defineArrayMember({type: 'lessonTableCell'})],
      validation: (rule) => rule.required().min(1).max(30),
    }),
  ],
  preview: {
    select: {cells: 'cells'},
    prepare({cells}) {
      const values = Array.isArray(cells)
        ? cells.map((cell) => typeof cell?.text === 'string' ? cell.text.trim() : '').filter(Boolean)
        : []
      return {
        title: values.slice(0, 3).join(' | ') || 'Rresht i zbrazët',
        subtitle: `${Array.isArray(cells) ? cells.length : 0} qeliza`,
      }
    },
  },
})
