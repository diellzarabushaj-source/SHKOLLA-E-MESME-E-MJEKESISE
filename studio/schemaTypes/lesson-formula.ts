import {defineArrayMember, defineField, defineType} from 'sanity'

const unitMathToken = defineArrayMember({
  name: 'unitMathToken',
  title: 'Pjesë e njësisë',
  type: 'object',
  fields: [
    defineField({name: 'text', title: 'Teksti', type: 'string', validation: (rule) => rule.required().max(80)}),
    defineField({name: 'cancelled', title: 'Anulohet / thjeshtohet', type: 'boolean', initialValue: false}),
  ],
  preview: {select: {title: 'text'}},
})

const unitMathPart = defineArrayMember({
  name: 'unitMathPart',
  title: 'Pjesë e shprehjes',
  type: 'object',
  fields: [
    defineField({
      name: 'kind',
      title: 'Lloji',
      type: 'string',
      initialValue: 'text',
      options: {
        layout: 'radio',
        list: [
          {title: 'Tekst / operator', value: 'text'},
          {title: 'Thyesë', value: 'fraction'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'text',
      title: 'Teksti',
      type: 'string',
      hidden: ({parent}) => parent?.kind === 'fraction',
      validation: (rule) => rule.max(120),
    }),
    defineField({
      name: 'cancelled',
      title: 'Anulohet / thjeshtohet',
      type: 'boolean',
      initialValue: false,
      hidden: ({parent}) => parent?.kind === 'fraction',
    }),
    defineField({
      name: 'numerator',
      title: 'Numëruesi',
      type: 'array',
      of: [unitMathToken],
      hidden: ({parent}) => parent?.kind !== 'fraction',
      validation: (rule) => rule.max(20),
    }),
    defineField({
      name: 'denominator',
      title: 'Emëruesi',
      type: 'array',
      of: [unitMathToken],
      hidden: ({parent}) => parent?.kind !== 'fraction',
      validation: (rule) => rule.max(20),
    }),
  ],
  preview: {
    select: {kind: 'kind', text: 'text'},
    prepare({kind, text}) {
      return {title: kind === 'fraction' ? 'Thyesë' : text || 'Tekst'}
    },
  },
})

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
      description: 'Ruaj formulën e librit, duke përdorur simbolet standarde të madhësive fizike.',
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
      name: 'formulaForms',
      title: 'Logjika e formulës',
      description: 'Format e së njëjtës formulë kur izolohet secila madhësi. Përdoren për ta mësuar logjikën e formulës, jo si përmbajtje e re teorike.',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'formulaForm',
          title: 'Formë e formulës',
          type: 'object',
          fields: [
            defineField({
              name: 'label',
              title: 'Çfarë po gjejmë',
              type: 'string',
              validation: (rule) => rule.required().max(120),
            }),
            defineField({
              name: 'expression',
              title: 'Shprehja',
              type: 'string',
              validation: (rule) => rule.required().max(300),
            }),
          ],
          preview: {select: {title: 'label', subtitle: 'expression'}},
        }),
      ],
      validation: (rule) => rule.max(30),
    }),
    defineField({
      name: 'unitLogicIntro',
      title: 'Hyrje për logjikën e njësive',
      type: 'string',
      validation: (rule) => rule.max(400),
    }),
    defineField({
      name: 'unitLogic',
      title: 'Thjeshtimi i njësive',
      description: 'Trego hap pas hapi si njësitë shumëzohen, pjesëtohen dhe thjeshtohen deri te njësia përfundimtare.',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'unitLogicStep',
          title: 'Hap i njësive',
          type: 'object',
          fields: [
            defineField({
              name: 'label',
              title: 'Madhësia',
              type: 'string',
              validation: (rule) => rule.required().max(120),
            }),
            defineField({
              name: 'expression',
              title: 'Shprehja tekstuale (fallback)',
              type: 'string',
              validation: (rule) => rule.required().max(400),
            }),
            defineField({
              name: 'visualParts',
              title: 'Shprehja vizuale me thyesa dhe anulime',
              description: 'Përdor thyesa të vërteta dhe shëno njësitë që anulohen. Frontend-i i paraqet me vijë mbi simbolin e anuluar.',
              type: 'array',
              of: [unitMathPart],
              validation: (rule) => rule.max(40),
            }),
            defineField({
              name: 'explanation',
              title: 'Shpjegimi i shkurtër',
              type: 'string',
              validation: (rule) => rule.max(500),
            }),
          ],
          preview: {select: {title: 'label', subtitle: 'expression'}},
        }),
      ],
      validation: (rule) => rule.max(30),
    }),
    defineField({
      name: 'sourceNote',
      title: 'Shënim për burimin',
      type: 'text',
      rows: 2,
      description: 'Përdore për të dalluar përmbajtjen e librit nga njësitë ose konventat SI të verifikuara në burime autoritative.',
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
