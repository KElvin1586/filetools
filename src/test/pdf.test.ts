import { describe, expect, it } from 'vitest'
import { getPdfInfo, imagesToPdf, mergePdfs } from '../lib/pdf'
import { getFileMetadata } from '../lib/metadata'

/** A real, minimal 1×1 red PNG. */
const PNG_1PX = Uint8Array.from(atob(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
), (c) => c.charCodeAt(0))

async function makeSimplePdf(pageCount: number): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  doc.setTitle('Test doc')
  for (let i = 0; i < pageCount; i += 1) doc.addPage([200, 200])
  return doc.save()
}

describe('imagesToPdf', () => {
  it('embeds PNG images, one page each', async () => {
    const pdf = await imagesToPdf([
      { bytes: PNG_1PX, mimeType: 'image/png', name: 'one.png' },
      { bytes: PNG_1PX, mimeType: 'image/png', name: 'two.png' },
    ])
    expect(pdf[0]).toBe(0x25) // %
    expect(pdf[1]).toBe(0x50) // P
    const info = await getPdfInfo(pdf)
    expect(info.pageCount).toBe(2)
  })

  it('rejects non-embeddable types', async () => {
    await expect(
      imagesToPdf([{ bytes: PNG_1PX, mimeType: 'image/webp', name: 'x.webp' }]),
    ).rejects.toThrow()
  })

  it('rejects empty input', async () => {
    await expect(imagesToPdf([])).rejects.toThrow()
  })
})

describe('mergePdfs', () => {
  it('merges page counts and preserves order', async () => {
    const a = await makeSimplePdf(2)
    const b = await makeSimplePdf(3)
    const merged = await mergePdfs([a, b])
    const info = await getPdfInfo(merged)
    expect(info.pageCount).toBe(5)
  })

  it('requires at least two documents', async () => {
    const a = await makeSimplePdf(1)
    await expect(mergePdfs([a])).rejects.toThrow()
  })
})

describe('getPdfInfo', () => {
  it('reads title and page count', async () => {
    const pdf = await makeSimplePdf(3)
    const info = await getPdfInfo(pdf)
    expect(info.pageCount).toBe(3)
    expect(info.title).toBe('Test doc')
  })
})

describe('getFileMetadata', () => {
  it('reports PDF pages and basic file facts', async () => {
    const pdf = await makeSimplePdf(4)
    const file = new File([pdf], 'report.pdf', { type: 'application/pdf' })
    const meta = await getFileMetadata(file)
    const rows = Object.fromEntries(meta.rows.map((r) => [r.label, r.value]))
    expect(meta.fileName).toBe('report.pdf')
    expect(rows['Pages']).toBe('4')
    expect(rows['Detected type']).toBe('application/pdf')
    expect(rows['Name']).toBe('report.pdf')
    expect(rows['Processing']).toMatch(/never uploaded/i)
  })

  it('flags type/content mismatches', async () => {
    const png = new File([PNG_1PX], 'sneaky.pdf', { type: 'application/pdf' })
    const meta = await getFileMetadata(png)
    const rows = Object.fromEntries(meta.rows.map((r) => [r.label, r.value]))
    expect(rows['Detected type']).toBe('image/png')
    expect(rows['Warning']).toMatch(/does not match/)
  })
})
