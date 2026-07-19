import {Card, Flex, Spinner, Stack, Text, useToast} from '@sanity/ui'
import {useCallback, useMemo, useState} from 'react'
import {
  PortableTextInput,
  type PortableTextInputProps,
  useClient,
} from 'sanity'

const API_VERSION = '2026-07-17'
const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const MAX_IMAGES_PER_PASTE = 5
const MAX_TABLES_PER_PASTE = 5
const MAX_ROWS_PER_TABLE = 100
const MAX_CELLS_PER_ROW = 30
const MAX_CELL_TEXT = 6000
const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
])

type TableCell = {
  _key: string
  _type: 'lessonTableCell'
  text: string
  isHeader: boolean
  rowSpan: number
  colSpan: number
}

type TableRow = {
  _key: string
  _type: 'lessonTableRow'
  cells: TableCell[]
}

type TableBlock = {
  _key: string
  _type: 'lessonTable'
  caption?: string
  rows: TableRow[]
}

function keyFor(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replaceAll('-', '')
    : `${Date.now()}${Math.random().toString(16).slice(2)}`
  return `${prefix}-${random.slice(0, 20)}`
}

function imageFilesFromClipboard(data: DataTransfer): File[] {
  const images: File[] = []
  const seen = new Set<string>()

  const add = (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return
    const signature = `${file.name}:${file.type}:${file.size}:${file.lastModified}`
    if (seen.has(signature)) return
    seen.add(signature)
    images.push(file)
  }

  for (const item of Array.from(data.items || [])) {
    if (item.kind === 'file' && item.type.startsWith('image/')) add(item.getAsFile())
  }
  for (const file of Array.from(data.files || [])) add(file)

  return images
}

function safeFilename(file: File, index: number): string {
  const extension = file.type.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'png'
  const cleaned = file.name
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180)

  return cleaned || `foto-nga-clipboard-${Date.now()}-${index + 1}.${extension}`
}

function altFromFilename(filename: string): string {
  const value = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
  return (value || 'Fotografi e mësimit').slice(0, 500)
}

function cleanCellText(value: string): string {
  const text = value
    .replaceAll('\u00a0', ' ')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (text.length > MAX_CELL_TEXT) throw new Error('TABLE_CELL_TOO_LARGE')
  return text
}

function cellText(cell: HTMLTableCellElement): string {
  const clone = cell.cloneNode(true) as HTMLElement
  clone.querySelectorAll('br').forEach((element) => element.replaceWith('\n'))
  clone.querySelectorAll('p,div,li').forEach((element) => element.append('\n'))
  clone.querySelectorAll('script,style,iframe,object').forEach((element) => element.remove())
  return cleanCellText(clone.textContent || '')
}

function safeSpan(value: number): number {
  return Number.isInteger(value) ? Math.min(30, Math.max(1, value)) : 1
}

function tableFromElement(table: HTMLTableElement): TableBlock | null {
  const htmlRows = Array.from(table.rows)
  if (!htmlRows.length) return null
  if (htmlRows.length > MAX_ROWS_PER_TABLE) throw new Error('TABLE_TOO_LARGE')

  const rows = htmlRows.map((row): TableRow => {
    const htmlCells = Array.from(row.cells)
    if (!htmlCells.length || htmlCells.length > MAX_CELLS_PER_ROW) throw new Error('TABLE_TOO_LARGE')
    const inHead = row.parentElement?.tagName === 'THEAD'
    return {
      _key: keyFor('row'),
      _type: 'lessonTableRow',
      cells: htmlCells.map((cell): TableCell => ({
        _key: keyFor('cell'),
        _type: 'lessonTableCell',
        text: cellText(cell),
        isHeader: inHead || cell.tagName === 'TH',
        rowSpan: safeSpan(cell.rowSpan),
        colSpan: safeSpan(cell.colSpan),
      })),
    }
  })

  const caption = cleanCellText(table.caption?.textContent || '').slice(0, 1000)
  return {
    _key: keyFor('table'),
    _type: 'lessonTable',
    ...(caption ? {caption} : {}),
    rows,
  }
}

function tablesFromClipboard(data: DataTransfer): TableBlock[] {
  const html = data.getData('text/html')
  if (html.trim()) {
    const document = new DOMParser().parseFromString(html, 'text/html')
    const elements = Array.from(document.querySelectorAll('table'))
      .filter((table) => !table.parentElement?.closest('table'))
    if (elements.length > MAX_TABLES_PER_PASTE) throw new Error('TOO_MANY_TABLES')
    const tables = elements
      .map((table) => tableFromElement(table as HTMLTableElement))
      .filter((table): table is TableBlock => Boolean(table))
    if (tables.length) return tables
  }

  const text = data.getData('text/plain').replaceAll('\r\n', '\n').replaceAll('\r', '\n')
  if (!text.includes('\t')) return []
  const lines = text.split('\n')
  while (lines.length && !lines.at(-1)?.trim()) lines.pop()
  if (!lines.length || lines.length > MAX_ROWS_PER_TABLE) throw new Error('TABLE_TOO_LARGE')

  return [{
    _key: keyFor('table'),
    _type: 'lessonTable',
    rows: lines.map((line): TableRow => {
      const values = line.split('\t')
      if (values.length < 2 || values.length > MAX_CELLS_PER_ROW) throw new Error('TABLE_TOO_LARGE')
      return {
        _key: keyFor('row'),
        _type: 'lessonTableRow',
        cells: values.map((value): TableCell => ({
          _key: keyFor('cell'),
          _type: 'lessonTableCell',
          text: cleanCellText(value),
          isHeader: false,
          rowSpan: 1,
          colSpan: 1,
        })),
      }
    }),
  }]
}

export function PortableTextClipboardPasteInput(props: PortableTextInputProps) {
  const client = useClient({apiVersion: API_VERSION})
  const toast = useToast()
  const [uploading, setUploading] = useState(0)

  const onPaste = useCallback<NonNullable<PortableTextInputProps['onPaste']>>(
    async (data) => {
      const clipboard = data.event.clipboardData
      if (!clipboard) return undefined

      const images = imageFilesFromClipboard(clipboard)
      if (images.length) {
        if (images.length > MAX_IMAGES_PER_PASTE) {
          toast.push({
            status: 'warning',
            title: `Mund të ngjiten maksimumi ${MAX_IMAGES_PER_PASTE} fotografi njëherësh.`,
          })
          return {insert: []}
        }

        const unsupported = images.find((file) => !ALLOWED_IMAGE_TYPES.has(file.type))
        if (unsupported) {
          toast.push({
            status: 'error',
            title: 'Ky format fotografie nuk pranohet.',
            description: 'Përdor PNG, JPG, WebP, GIF ose AVIF. SVG nuk lejohet.',
          })
          return {insert: []}
        }

        const oversized = images.find((file) => file.size <= 0 || file.size > MAX_IMAGE_BYTES)
        if (oversized) {
          toast.push({
            status: 'error',
            title: 'Fotografia është më e madhe se 12 MB ose është e zbrazët.',
            description: 'Zvogëloje fotografinë dhe bëje paste përsëri.',
          })
          return {insert: []}
        }

        setUploading(images.length)
        try {
          const insertedImages = await Promise.all(
            images.map(async (file, index) => {
              const filename = safeFilename(file, index)
              const asset = await client.assets.upload('image', file, {
                filename,
                contentType: file.type,
              })

              return {
                _key: keyFor('image'),
                _type: 'image',
                asset: {
                  _type: 'reference',
                  _ref: asset._id,
                },
                alt: altFromFilename(asset.originalFilename || filename),
              }
            }),
          )

          toast.push({
            status: 'success',
            title: insertedImages.length === 1
              ? 'Fotografia u ngjit dhe u ngarkua në Sanity.'
              : `${insertedImages.length} fotografi u ngjitën dhe u ngarkuan në Sanity.`,
          })
          return {insert: insertedImages}
        } catch (error) {
          console.error('Sanity Studio clipboard image upload failed', error)
          toast.push({
            status: 'error',
            title: 'Fotografia nuk u ngarkua në Sanity.',
            description: 'Përmbajtja tjetër nuk është ndryshuar. Provo përsëri.',
          })
          return {insert: []}
        } finally {
          setUploading(0)
        }
      }

      try {
        const tables = tablesFromClipboard(clipboard)
        if (!tables.length) return undefined
        toast.push({
          status: 'success',
          title: tables.length === 1
            ? 'Tabela u ngjit në vendin e kursorit.'
            : `${tables.length} tabela u ngjitën në vendin e kursorit.`,
        })
        return {insert: tables}
      } catch (error) {
        console.error('Sanity Studio clipboard table paste failed', error)
        toast.push({
          status: 'error',
          title: 'Tabela nuk mund të ngjitet.',
          description: 'Lejohen deri në 100 rreshta, 30 kolona dhe 6000 shkronja për qelizë.',
        })
        return {insert: []}
      }
    },
    [client, toast],
  )

  const statusText = useMemo(() => {
    if (!uploading) return null
    return uploading === 1
      ? 'Duke ngarkuar fotografinë…'
      : `Duke ngarkuar ${uploading} fotografi…`
  }, [uploading])

  return (
    <Stack space={3}>
      <Card padding={3} radius={2} tone="primary" border>
        <Flex align="center" gap={3}>
          {uploading > 0 && <Spinner muted size={1} />}
          <Stack space={2}>
            <Text size={1} weight="semibold">
              Ngjit foto ose tabelë direkt me Ctrl/⌘ + V
            </Text>
            <Text muted size={1}>
              Kopjo një fotografi, screenshot ose tabelë nga Word, Excel, Google Sheets apo web-i dhe bëje paste në vendin e kursorit. Opsionet normale “Insert image” dhe “Tabelë” mbeten të disponueshme.
            </Text>
            {statusText && <Text size={1}>{statusText}</Text>}
          </Stack>
        </Flex>
      </Card>
      <PortableTextInput {...props} onPaste={onPaste} />
    </Stack>
  )
}
