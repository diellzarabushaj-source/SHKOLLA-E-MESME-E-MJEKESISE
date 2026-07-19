import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'Shkolla e Mesme e Mjekësisë – V2',
  projectId: 'u5d5zn7n',
  dataset: 'schoolv2',
  plugins: [structureTool()],
  schema: {
    types: schemaTypes,
  },
})
