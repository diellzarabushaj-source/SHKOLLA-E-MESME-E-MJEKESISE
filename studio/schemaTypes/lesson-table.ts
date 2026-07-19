import {defineArrayMember, defineField, defineType} from 'sanity'

export const lessonTable = defineType({
  name: 'lessonTable',
  title: 'Tabelë',
  type: 'object',
  fields: [
    defineField({
      name: 'caption',
      title: 'Titulli i tabelës',
      type: 'string',
      validation: (rule) => rule.max(1000),
    }),
    defineField({
      name: 'rows',
      title: 'Rreshtat',
      type: 'array',
      of: [defineArrayMember({type: 'lessonTableRow'})],
      validation: (rule) => rule.required().min(1).max(100),
    }),
  ],
  preview: {
    select: {caption: 'caption', rows: 'rows'},
    prepare({caption, rows}) {
      return {
        title: caption || 'Tabelë',
        subtitle: `${Array.isArray(rows) ? rows.length : 0} rreshta`,
      }
    },
  },
})
