import { IMAGE_MIME_TYPES, PDF_MIME_TYPE } from './files'

/**
 * Security-first file validation. Every file entering FileTools is checked
 * for size, declared MIME type, and — where magic bytes exist — actual
 * content, so a renamed executable can't pose as an image.
 */

export interface FileValidationOptions {
  maxBytes: number
  acceptedMimeTypes: readonly string[]
  kindLabel?: string
}

export type FileValidationResult = { ok: true } | { ok: false; error: string }

const ok: FileValidationResult = { ok: true }
const err = (error: string): FileValidationResult => ({ ok: false, error })

/**
 * Sniffs the first bytes of a blob to determine its real type.
 * Returns null when the signature is unknown (caller then falls back to
 * the browser-reported type).
 */
export async function sniffMimeType(blob: Blob): Promise<string | null> {
  const header = new Uint8Array(await blob.slice(0, 16).arrayBuffer())
  if (header.length < 4) return null

  // JPEG: FF D8 FF
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return 'image/jpeg'
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  )
    return 'image/png'
  // GIF: "GIF8"
  if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38)
    return 'image/gif'
  // BMP: "BM"
  if (header[0] === 0x42 && header[1] === 0x4d) return 'image/bmp'
  // WebP: "RIFF" .... "WEBP"
  if (
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  )
    return 'image/webp'
  // PDF: "%PDF-"
  if (
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46 &&
    header[4] === 0x2d
  )
    return PDF_MIME_TYPE
  return null
}

/** True when the blob's content (or declared type, if unsniffable) is an image we can decode. */
export async function isSupportedImage(blob: Blob): Promise<boolean> {
  const sniffed = await sniffMimeType(blob)
  const effective = sniffed ?? blob.type
  return (IMAGE_MIME_TYPES as readonly string[]).includes(effective)
}

export async function validateFile(
  file: File,
  options: FileValidationOptions,
): Promise<FileValidationResult> {
  const kind = options.kindLabel ?? 'file'

  if (file.size === 0) return err(`"${file.name}" is empty.`)
  if (file.size > options.maxBytes) {
    const limitMb = Math.round(options.maxBytes / (1024 * 1024))
    return err(`"${file.name}" exceeds the ${limitMb} MB limit.`)
  }

  const declared = (file.type || '').toLowerCase()
  const sniffed = await sniffMimeType(file)

  if (sniffed) {
    // Content carries a known signature — it must match an accepted type.
    if (!options.acceptedMimeTypes.includes(sniffed)) {
      return err(
        `"${file.name}" looks like ${sniffed}, which is not a supported ${kind} here.`,
      )
    }
    if (declared && declared !== sniffed) {
      return err(
        `"${file.name}" is declared as ${declared} but its content is ${sniffed}. The file was rejected for safety.`,
      )
    }
    return ok
  }

  // No recognisable signature: trust the browser-reported type only.
  if (declared && options.acceptedMimeTypes.includes(declared)) return ok
  return err(`"${file.name}" is not a supported ${kind}.`)
}

/** Validates many files, splitting results into accepted files and human-readable errors. */
export async function validateFiles(
  files: File[],
  options: FileValidationOptions,
): Promise<{ valid: File[]; errors: string[] }> {
  const valid: File[] = []
  const errors: string[] = []
  for (const file of files) {
    const result = await validateFile(file, options)
    if (result.ok) valid.push(file)
    else errors.push(result.error)
  }
  return { valid, errors }
}
