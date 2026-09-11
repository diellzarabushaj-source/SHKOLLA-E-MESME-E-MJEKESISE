import {defineArrayMember, defineField, defineType} from 'sanity'

export const lessonFormula = defineType({
  name: 'lessonFormula',
  title: 'Formulë',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Titulli',
      type: 'string',
      initialValue: 'Formulë',
      validation: (rule) => rule.max(160),
    }),
    defineField({
      name: 'formula',
      title: 'Formula',
      type: 'string',
      description: 'Shkruaje formulën siç paraqitet në librin burimor.',
      validation: (rule) => rule.required().max(500),
    }),
    defineField({
      name: 'description',
      title: 'Shpjegimi',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(1200),
    }),
    defineField({
      name: 'variables',
      title: 'Elementet e formulës',
      type: 'array',
      of: [defineArrayMember({type: 'lessonFormulaVariable'})],
      validation: (rule) => rule.max(30),
    }),
    defineField({
      name: 'sourceNote',
      title: 'Shënim nga burimi',
      type: 'text',
      rows: 2,
      description: 'Përdore vetëm për sqarime që dalin nga libri, p.sh. kur njësia nuk jepet në këtë pjesë.',
      validation: (rule) => rule.max(800),
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'formula'},
    prepare({title, subtitle}) {
      return {title: title || 'Formulë', subtitle}
    },
  },
})
