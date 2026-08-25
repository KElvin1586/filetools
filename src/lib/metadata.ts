/**
 * Metadata extraction using only browser APIs + pdf-lib — nothing is
 * uploaded anywhere. What we can show depends on what the browser exposes.
 */

import { aspectRatioString, formatBytes, megapixels } from './files'
import { getImageDimensions } from './images'
import { getPdfInfo } from './pdf'
import { sniffMimeType } from './validation'

export interface MetadataRow {
  label: string
  value: string
}

export interface FileMetadata {
  fileName: string
  rows: MetadataRow[]
}

export async function getFileMetadata(file: File): Promise<FileMetadata> {
  const rows: MetadataRow[] = [
    { label: 'Name', value: file.name },
    { label: 'Size', value: `${formatBytes(file.size)} (${file.size.toLocaleString()} bytes)` },
    { label: 'Declared type', value: file.type || 'not reported by browser' },
    { label: 'Last modified', value: new Date(file.lastModified).toLocaleString() },
  ]

  const sniffed = await sniffMimeType(file)
  rows.push({ label: 'Detected type', value: sniffed ?? 'unknown signature' })
  if (sniffed && file.type && sniffed !== file.type) {
    rows.push({ label: 'Warning', value: 'File extension/type does not match its content.' })
  }

  const effectiveType = sniffed ?? file.type

  if (effectiveType.startsWith('image/')) {
    try {
      const { width, height } = await getImageDimensions(file)
      rows.push({ label: 'Dimensions', value: `${width} × ${height} px` })
      rows.push({ label: 'Megapixels', value: megapixels(width, height).toFixed(2) })
      rows.push({ label: 'Aspect ratio', value: aspectRatioString(width, height) })
    } catch {
      rows.push({ label: 'Dimensions', value: 'unreadable (file may be corrupt)' })
    }
  }

  if (effectiveType === 'application/pdf') {
    try {
      const info = await getPdfInfo(new Uint8Array(await file.arrayBuffer()))
      rows.push({ label: 'Pages', value: String(info.pageCount) })
      if (info.title) rows.push({ label: 'Title', value: info.title })
      if (info.author) rows.push({ label: 'Author', value: info.author })
      if (info.subject) rows.push({ label: 'Subject', value: info.subject })
      if (info.creator) rows.push({ label: 'Creator', value: info.creator })
      if (info.creationDate)
        rows.push({ label: 'Created', value: info.creationDate.toLocaleString() })
    } catch {
      rows.push({ label: 'PDF info', value: 'unreadable (encrypted or corrupt PDF)' })
    }
  }

  rows.push({
    label: 'Processing',
    value: 'Read locally in your browser — never uploaded.',
  })

  return { fileName: file.name, rows }
}
