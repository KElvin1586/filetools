import { formatBytes } from '../lib/files'
import { useEntitlement } from '../state/entitlement'
import { useHistory } from '../state/history'
import { PremiumGate } from './PremiumGate'

interface HistoryPanelProps {
  open: boolean
  onClose: () => void
}

const TOOL_NAMES: Record<string, string> = {
  resize: 'Resize',
  compress: 'Compress',
  convert: 'Convert',
  crop: 'Crop',
  rotate: 'Rotate',
  metadata: 'Metadata',
  pdf: 'PDF tools',
}

/** Premium processing-history drawer. Local-only: names, sizes and counts. */
export function HistoryPanel({ open, onClose }: HistoryPanelProps) {
  const { entries, clear } = useHistory()
  const { isPremium } = useEntitlement()

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Processing history"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Processing history</h2>
          <button type="button" onClick={onClose} aria-label="Close history" className="btn-ghost px-2 py-1 text-lg">
            ×
          </button>
        </div>

        <div className="mt-4">
          <PremiumGate feature="history" teaser="See your last 50 processing jobs on this device.">
            {isPremium && (
              <>
                {entries.length === 0 ? (
                  <p className="mt-6 text-sm text-slate-400">
                    Nothing yet — processed files will appear here. History is stored only on this
                    device and never contains file contents.
                  </p>
                ) : (
                  <>
                    <ul className="mt-2 space-y-2">
                      {entries.map((entry) => (
                        <li key={entry.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                          <p className="text-sm text-slate-200">
                            <span className="font-medium text-sky-300">{TOOL_NAMES[entry.tool] ?? entry.tool}</span>
                            {' · '}
                            {entry.summary}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {new Date(entry.timestamp).toLocaleString()} · {entry.inputCount} in /{' '}
                            {entry.outputCount} out · {formatBytes(entry.inputBytes)} →{' '}
                            {formatBytes(entry.outputBytes)}
                          </p>
                        </li>
                      ))}
                    </ul>
                    <button type="button" onClick={clear} className="btn-ghost mt-4 text-xs text-red-400">
                      Clear history
                    </button>
                  </>
                )}
              </>
            )}
          </PremiumGate>
        </div>
      </div>
    </div>
  )
}
