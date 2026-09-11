import {ImageIcon} from '@sanity/icons/Image'
import {defineField, defineType} from 'sanity'

export const lessonDiagram = defineType({
  name: 'lessonDiagram',
  title: 'Figurë / diagram',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({
      name: 'kind',
      title: 'Lloji i diagramit',
      type: 'string',
      initialValue: 'linearPosition',
      options: {
        layout: 'radio',
        list: [{title: 'Pozita në bosht / lëvizja drejtvizore', value: 'linearPosition'}],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'title', title: 'Titulli', type: 'string', validation: (rule) => rule.max(180)}),
    defineField({name: 'caption', title: 'Emërtimi i figurës', type: 'string', validation: (rule) => rule.max(300)}),
    defineField({name: 'explanation', title: 'Shpjegimi', type: 'text', rows: 3, validation: (rule) => rule.max(1000)}),
    defineField({name: 'axisLabel', title: 'Simboli i boshtit', type: 'string', initialValue: 'x', validation: (rule) => rule.max(40)}),
    defineField({name: 'startPointLabel', title: 'Pika fillestare', type: 'string', initialValue: 'A', validation: (rule) => rule.max(40)}),
    defineField({name: 'endPointLabel', title: 'Pika përfundimtare', type: 'string', initialValue: 'B', validation: (rule) => rule.max(40)}),
    defineField({name: 'startCoordinateLabel', title: 'Koordinata fillestare', type: 'string', initialValue: 'x₀', validation: (rule) => rule.max(80)}),
    defineField({name: 'endCoordinateLabel', title: 'Koordinata përfundimtare', type: 'string', initialValue: 'x', validation: (rule) => rule.max(80)}),
    defineField({name: 'intervalLabel', title: 'Ndryshimi i pozitës', type: 'string', initialValue: 'Δx = x − x₀', validation: (rule) => rule.max(160)}),
  ],
  preview: {
    select: {title: 'title', subtitle: 'caption'},
    prepare({title, subtitle}) {
      return {title: title || 'Figurë / diagram', subtitle}
    },
  },
})
