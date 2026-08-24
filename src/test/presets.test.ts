import { describe, expect, it } from 'vitest'
import {
  BUILT_IN_PRESETS,
  loadCustomPresets,
  makePreset,
  parsePresets,
  saveCustomPresets,
  serializePresets,
} from '../lib/presets'
import { MemoryStorage } from '../lib/storage'

describe('presets', () => {
  it('round-trips custom presets through storage', () => {
    const storage = new MemoryStorage()
    const preset = makePreset('My preset', 'resize', { mode: 'fit', width: 800 })
    saveCustomPresets(storage, [preset])
    const loaded = loadCustomPresets(storage)
    expect(loaded).toHaveLength(1)
    expect(loaded[0].name).toBe('My preset')
    expect(loaded[0].settings).toEqual({ mode: 'fit', width: 800 })
  })

  it('drops malformed entries when parsing', () => {
    const json = JSON.stringify([
      { id: 'ok', name: 'Good', tool: 'resize', settings: {}, createdAt: 1 },
      { id: 42, name: 'bad id' },
      'nonsense',
      { id: 'no-settings', name: 'x', tool: 'resize' },
    ])
    const parsed = parsePresets(json)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe('ok')
  })

  it('returns empty for invalid json and null', () => {
    expect(parsePresets('not json{')).toEqual([])
    expect(parsePresets(null)).toEqual([])
    expect(parsePresets('{"a":1}')).toEqual([])
  })

  it('never serializes built-ins', () => {
    const json = serializePresets([...BUILT_IN_PRESETS, makePreset('custom', 'crop', {})])
    expect(JSON.parse(json)).toHaveLength(1)
  })

  it('built-ins target real tools', () => {
    const tools = new Set(BUILT_IN_PRESETS.map((p) => p.tool))
    expect(tools.has('resize')).toBe(true)
    expect(tools.has('compress')).toBe(true)
    expect(tools.has('convert')).toBe(true)
  })

  it('makePreset falls back for empty names', () => {
    expect(makePreset('   ', 'resize', {}).name).toBe('Untitled preset')
  })
})
