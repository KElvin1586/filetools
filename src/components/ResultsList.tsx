import { useState } from 'react'
import { downloadBlob, formatBytes } from '../lib/files'
import { createZip } from '../lib/zip'
import { useEntitlement } from '../state/entitlement'
import { PremiumBadge } from './PremiumGate'

export interface ResultItem {
  name: string
  blob: Blob
  note?: string
  originalBytes?: number
}

interface ResultsListProps {
  results: ResultItem[]
  onClear: () => void
  zipName?: string
}

/** Lists processed files with per-file downloads and a Premium ZIP download. */
export function ResultsList({ results, onClear, zipName = 'filetools-results.zip' }: ResultsListProps) {
  const { isPremium, requestFeature } = useEntitlement()
  const [zipping, setZipping] = useState(false)
  const [zipError, setZipError] = useState<string | null>(null)

  if (results.length === 0) return null

  const downloadZip = async () => {
    if (!requestFeature('zipDownload')) return
    setZipping(true)
    setZipError(null)
    try {
      const entries = await Promise.all(
        results.map(async (r) => ({
          name: r.name,
          data: new Uint8Array(await r.blob.arrayBuffer()),
        })),
      )
      const zipped = createZip(entries)
      downloadBlob(new Blob([zipped.buffer as ArrayBuffer], { type: 'application/zip' }), zipName)
    } catch (error) {
      setZipError(error instanceof Error ? error.message : 'Could not create the ZIP archive.')
    } finally {
      setZipping(false)
    }
  }

  return (
    <section aria-label="Results" className="panel mt-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">
          Results <span className="text-slate-400">({results.length})</span>
        </h3>
        <div className="flex gap-2">
          {results.length > 1 &&
            (isPremium ? (
              <button type="button" onClick={() => void downloadZip()} disabled={zipping} className="btn-secondary text-xs">
                {zipping ? 'Creating ZIP…' : '⬇ Download ZIP'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => requestFeature('zipDownload')}
                className="btn-secondary text-xs"
              >
                ⬇ Download ZIP <PremiumBadge />
              </button>
            ))}
          <button type="button" onClick={onClear} className="btn-ghost text-xs">
            Clear
          </button>
        </div>
      </div>

      {zipError && (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {zipError}
        </p>
      )}

      <ul className="mt-3 divide-y divide-slate-800">
        {results.map((result) => {
          const saved =
            result.originalBytes && result.originalBytes > 0
              ? Math.round((1 - result.blob.size / result.originalBytes) * 100)
              : null
          return (
            <li key={result.name} className="flex flex-wrap items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-200" title={result.name}>
                  {result.name}
                </p>
                <p className="text-xs text-slate-400">
                  {formatBytes(result.blob.size)}
                  {result.originalBytes != null && ` · was ${formatBytes(result.originalBytes)}`}
                  {saved != null && saved > 0 && (
                    <span className="text-emerald-400"> · −{saved}%</span>
                  )}
                  {result.note && ` · ${result.note}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadBlob(result.blob, result.name)}
                className="btn-primary px-3 py-1.5 text-xs"
              >
                Download
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
