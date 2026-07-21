import type {ComponentType} from 'react'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {PortableTextClipboardPasteInput} from '../components/portable-text-image-paste-input'

type LessonTextBlock = {
  _type?: string
  style?: string
  children?: Array<{text?: string}>
}

const AUXILIARY_HEADING = /^(?:pra|skema|skemë|mnemonikë|shembull|formula|kujdes|mbaje mend|dallimi(?: kryesor)?|krahasim|veprimi|funksioni|reaksioni|rregulli kryesor)$/i

function blockText(block: LessonTextBlock): string {
  return (block.children || []).map((child) => child.text || '').join('').replace(/\s+/g, ' ').trim()
}

function validateLessonBodyHierarchy(value: unknown): true | string {
  if (!Array.isArray(value)) return true

  let hasH2 = false
  let hasH3InCurrentSection = false

  for (const candidate of value) {
    const block = candidate as LessonTextBlock
    if (block?._type !== 'block') continue

    const style = block.style || 'normal'
    const isHeading = style === 'h2' || style === 'h3' || style === 'h4'
    if (!isHeading && style !== 'normal' && style !== 'blockquote') {
      return 'Në përmbajtje përdor vetëm Normal, H2, H3, H4 ose Citat. H1 ruhet vetëm për titullin e faqes.'
    }

    const text = blockText(block)
    if (isHeading && /^\([^)]*\)$/.test(text)) {
      return `“${text}” është shpjegim në kllapa, jo heading. Vendose Normal.`
    }
    if (isHeading && /[:;.]$/.test(text)) {
      return `“${text}” duket si fjali hyrëse, jo heading. Vendose Normal.`
    }
    if (isHeading && AUXILIARY_HEADING.test(text)) {
      return `“${text}” është etiketë ndihmëse, jo seksion i sidebar-it. Vendose Normal ose formatoje me Strong.`
    }

    if (style === 'h2') {
      hasH2 = true
      hasH3InCurrentSection = false
      continue
    }
    if (style === 'h3') {
      if (!hasH2) return `“${text}” është H3 pa H2 paraprak. Krijo fillimisht seksionin H2.`
      hasH3InCurrentSection = true
      continue
    }
    if (style === 'h4' && (!hasH2 || !hasH3InCurrentSection)) {
      return `“${text}” është H4 pa hierarki H2 → H3 paraprake.`
    }
  }

  return true
}

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
      description: 'Titulli i faqes është H1. Brenda mësimit përdor H2 për seksion kryesor, H3 për nënseksion dhe H4 për detaj. Etiketat si “Pra:”, “Skema” ose shpjegimet në kllapa mbeten Normal.',
      type: 'array',
      components: {
        // Sanity's mixed Portable Text array inference currently resolves the form input
        // as a primitive-array component. The runtime component is PortableTextInputProps.
        input: PortableTextClipboardPasteInput as unknown as ComponentType<any>,
      },
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Tekst normal', value: 'normal'},
            {title: 'Seksion kryesor (H2)', value: 'h2'},
            {title: 'Nënseksion (H3)', value: 'h3'},
            {title: 'Detaj (H4)', value: 'h4'},
            {title: 'Citat', value: 'blockquote'},
          ],
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
        defineArrayMember({
          type: 'lessonTable',
          title: 'Tabelë',
        }),
      ],
      validation: (rule) => [
        rule.max(800),
        rule.custom(validateLessonBodyHierarchy).warning(),
      ],
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
