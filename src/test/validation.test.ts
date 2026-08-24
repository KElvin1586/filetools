import { describe, expect, it } from 'vitest'
import { isSupportedImage, sniffMimeType, validateFile, validateFiles } from '../lib/validation'

const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const JPEG_HEADER = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
const PDF_HEADER = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])
const WEBP_HEADER = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
])

function makeFile(bytes: Uint8Array, name: string, type: string): File {
  return new File([bytes], name, { type })
}

describe('sniffMimeType', () => {
  it('detects png, jpeg, webp, pdf signatures', async () => {
    expect(await sniffMimeType(new Blob([PNG_HEADER]))).toBe('image/png')
    expect(await sniffMimeType(new Blob([JPEG_HEADER]))).toBe('image/jpeg')
    expect(await sniffMimeType(new Blob([WEBP_HEADER]))).toBe('image/webp')
    expect(await sniffMimeType(new Blob([PDF_HEADER]))).toBe('application/pdf')
  })
  it('returns null for unknown content', async () => {
    expect(await sniffMimeType(new Blob([new TextEncoder().encode('hello world')]))).toBeNull()
  })
})

describe('validateFile', () => {
  const imageOpts = {
    maxBytes: 1024 * 1024,
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    kindLabel: 'image',
  }

  it('accepts a genuine png', async () => {
    const file = makeFile(PNG_HEADER, 'ok.png', 'image/png')
    expect(await validateFile(file, imageOpts)).toEqual({ ok: true })
  })

  it('rejects empty files', async () => {
    const file = makeFile(new Uint8Array(0), 'empty.png', 'image/png')
    const result = await validateFile(file, imageOpts)
    expect(result.ok).toBe(false)
  })

  it('rejects oversized files', async () => {
    const file = makeFile(new Uint8Array(2 * 1024 * 1024), 'big.png', 'image/png')
    const result = await validateFile(file, imageOpts)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/limit/)
  })

  it('rejects wrong content type even with a lying declared type', async () => {
    const file = makeFile(PDF_HEADER, 'evil.png', 'image/png')
    const result = await validateFile(file, imageOpts)
    expect(result.ok).toBe(false)
  })

  it('rejects declared/content mismatches', async () => {
    const file = makeFile(JPEG_HEADER, 'photo.png', 'image/png')
    const result = await validateFile(file, imageOpts)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/declared/)
  })

  it('rejects unsupported types with unknown signatures', async () => {
    const file = makeFile(new TextEncoder().encode('plain text'), 'notes.txt', 'text/plain')
    const result = await validateFile(file, imageOpts)
    expect(result.ok).toBe(false)
  })

  it('splits mixed batches into valid + errors', async () => {
    const good = makeFile(PNG_HEADER, 'good.png', 'image/png')
    const bad = makeFile(new TextEncoder().encode('nope'), 'bad.txt', 'text/plain')
    const { valid, errors } = await validateFiles([good, bad], imageOpts)
    expect(valid).toHaveLength(1)
    expect(errors).toHaveLength(1)
  })
})

describe('isSupportedImage', () => {
  it('recognises images by content', async () => {
    expect(await isSupportedImage(new Blob([PNG_HEADER]))).toBe(true)
    expect(await isSupportedImage(new Blob([PDF_HEADER]))).toBe(false)
  })
})
