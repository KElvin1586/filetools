import { describe, expect, it } from 'vitest'
import {
  aspectRatioString,
  buildOutputName,
  extensionForMime,
  formatBytes,
  gcd,
  megapixels,
  sanitizeFilename,
  stripExtension,
  uniqueFilename,
} from '../lib/files'

describe('formatBytes', () => {
  it('formats zero, bytes, KB and MB', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
  it('handles invalid input', () => {
    expect(formatBytes(-1)).toBe('—')
    expect(formatBytes(Number.NaN)).toBe('—')
  })
})

describe('filename helpers', () => {
  it('strips extensions', () => {
    expect(stripExtension('photo.jpeg')).toBe('photo')
    expect(stripExtension('archive.tar.gz')).toBe('archive.tar')
    expect(stripExtension('noext')).toBe('noext')
    expect(stripExtension('.hidden')).toBe('.hidden')
  })

  it('sanitizes unsafe characters', () => {
    expect(sanitizeFilename('a/b\\c:d*e?f"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j')
    expect(sanitizeFilename('  spaced   out  ')).toBe('spaced out')
    expect(sanitizeFilename('..')).toBe('file')
    expect(sanitizeFilename('')).toBe('file')
  })

  it('builds output names', () => {
    expect(buildOutputName('photo.jpg', 'resized', 'webp')).toBe('photo_resized.webp')
    expect(buildOutputName('my pic.png', 'compressed', 'jpg')).toBe('my pic_compressed.jpg')
  })

  it('dedupes names', () => {
    const taken = new Set(['a.png', 'a (2).png'])
    expect(uniqueFilename('b.png', taken)).toBe('b.png')
    expect(uniqueFilename('a.png', taken)).toBe('a (3).png')
  })

  it('maps mime types to extensions', () => {
    expect(extensionForMime('image/jpeg')).toBe('jpg')
    expect(extensionForMime('image/webp')).toBe('webp')
    expect(extensionForMime('application/pdf')).toBe('pdf')
    expect(extensionForMime('application/x-unknown')).toBe('bin')
  })
})

describe('aspect helpers', () => {
  it('computes gcd', () => {
    expect(gcd(1920, 1080)).toBe(120)
    expect(gcd(0, 5)).toBe(5)
  })
  it('formats aspect ratios', () => {
    expect(aspectRatioString(1920, 1080)).toBe('16:9')
    expect(aspectRatioString(1000, 1000)).toBe('1:1')
    expect(aspectRatioString(0, 100)).toBe('—')
  })
  it('computes megapixels', () => {
    expect(megapixels(4000, 3000)).toBe(12)
  })
})
