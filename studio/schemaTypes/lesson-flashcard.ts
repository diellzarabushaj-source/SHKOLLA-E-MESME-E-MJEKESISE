import {defineArrayMember, defineField, defineType} from 'sanity'

export const lessonFlashcard = defineType({
  name: 'lessonFlashcard',
  title: 'Flashcard',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Titulli',
      type: 'string',
      validation: (rule) => rule.max(220),
    }),
    defineField({
      name: 'front',
      title: 'Pyetja',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.required().max(6000),
    }),
    defineField({
      name: 'back',
      title: 'Përgjigjja',
      type: 'text',
      rows: 5,
      validation: (rule) => rule.required().max(12000),
    }),
    defineField({
      name: 'explanation',
      title: 'Shpjegimi shtesë',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.max(12000),
    }),
    defineField({
      name: 'difficulty',
      title: 'Vështirësia',
      type: 'string',
      options: {
        list: [
          {title: 'Lehtë', value: 'easy'},
          {title: 'Mesatare', value: 'medium'},
          {title: 'Vështirë', value: 'hard'},
        ],
        layout: 'radio',
      },
      initialValue: 'easy',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'tags',
      title: 'Etiketat',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {layout: 'tags'},
      validation: (rule) => rule.max(30).unique(),
    }),
    defineField({
      name: 'image',
      title: 'Fotografia',
      type: 'image',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Teksti alternativ',
          type: 'string',
          validation: (rule) => rule.max(500).warning('Shto tekst alternativ për qasshmëri.'),
        }),
        defineField({
          name: 'caption',
          title: 'Përshkrimi',
          type: 'string',
          validation: (rule) => rule.max(1000),
        }),
      ],
    }),
    defineField({
      name: 'imageSide',
      title: 'Ana e fotografisë',
      type: 'string',
      description: 'Në flashcards e vjetra pa këtë fushë, fotografia trajtohet automatikisht si pjesë e pyetjes.',
      options: {
        list: [
          {title: 'Pyetja', value: 'front'},
          {title: 'Përgjigjja', value: 'back'},
          {title: 'Të dyja', value: 'both'},
        ],
        layout: 'radio',
      },
      initialValue: 'front',
    }),
    defineField({
      name: 'order',
      title: 'Renditja',
      type: 'number',
      initialValue: 0,
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: 'isActive',
      title: 'Aktive',
      type: 'boolean',
      initialValue: true,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'front',
      media: 'image',
    },
    prepare({title, subtitle, media}) {
      return {
        title: title || subtitle || 'Flashcard pa titull',
        subtitle: title ? subtitle : undefined,
        media,
      }
    },
  },
})
