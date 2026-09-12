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
        list: [
          {title: 'Pozita në bosht / lëvizja drejtvizore', value: 'linearPosition'},
          {title: 'Trajektore e lakuar + vektorët e shpejtësisë', value: 'curvedVelocity'},
          {title: 'Shtypja hidrostatike në thellësi', value: 'hydrostaticPressure'},
          {title: 'Paradoksi hidrostatik', value: 'hydrostaticParadox'},
          {title: 'Ligji i Paskalit - bartja në të gjitha drejtimet', value: 'pascalTransmission'},
          {title: 'Ligji i Paskalit - presion i barabartë', value: 'pascalEqualPressure'},
          {title: 'Enët komunikuese', value: 'communicatingVessels'},
          {title: 'Presa hidraulike', value: 'hydraulicPress'},
          {title: 'Energjia e sipërfaqes së lirë - molekulat', value: 'surfaceEnergy'},
          {title: 'Tensioni sipërfaqësor - film dhe shufër lëvizëse', value: 'surfaceTensionFilm'},
          {title: 'Kapilariteti - lagia dhe moslagia', value: 'capillaryWetting'},
          {title: 'Kapilariteti - elevacioni dhe depresioni', value: 'capillaryLevels'},
          {title: 'Kapilariteti - baraspesha e forcave', value: 'capillaryBalance'},
          {title: 'Dinamika e fluideve - vijat e rrymimit', value: 'fluidStreamlines'},
          {title: 'Dinamika e fluideve - ekuacioni i kontinuitetit', value: 'continuityTube'},
          {title: 'Dinamika e fluideve - ekuacioni i Bernulit', value: 'bernoulliTube'},
          {title: 'Dinamika e fluideve - veprimi thithës i rrymimit', value: 'suctionJet'},
          {title: 'Viskoziteti - shtresat në gyp', value: 'viscousLayeredPipe'},
          {title: 'Viskoziteti - gradienti i shpejtësisë', value: 'velocityGradient'},
          {title: 'Rrjedhja shtresore - profili i shpejtësisë', value: 'laminarPipeProfile'},
          {title: 'Rrjedhja rreth trupit - vijat dhe shtjellat', value: 'flowAroundObstacle'},
          {title: 'Ligji i Puazejit - rrjedhja në gyp', value: 'poiseuilleTube'},
          {title: 'Rezistenca e mjedisit - forma e trupit', value: 'bodyResistance'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'title', title: 'Titulli', type: 'string', validation: (rule) => rule.max(180)}),
    defineField({name: 'caption', title: 'Emërtimi i figurës', type: 'string', validation: (rule) => rule.max(300)}),
    defineField({name: 'explanation', title: 'Shpjegimi', type: 'text', rows: 3, validation: (rule) => rule.max(1000)}),
    defineField({name: 'axisLabel', title: 'Simboli i boshtit / bazës', type: 'string', initialValue: 'x', validation: (rule) => rule.max(40)}),
    defineField({name: 'startPointLabel', title: 'Pika / pozita fillestare', type: 'string', initialValue: 'A', validation: (rule) => rule.max(40)}),
    defineField({name: 'endPointLabel', title: 'Pika / pozita përfundimtare', type: 'string', initialValue: 'B', validation: (rule) => rule.max(40)}),
    defineField({name: 'startCoordinateLabel', title: 'Koordinata / koha / sipërfaqja e parë', type: 'string', initialValue: 'x₀', validation: (rule) => rule.max(80)}),
    defineField({name: 'endCoordinateLabel', title: 'Koordinata / koha / sipërfaqja e dytë', type: 'string', initialValue: 'x', validation: (rule) => rule.max(80)}),
    defineField({name: 'intervalLabel', title: 'Intervali / harku / lartësia / lidhja', type: 'string', initialValue: 'Δx = x − x₀', validation: (rule) => rule.max(160)}),
    defineField({name: 'startVectorLabel', title: 'Vektori / forca e parë', type: 'string', initialValue: 'v₁', validation: (rule) => rule.max(40)}),
    defineField({name: 'endVectorLabel', title: 'Vektori / forca e dytë', type: 'string', initialValue: 'v₂', validation: (rule) => rule.max(40)}),
  ],
  preview: {
    select: {title: 'title', subtitle: 'caption'},
    prepare({title, subtitle}) {
      return {title: title || 'Figurë / diagram', subtitle}
    },
  },
})
