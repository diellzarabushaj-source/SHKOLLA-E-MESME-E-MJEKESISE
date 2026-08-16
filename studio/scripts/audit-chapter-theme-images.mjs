import {readFileSync} from 'node:fs'

// The chapter card is illustrated by a single Sanity-managed image. The portal
// reads it as `chapterImage { alt, crop, hotspot, "asset": asset->{url} }`, so
// the Studio has to keep offering exactly that shape to the editor.

const chapterSchema = readFileSync('schemaTypes/chapter.ts', 'utf8')

function requireText(value, label) {
  if (!chapterSchema.includes(value)) {
    throw new Error(`Chapter image Studio audit failed: ${label}`)
  }
}

requireText("name: 'chapterImage'", 'chapter image field is missing')
requireText("type: 'image'", 'chapter image field is not an image')
requireText('options: {hotspot: true}', 'editors cannot choose the focal point of the chapter artwork')
requireText("name: 'alt'", 'alternative text field is missing')

console.log('Sanity Studio exposes the chapter card illustration with hotspot and alternative text.')
