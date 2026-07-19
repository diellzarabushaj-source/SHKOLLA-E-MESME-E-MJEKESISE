import {defineField, defineType} from 'sanity'

export const lessonTableCell = defineType({
  name: 'lessonTableCell',
  title: 'Qelizë e tabelës',
  type: 'object',
  fields: [
    defineField({
      name: 'text',
      title: 'Teksti',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(6000),
    }),
    defineField({
      name: 'isHeader',
      title: 'Qelizë titulli',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'rowSpan',
      title: 'Shtrihet në sa rreshta',
      type: 'number',
      initialValue: 1,
      validation: (rule) => rule.integer().min(1).max(30),
    }),
    defineField({
      name: 'colSpan',
      title: 'Shtrihet në sa kolona',
      type: 'number',
      initialValue: 1,
      validation: (rule) => rule.integer().min(1).max(30),
    }),
  ],
  preview: {
    select: {title: 'text', isHeader: 'isHeader'},
    prepare({title, isHeader}) {
      return {
        title: title || 'Qelizë e zbrazët',
        subtitle: isHeader ? 'Titull' : 'Qelizë',
      }
    },
  },
})
