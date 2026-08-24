import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  addHistoryEntry,
  loadHistory,
  saveHistory,
  type HistoryEntry,
} from '../lib/history'
import { getStorage } from '../lib/storage'

interface HistoryContextValue {
  entries: HistoryEntry[]
  record: (entry: HistoryEntry) => void
  clear: () => void
}

const HistoryContext = createContext<HistoryContextValue | null>(null)

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => loadHistory(getStorage()))

  const record = useCallback((entry: HistoryEntry) => {
    setEntries((current) => {
      const next = addHistoryEntry(current, entry)
      saveHistory(getStorage(), next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setEntries([])
    saveHistory(getStorage(), [])
  }, [])

  const value = useMemo(() => ({ entries, record, clear }), [entries, record, clear])
  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
}

export function useHistory(): HistoryContextValue {
  const ctx = useContext(HistoryContext)
  if (!ctx) throw new Error('useHistory must be used inside HistoryProvider')
  return ctx
}
