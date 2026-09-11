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
      description: 'Përdor simbolin e madhësisë fizike me shkrimin standard ndërkombëtar.',
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
      title: 'Njësia SI',
      type: 'string',
      description: 'Përdor simbolin zyrtar SI të njësisë. Njësitë mund të plotësohen nga burime autoritative SI edhe kur libri nuk i jep në atë faqe.',
      validation: (rule) => rule.max(120),
    }),
  ],
  preview: {
    select: {title: 'symbol', subtitle: 'meaning'},
  },
})
