import {defineField, defineType} from 'sanity'

export const subject = defineType({
  name: 'subject',
  title: 'Lëndët',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Titulli',
      type: 'string',
      validation: (rule) => rule.required().max(180),
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
      validation: (rule) => rule.max(1600),
    }),
    defineField({
      name: 'cardIllustration',
      title: 'Figura e kartelës',
      type: 'image',
      description: 'Ngarko një figurë statike PNG ose WebP, mundësisht me sfond transparent. Shfaqet automatikisht në kartelën e lëndës.',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Përshkrimi i figurës',
          type: 'string',
          description: 'Përshkrim i shkurtër për qasshmëri, p.sh. Zemra e njeriut.',
          validation: (rule) => rule.max(300).warning('Shto një përshkrim të shkurtër për qasshmëri.'),
        }),
      ],
    }),
    defineField({
      name: 'grade',
      title: 'Klasa',
      type: 'reference',
      to: [{type: 'grade'}],
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
      title: 'Aktive',
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
