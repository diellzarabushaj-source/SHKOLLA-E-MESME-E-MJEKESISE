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
      name: 'chapterImage',
      title: 'Fotoja e kapitullit',
      description: 'Ngarko fotografinë ose ilustrimin që do të shfaqet në kartelën e këtij kapitulli.',
      type: 'image',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Përshkrimi i fotos',
          type: 'string',
          description: 'Përshkrim i shkurtër i fotos për qasshmëri.',
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
