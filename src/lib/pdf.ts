/**
 * PDF utilities built on pdf-lib. pdf-lib is lazy-loaded so the main bundle
 * stays small; it only downloads when a PDF tool is actually used.
 */

export interface PdfImageInput {
  bytes: Uint8Array
  mimeType: string
  name?: string
}

/** Creates a PDF with one page per image, page size matching the image. */
export async function imagesToPdf(images: PdfImageInput[]): Promise<Uint8Array> {
  if (images.length === 0) throw new Error('Add at least one image.')
  const { PDFDocument } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  doc.setProducer('FileTools (client-side)')
  doc.setCreationDate(new Date())

  for (const [index, image] of images.entries()) {
    const label = image.name ?? `image ${index + 1}`
    let embedded
    if (image.mimeType === 'image/jpeg') {
      embedded = await doc.embedJpg(image.bytes)
    } else if (image.mimeType === 'image/png') {
      embedded = await doc.embedPng(image.bytes)
    } else {
      throw new Error(`"${label}" must be JPEG or PNG bytes before PDF embedding.`)
    }
    // Cap page size at 1440pt to keep files sane for huge photos.
    const scale = Math.min(1, 1440 / Math.max(embedded.width, embedded.height))
    const page = doc.addPage([embedded.width * scale, embedded.height * scale])
    page.drawImage(embedded, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() })
  }
  return doc.save()
}

/** Merges several PDFs into one, preserving page order. */
export async function mergePdfs(pdfBytesList: Uint8Array[]): Promise<Uint8Array> {
  if (pdfBytesList.length < 2) throw new Error('Merging needs at least two PDF files.')
  const { PDFDocument } = await import('pdf-lib')
  const merged = await PDFDocument.create()
  merged.setProducer('FileTools (client-side)')

  for (const bytes of pdfBytesList) {
    const source = await PDFDocument.load(bytes, { ignoreEncryption: false })
    const pages = await merged.copyPages(source, source.getPageIndices())
    for (const page of pages) merged.addPage(page)
  }
  return merged.save()
}

export interface PdfInfo {
  pageCount: number
  title?: string
  author?: string
  subject?: string
  creator?: string
  creationDate?: Date
  modificationDate?: Date
}

export async function getPdfInfo(bytes: Uint8Array): Promise<PdfInfo> {
  const { PDFDocument } = await import('pdf-lib')
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return {
    pageCount: doc.getPageCount(),
    title: doc.getTitle() || undefined,
    author: doc.getAuthor() || undefined,
    subject: doc.getSubject() || undefined,
    creator: doc.getCreator() || undefined,
    creationDate: doc.getCreationDate(),
    modificationDate: doc.getModificationDate(),
  }
}
