import {readFileSync} from 'node:fs'

const chapterSchema = readFileSync('schemaTypes/chapter.ts', 'utf8')

function requireText(value, label) {
  if (!chapterSchema.includes(value)) {
    throw new Error(`Chapter theme image Studio audit failed: ${label}`)
  }
}

requireText("name: 'cardIllustrationLight'", 'light mode image field is missing')
requireText("name: 'cardIllustrationDark'", 'dark mode image field is missing')
requireText('sfond transparent', 'transparent PNG/WebP guidance is missing')
requireText("name: 'alt'", 'alternative text fields are missing')
requireText('options: {hotspot: false}', 'chapter artwork may be cropped by hotspot behavior')

console.log('Sanity Studio exposes separate transparent chapter illustrations for light and dark mode.')
