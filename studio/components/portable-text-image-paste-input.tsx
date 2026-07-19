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
const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
])

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

function keyForImage(): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replaceAll('-', '')
    : `${Date.now()}${Math.random().toString(16).slice(2)}`
  return `image-${random.slice(0, 20)}`
}

export function PortableTextImagePasteInput(props: PortableTextInputProps) {
  const client = useClient({apiVersion: API_VERSION})
  const toast = useToast()
  const [uploading, setUploading] = useState(0)

  const onPaste = useCallback<NonNullable<PortableTextInputProps['onPaste']>>(
    async (data) => {
      const clipboard = data.event.clipboardData
      if (!clipboard) return undefined

      const images = imageFilesFromClipboard(clipboard)
      if (!images.length) return undefined

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
              _key: keyForImage(),
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
              Ngjit foto direkt me Ctrl/⌘ + V
            </Text>
            <Text muted size={1}>
              Kopjo një fotografi ose screenshot dhe bëje paste në vendin e kursorit.
              Opsioni normal “Insert image” mbetet gjithmonë i disponueshëm.
            </Text>
            {statusText && <Text size={1}>{statusText}</Text>}
          </Stack>
        </Flex>
      </Card>
      <PortableTextInput {...props} onPaste={onPaste} />
    </Stack>
  )
}
