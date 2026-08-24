import { describe, expect, it } from 'vitest'
import {
  MAX_DIMENSION,
  clampCropRect,
  computeResizeDimensions,
  normalizeRotation,
  parseAspectRatio,
  rotateOutputDimensions,
} from '../lib/images'

describe('computeResizeDimensions', () => {
  it('scales by percent', () => {
    expect(computeResizeDimensions(1000, 500, { mode: 'percent', percent: 50 })).toEqual({
      width: 500,
      height: 250,
    })
  })

  it('fits within bounds preserving aspect', () => {
    expect(computeResizeDimensions(1000, 500, { mode: 'fit', width: 500, height: 500 })).toEqual({
      width: 500,
      height: 250,
    })
  })

  it('fit works with only one bound', () => {
    expect(computeResizeDimensions(1000, 500, { mode: 'fit', height: 100 })).toEqual({
      width: 200,
      height: 100,
    })
  })

  it('never upscales by default', () => {
    expect(computeResizeDimensions(100, 100, { mode: 'percent', percent: 200 })).toEqual({
      width: 100,
      height: 100,
    })
  })

  it('upscales when allowed', () => {
    expect(
      computeResizeDimensions(100, 100, { mode: 'percent', percent: 200, allowUpscale: true }),
    ).toEqual({ width: 200, height: 200 })
  })

  it('exact mode sets both dimensions', () => {
    expect(computeResizeDimensions(1000, 500, { mode: 'exact', width: 640, height: 480 })).toEqual(
      { width: 640, height: 480 },
    )
  })

  it('clamps to MAX_DIMENSION and minimum 1', () => {
    const result = computeResizeDimensions(100000, 1, {
      mode: 'exact',
      width: 100000,
      height: 1,
    })
    expect(result.width).toBe(MAX_DIMENSION)
    expect(result.height).toBe(1)
  })

  it('rejects invalid input', () => {
    expect(() => computeResizeDimensions(0, 100, { mode: 'percent', percent: 50 })).toThrow()
    expect(() => computeResizeDimensions(100, 100, { mode: 'percent', percent: 0 })).toThrow()
    expect(() => computeResizeDimensions(100, 100, { mode: 'fit' })).toThrow()
    expect(() => computeResizeDimensions(100, 100, { mode: 'exact', width: 10 })).toThrow()
  })
})

describe('rotation helpers', () => {
  it('normalizes any angle to 0/90/180/270', () => {
    expect(normalizeRotation(0)).toBe(0)
    expect(normalizeRotation(90)).toBe(90)
    expect(normalizeRotation(450)).toBe(90)
    expect(normalizeRotation(-90)).toBe(270)
    expect(normalizeRotation(150)).toBe(180)
  })
  it('swaps dimensions at 90/270', () => {
    expect(rotateOutputDimensions(100, 200, 90)).toEqual({ width: 200, height: 100 })
    expect(rotateOutputDimensions(100, 200, 270)).toEqual({ width: 200, height: 100 })
    expect(rotateOutputDimensions(100, 200, 180)).toEqual({ width: 100, height: 200 })
  })
})

describe('clampCropRect', () => {
  it('keeps the rect inside the image', () => {
    expect(clampCropRect({ x: -5, y: -5, width: 50, height: 50 }, 100, 100)).toEqual({
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    })
    expect(clampCropRect({ x: 90, y: 90, width: 50, height: 50 }, 100, 100)).toEqual({
      x: 50,
      y: 50,
      width: 50,
      height: 50,
    })
  })
  it('caps oversized rects to the image', () => {
    expect(clampCropRect({ x: 0, y: 0, width: 500, height: 500 }, 100, 80)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    })
  })
  it('enforces a 1px minimum', () => {
    const result = clampCropRect({ x: 10, y: 10, width: 0, height: 0 }, 100, 100)
    expect(result.width).toBe(1)
    expect(result.height).toBe(1)
  })
})

describe('parseAspectRatio', () => {
  it('parses ratios and handles freeform', () => {
    expect(parseAspectRatio('16:9')).toBeCloseTo(16 / 9)
    expect(parseAspectRatio('1:1')).toBe(1)
    expect(parseAspectRatio('free')).toBeNull()
    expect(parseAspectRatio('')).toBeNull()
    expect(parseAspectRatio('bogus')).toBeNull()
    expect(parseAspectRatio('0:1')).toBeNull()
  })
})
