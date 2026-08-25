import { describe, expect, it } from 'vitest'
import {
  HISTORY_LIMIT,
  addHistoryEntry,
  loadHistory,
  makeHistoryEntry,
  parseHistory,
  saveHistory,
} from '../lib/history'
import { MemoryStorage } from '../lib/storage'

describe('history', () => {
  const entry = (n: number) =>
    makeHistoryEntry('resize', `job ${n}`, {
      inputCount: 1,
      outputCount: 1,
      inputBytes: 100,
      outputBytes: 50,
    })

  it('adds newest first and caps at the limit', () => {
    let list = addHistoryEntry([], entry(1))
    list = addHistoryEntry(list, entry(2))
    expect(list[0].summary).toBe('job 2')
    for (let i = 0; i < HISTORY_LIMIT + 10; i += 1) {
      list = addHistoryEntry(list, entry(i))
    }
    expect(list).toHaveLength(HISTORY_LIMIT)
  })

  it('round-trips through storage', () => {
    const storage = new MemoryStorage()
    saveHistory(storage, [entry(1), entry(2)])
    const loaded = loadHistory(storage)
    expect(loaded).toHaveLength(2)
    expect(loaded[0].summary).toBe('job 1')
  })

  it('drops malformed entries', () => {
    const parsed = parseHistory(JSON.stringify([{ id: 'x' }, entry(3), 'junk']))
    expect(parsed).toHaveLength(1)
    expect(parsed[0].summary).toBe('job 3')
  })

  it('handles corrupt storage gracefully', () => {
    expect(parseHistory('{oops')).toEqual([])
    expect(parseHistory(null)).toEqual([])
  })
})
