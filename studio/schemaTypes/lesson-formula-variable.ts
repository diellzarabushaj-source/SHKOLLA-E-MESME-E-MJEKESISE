import {defineField, defineType} from 'sanity'

export const lessonFormulaVariable = defineType({
  name: 'lessonFormulaVariable',
  title: 'Element i formulës',
  type: 'object',
  fields: [
    defineField({
      name: 'symbol',
      title: 'Simboli',
      type: 'string',
      validation: (rule) => rule.required().max(40),
    }),
    defineField({
      name: 'meaning',
      title: 'Çfarë paraqet',
      type: 'string',
      validation: (rule) => rule.required().max(240),
    }),
    defineField({
      name: 'unit',
      title: 'Njësia',
      type: 'string',
      description: 'Shëno njësinë vetëm kur ajo jepet në burimin e mësimit. Mos shto informacion nga jashtë librit.',
      validation: (rule) => rule.max(120),
    }),
  ],
  preview: {
    select: {title: 'symbol', subtitle: 'meaning'},
  },
})
