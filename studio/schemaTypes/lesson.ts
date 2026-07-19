import type {ComponentType} from 'react'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {PortableTextImagePasteInput} from '../components/portable-text-image-paste-input'

export const lesson = defineType({
  name: 'lesson',
  title: 'Mësimet',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Titulli',
      type: 'string',
      validation: (rule) => rule.required().max(260),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Përmbledhja',
      type: 'text',
      rows: 5,
      validation: (rule) => rule.max(4000),
    }),
    defineField({
      name: 'chapter',
      title: 'Kapitulli',
      type: 'reference',
      to: [{type: 'chapter'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Përmbajtja',
      description: 'Shkruaj tekstin dhe ngjit fotografi direkt me Ctrl/⌘+V. Butoni normal për Insert image mbetet i disponueshëm.',
      type: 'array',
      components: {
        // Sanity's mixed block+image array inference currently resolves the form input
        // as a primitive-array component. The runtime component is PortableTextInputProps.
        input: PortableTextImagePasteInput as unknown as ComponentType<any>,
      },
      of: [
        defineArrayMember({
          type: 'block',
          marks: {
            annotations: [
              {
                name: 'link',
                title: 'Link',
                type: 'object',
                fields: [
                  defineField({
                    name: 'href',
                    title: 'Adresa',
                    type: 'url',
                    validation: (rule) => rule.required().uri({scheme: ['http', 'https', 'mailto']}),
                  }),
                ],
              },
            ],
          },
        }),
        defineArrayMember({
          name: 'image',
          title: 'Fotografi',
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
      ],
      validation: (rule) => rule.max(800),
    }),
    defineField({
      name: 'audio',
      title: 'Audio',
      type: 'file',
      options: {accept: 'audio/*'},
      fields: [
        defineField({
          name: 'title',
          title: 'Titulli i audios',
          type: 'string',
          validation: (rule) => rule.max(240),
        }),
      ],
    }),
    defineField({
      name: 'flashcards',
      title: 'Flashcards',
      type: 'array',
      of: [defineArrayMember({type: 'lessonFlashcard', title: 'Flashcard'})],
      validation: (rule) => rule.max(500),
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
