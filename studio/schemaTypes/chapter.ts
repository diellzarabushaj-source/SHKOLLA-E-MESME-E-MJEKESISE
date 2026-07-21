import {defineField, defineType} from 'sanity'

export const chapter = defineType({
  name: 'chapter',
  title: 'Kapitujt',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Titulli',
      type: 'string',
      validation: (rule) => rule.required().max(220),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Përshkrimi',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.max(2000),
    }),
    defineField({
      name: 'cardIllustrationLight',
      title: 'Fotografia e kapitullit — light mode',
      description: 'Ngarko PNG ose WebP me sfond transparent. Shfaqet në kartelën e kapitullit kur portali është në light mode.',
      type: 'image',
      options: {hotspot: false},
      fields: [
        defineField({
          name: 'alt',
          title: 'Teksti alternativ',
          type: 'string',
          description: 'Përshkrim i shkurtër i figurës. Mund të lihet bosh kur fotografia është vetëm dekorative.',
          validation: (rule) => rule.max(300),
        }),
      ],
    }),
    defineField({
      name: 'cardIllustrationDark',
      title: 'Fotografia e kapitullit — dark mode',
      description: 'Ngarko PNG ose WebP me sfond transparent, të optimizuar për sfond të errët. Shfaqet vetëm në dark mode.',
      type: 'image',
      options: {hotspot: false},
      fields: [
        defineField({
          name: 'alt',
          title: 'Teksti alternativ',
          type: 'string',
          description: 'Përdor të njëjtin përshkrim si fotografia e light mode.',
          validation: (rule) => rule.max(300),
        }),
      ],
    }),
    defineField({
      name: 'subject',
      title: 'Lënda',
      type: 'reference',
      to: [{type: 'subject'}],
      validation: (rule) => rule.required(),
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
      title: 'Aktiv',
      type: 'boolean',
      initialValue: true,
      validation: (rule) => rule.required(),
    }),
  ],
  orderings: [
    {
      name: 'orderAsc',
      title: 'Renditja',
      by: [{field: 'order', direction: 'asc'}],
    },
  ],
})

// studio-deploy-trigger-2026-07-21
