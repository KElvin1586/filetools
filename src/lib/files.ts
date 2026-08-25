/** Shared file helpers: type maps, naming, formatting, downloads. */

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
] as const

export type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number]

export const OUTPUT_FORMATS = ['image/jpeg', 'image/png', 'image/webp'] as const
export type OutputFormat = (typeof OUTPUT_FORMATS)[number]

export const PDF_MIME_TYPE = 'application/pdf'

export const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'application/pdf': 'pdf',
  'application/zip': 'zip',
}

export const EXTENSION_TO_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_TO_EXTENSION).map(([mime, ext]) => [ext, mime]),
)

export function extensionForMime(mime: string): string {
  return MIME_TO_EXTENSION[mime] ?? 'bin'
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  return `${value.toFixed(value >= 100 || index === 0 ? 0 : decimals)} ${units[index]}`
}

/** Strips the final extension from a filename: "photo.jpeg" → "photo". */
export function stripExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

/** Makes a string safe to use as a filename across common filesystems. */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    // eslint-disable-next-line no-control-regex -- intentionally strips control chars from untrusted filenames
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned === '' || cleaned === '.' || cleaned === '..' ? 'file' : cleaned
}

/** Builds an output filename: ("photo.jpg", "resized", "webp") → "photo_resized.webp". */
export function buildOutputName(original: string, suffix: string, extension: string): string {
  const base = sanitizeFilename(stripExtension(original))
  const tag = suffix ? `_${sanitizeFilename(suffix)}` : ''
  return `${base}${tag}.${extension.replace(/^\./, '')}`
}

/** Returns a name that does not collide with anything in `taken` ("a.png" → "a (2).png"). */
export function uniqueFilename(name: string, taken: ReadonlySet<string>): string {
  if (!taken.has(name)) return name
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  for (let i = 2; ; i += 1) {
    const candidate = `${base} (${i})${ext}`
    if (!taken.has(candidate)) return candidate
  }
}

/** Greatest common divisor, used for aspect-ratio display. */
export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a))
  let y = Math.abs(Math.round(b))
  while (y !== 0) {
    const t = y
    y = x % y
    x = t
  }
  return x || 1
}

export function aspectRatioString(width: number, height: number): string {
  if (width <= 0 || height <= 0) return '—'
  const divisor = gcd(width, height)
  const w = width / divisor
  const h = height / divisor
  // Avoid absurd ratios like "533:300"; approximate to common ratios instead.
  if (w > 100 || h > 100) {
    const ratio = width / height
    for (const [cw, ch] of [
      [16, 9],
      [16, 10],
      [4, 3],
      [3, 2],
      [5, 4],
      [1, 1],
      [9, 16],
      [3, 4],
      [2, 3],
      [21, 9],
    ] as const) {
      if (Math.abs(ratio - cw / ch) < 0.02) return `${cw}:${ch}`
    }
    return `${ratio.toFixed(2)}:1`
  }
  return `${w}:${h}`
}

export function megapixels(width: number, height: number): number {
  return (width * height) / 1_000_000
}

/** Triggers a browser download for a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = sanitizeFilename(filename)
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Defer revocation so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer())
}
