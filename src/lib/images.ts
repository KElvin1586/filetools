/**
 * Image processing engine. Everything runs on <canvas> in the browser —
 * no network calls, no servers. Pure geometry helpers are separated from
 * DOM-touching code so they can be unit-tested in Node.
 */

import { buildOutputName, extensionForMime, type OutputFormat } from './files'

// ---------------------------------------------------------------------------
// Pure geometry (unit-testable)
// ---------------------------------------------------------------------------

export type ResizeMode = 'percent' | 'fit' | 'exact'

export interface ResizeOptions {
  mode: ResizeMode
  /** Used when mode === 'percent'. 1–1000. */
  percent?: number
  /** Target bounds for 'fit', or output size for 'exact'. */
  width?: number
  height?: number
  /** Allow output larger than the source (fit/percent modes). Default false. */
  allowUpscale?: boolean
}

export const MAX_DIMENSION = 16384

export function computeResizeDimensions(
  srcWidth: number,
  srcHeight: number,
  options: ResizeOptions,
): { width: number; height: number } {
  if (!(srcWidth > 0) || !(srcHeight > 0)) {
    throw new Error('Source image has invalid dimensions.')
  }
  const allowUpscale = options.allowUpscale ?? false
  let width: number
  let height: number

  if (options.mode === 'percent') {
    const percent = options.percent ?? 100
    if (!(percent > 0) || percent > 1000) throw new Error('Percent must be between 1 and 1000.')
    const scale = percent / 100
    width = srcWidth * scale
    height = srcHeight * scale
  } else if (options.mode === 'fit') {
    const targetW = options.width ?? 0
    const targetH = options.height ?? 0
    if (targetW <= 0 && targetH <= 0) {
      throw new Error('Provide at least a target width or height.')
    }
    const scaleW = targetW > 0 ? targetW / srcWidth : Infinity
    const scaleH = targetH > 0 ? targetH / srcHeight : Infinity
    const scale = Math.min(scaleW, scaleH)
    width = srcWidth * scale
    height = srcHeight * scale
  } else {
    const targetW = options.width ?? 0
    const targetH = options.height ?? 0
    if (targetW <= 0 || targetH <= 0) {
      throw new Error('Exact mode requires both width and height.')
    }
    width = targetW
    height = targetH
  }

  if (!allowUpscale && options.mode !== 'exact') {
    const scale = Math.min(1, srcWidth / width, srcHeight / height)
    width *= scale
    height *= scale
  }

  width = Math.round(width)
  height = Math.round(height)
  width = Math.max(1, Math.min(MAX_DIMENSION, width))
  height = Math.max(1, Math.min(MAX_DIMENSION, height))
  return { width, height }
}

export type RotationDegrees = 0 | 90 | 180 | 270

export function normalizeRotation(degrees: number): RotationDegrees {
  const normalized = ((Math.round(degrees / 90) * 90) % 360 + 360) % 360
  return normalized as RotationDegrees
}

export function rotateOutputDimensions(
  width: number,
  height: number,
  degrees: number,
): { width: number; height: number } {
  const angle = normalizeRotation(degrees)
  return angle === 90 || angle === 270
    ? { width: height, height: width }
    : { width, height }
}

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

/** Clamps a crop rectangle so it always lies inside the image, with a 1px minimum. */
export function clampCropRect(
  crop: CropRect,
  imageWidth: number,
  imageHeight: number,
): CropRect {
  const width = Math.max(1, Math.min(crop.width, imageWidth))
  const height = Math.max(1, Math.min(crop.height, imageHeight))
  const x = Math.max(0, Math.min(crop.x, imageWidth - width))
  const y = Math.max(0, Math.min(crop.y, imageHeight - height))
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  }
}

/** Parses "16:9" style ratios into a number; returns null for freeform/invalid input. */
export function parseAspectRatio(value: string): number | null {
  if (value === 'free' || value.trim() === '') return null
  const match = value.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/)
  if (!match) return null
  const w = Number(match[1])
  const h = Number(match[2])
  return w > 0 && h > 0 ? w / h : null
}

// ---------------------------------------------------------------------------
// Browser-only processing
// ---------------------------------------------------------------------------

export interface ImageProcessingResult {
  blob: Blob
  name: string
  width: number
  height: number
  format: OutputFormat
  originalBytes: number
  processedBytes: number
}

function loadImageElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('The image could not be decoded. It may be corrupt or unsupported.'))
    }
    image.src = url
  })
}

export async function getImageDimensions(
  blob: Blob,
): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob)
      const dims = { width: bitmap.width, height: bitmap.height }
      bitmap.close()
      return dims
    } catch {
      // Fall through to <img> decoding below.
    }
  }
  const image = await loadImageElement(blob)
  return { width: image.naturalWidth, height: image.naturalHeight }
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error(`Encoding to ${format} is not supported by this browser.`)),
      format,
      quality,
    )
  })
}

export interface ProcessImageOptions {
  crop?: CropRect
  rotateDegrees?: number
  flipHorizontal?: boolean
  flipVertical?: boolean
  resize?: ResizeOptions
  format: OutputFormat
  /** 0–1. Only meaningful for JPEG/WebP. */
  quality?: number
  /** Background color used to flatten transparency for JPEG output. */
  background?: string
  /** Filename suffix for the output, e.g. "resized". */
  suffix: string
}

/**
 * Full pipeline: crop → rotate/flip → resize → encode.
 * Exactly one pass through canvas, so quality loss is minimal.
 */
export async function processImage(
  file: File,
  options: ProcessImageOptions,
): Promise<ImageProcessingResult> {
  const image = await loadImageElement(file)
  const srcWidth = image.naturalWidth
  const srcHeight = image.naturalHeight
  if (!(srcWidth > 0) || !(srcHeight > 0)) {
    throw new Error('The image has no readable dimensions.')
  }

  const crop = options.crop
    ? clampCropRect(options.crop, srcWidth, srcHeight)
    : { x: 0, y: 0, width: srcWidth, height: srcHeight }

  const rotation = normalizeRotation(options.rotateDegrees ?? 0)
  const rotated = rotateOutputDimensions(crop.width, crop.height, rotation)

  const finalDims = options.resize
    ? computeResizeDimensions(rotated.width, rotated.height, options.resize)
    : { width: rotated.width, height: rotated.height }

  const canvas = document.createElement('canvas')
  canvas.width = finalDims.width
  canvas.height = finalDims.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not available in this browser.')

  const needsBackground = options.format === 'image/jpeg'
  if (needsBackground) {
    ctx.fillStyle = options.background ?? '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Transform space: move to center, rotate + flip, draw the cropped source.
  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.scale(options.flipHorizontal ? -1 : 1, options.flipVertical ? -1 : 1)

  // After rotation the drawn region's axes may be swapped relative to the canvas.
  const drawW = rotation === 90 || rotation === 270 ? canvas.height : canvas.width
  const drawH = rotation === 90 || rotation === 270 ? canvas.width : canvas.height
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    -drawW / 2,
    -drawH / 2,
    drawW,
    drawH,
  )
  ctx.restore()

  const quality =
    options.format === 'image/png' ? undefined : Math.min(1, Math.max(0.01, options.quality ?? 0.85))
  const blob = await canvasToBlob(canvas, options.format, quality)

  return {
    blob,
    name: buildOutputName(file.name, options.suffix, extensionForMime(options.format)),
    width: finalDims.width,
    height: finalDims.height,
    format: options.format,
    originalBytes: file.size,
    processedBytes: blob.size,
  }
}

/**
 * Advanced (Premium) compression: binary-searches JPEG/WebP quality until the
 * output fits the target size. PNG is ignored by design — its encoder has no
 * quality knob, so target-size mode would be meaningless.
 */
export async function compressToTargetSize(
  file: File,
  targetBytes: number,
  format: 'image/jpeg' | 'image/webp',
): Promise<{ blob: Blob; qualityUsed: number; name: string }> {
  if (!(targetBytes > 0)) throw new Error('Target size must be greater than zero.')

  let low = 0.02
  let high = 0.95
  let bestBlob: Blob | null = null
  let bestQuality = low

  for (let i = 0; i < 8; i += 1) {
    const mid = (low + high) / 2
    const result = await processImage(file, {
      format,
      quality: mid,
      suffix: 'compressed',
    })
    if (result.blob.size <= targetBytes) {
      bestBlob = result.blob
      bestQuality = mid
      low = mid // fits — try better quality
    } else {
      high = mid
    }
  }

  if (!bestBlob) {
    // Even the lowest quality overshoots; return the smallest we can make.
    const smallest = await processImage(file, {
      format,
      quality: 0.02,
      suffix: 'compressed',
    })
    return { blob: smallest.blob, qualityUsed: 0.02, name: smallest.name }
  }
  return {
    blob: bestBlob,
    qualityUsed: bestQuality,
    name: buildOutputName(file.name, 'compressed', extensionForMime(format)),
  }
}

/** Rasterises any decodable image blob to PNG bytes (used before PDF embedding). */
export async function rasterizeToPngBytes(blob: Blob): Promise<Uint8Array> {
  const image = await loadImageElement(blob)
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not available in this browser.')
  ctx.drawImage(image, 0, 0)
  const png = await canvasToBlob(canvas, 'image/png')
  return new Uint8Array(await png.arrayBuffer())
}
