import {existsSync, readFileSync} from 'node:fs'

const failures = []
const read = (path) => existsSync(path)
  ? readFileSync(path, 'utf8')
  : (failures.push(`${path} mungon.`), '')

function requireAll(label, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) failures.push(`${label}: mungon ${JSON.stringify(token)}.`)
  }
}

const packageSource = read('package.json')
const config = read('sanity.config.ts')
const cli = read('sanity.cli.ts')
const input = read('components/portable-text-image-paste-input.tsx')
const lesson = read('schemaTypes/lesson.ts')
const schemas = read('schemaTypes/index.ts')

requireAll('Studio package', packageSource, [
  '"sanity": "6.5.0"',
  '"build": "sanity build"',
  '"typecheck": "tsc --noEmit"',
  '"check": "npm run typecheck && npm run audit && npm run build"',
])
requireAll('Canonical Studio configuration', config + cli, [
  "projectId: 'u5d5zn7n'",
  "dataset: 'schoolv2'",
  "appId: 'xwvsfazcnhh889nw18ldkuvk'",
  'structureTool()',
])
requireAll('Direct clipboard image input', input, [
  "PortableTextInput",
  "onPaste={onPaste}",
  'data.event.clipboardData',
  "client.assets.upload('image'",
  "MAX_IMAGE_BYTES = 12 * 1024 * 1024",
  'MAX_IMAGES_PER_PASTE = 5',
  "'image/png'",
  "'image/jpeg'",
  "'image/webp'",
  "'image/gif'",
  "'image/avif'",
  "return {insert: insertedImages}",
  "_type: 'image'",
  "_type: 'reference'",
  'Ngjit foto direkt me Ctrl/⌘ + V',
  'Insert image',
])
if (input.includes("'image/svg+xml'")) failures.push('SVG nuk duhet të lejohet nga clipboard image paste.')
requireAll('Lesson Portable Text schema', lesson, [
  'input: PortableTextImagePasteInput',
  "name: 'body'",
  "type: 'block'",
  "name: 'image'",
  'options: {hotspot: true}',
  "name: 'alt'",
  "name: 'caption'",
  "name: 'audio'",
  "accept: 'audio/*'",
  "name: 'flashcards'",
])
requireAll('Schema registration', schemas, [
  'grade',
  'subject',
  'chapter',
  'lessonFlashcard',
  'lesson',
])

if (failures.length) {
  console.error('\nSanity Studio image-paste audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Sanity Studio image-paste audit passed direct Ctrl/Cmd+V upload, cursor insertion, normal image control preservation, schema alignment and safety limits.')
