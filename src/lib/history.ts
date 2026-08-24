/**
 * Processing history (Premium): a local-only log of what was processed.
 * Never contains file contents — names, sizes and counts only.
 */

import type { StorageLike } from './storage'
import type { ToolId } from './presets'

export interface HistoryEntry {
  id: string
  timestamp: number
  tool: ToolId
  summary: string
  inputCount: number
  outputCount: number
  inputBytes: number
  outputBytes: number
}

export const HISTORY_LIMIT = 50
export const HISTORY_STORAGE_KEY = 'filetools.history'

export function addHistoryEntry(
  list: readonly HistoryEntry[],
  entry: HistoryEntry,
): HistoryEntry[] {
  return [entry, ...list].slice(0, HISTORY_LIMIT)
}

export function parseHistory(json: string | null): HistoryEntry[] {
  if (!json) return []
  try {
    const raw: unknown = JSON.parse(json)
    if (!Array.isArray(raw)) return []
    return raw
      .filter(
        (item): item is HistoryEntry =>
          !!item &&
          typeof item === 'object' &&
          typeof (item as HistoryEntry).id === 'string' &&
          typeof (item as HistoryEntry).timestamp === 'number' &&
          typeof (item as HistoryEntry).tool === 'string' &&
          typeof (item as HistoryEntry).summary === 'string',
      )
      .slice(0, HISTORY_LIMIT)
  } catch {
    return []
  }
}

export function loadHistory(storage: StorageLike): HistoryEntry[] {
  return parseHistory(storage.getItem(HISTORY_STORAGE_KEY))
}

export function saveHistory(storage: StorageLike, entries: readonly HistoryEntry[]): void {
  storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)))
}

export function makeHistoryEntry(
  tool: ToolId,
  summary: string,
  stats: { inputCount: number; outputCount: number; inputBytes: number; outputBytes: number },
): HistoryEntry {
  return {
    id: `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    tool,
    summary: summary.slice(0, 200),
    ...stats,
  }
}
