import { describe, expect, it } from 'vitest'
import { unzipSync } from 'fflate'
import { createZip } from '../lib/zip'

describe('createZip', () => {
  it('produces a valid zip archive with all entries', () => {
    const data = createZip([
      { name: 'a.txt', data: new TextEncoder().encode('hello') },
      { name: 'b.txt', data: new TextEncoder().encode('world') },
    ])
    // Real ZIP magic bytes
    expect(data[0]).toBe(0x50) // P
    expect(data[1]).toBe(0x4b) // K
    const entries = unzipSync(data)
    expect(Object.keys(entries).sort()).toEqual(['a.txt', 'b.txt'])
    expect(new TextDecoder().decode(entries['a.txt'])).toBe('hello')
  })

  it('deduplicates colliding names instead of losing files', () => {
    const data = createZip([
      { name: 'same.png', data: new Uint8Array([1]) },
      { name: 'same.png', data: new Uint8Array([2]) },
      { name: 'same.png', data: new Uint8Array([3]) },
    ])
    const names = Object.keys(unzipSync(data)).sort()
    expect(names).toEqual(['same (2).png', 'same (3).png', 'same.png'])
  })

  it('throws on empty input', () => {
    expect(() => createZip([])).toThrow()
  })
})
