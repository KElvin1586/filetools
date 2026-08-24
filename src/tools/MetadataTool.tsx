import { useCallback, useState } from 'react'
import { DropZone } from '../components/DropZone'
import { IMAGE_MIME_TYPES, PDF_MIME_TYPE } from '../lib/files'
import { getFileMetadata, type FileMetadata } from '../lib/metadata'

const ACCEPTED = [...IMAGE_MIME_TYPES, PDF_MIME_TYPE] as const

/** Read-only metadata viewer — dimensions, sizes, types, PDF info. */
export function MetadataTool() {
  const [items, setItems] = useState<FileMetadata[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onFiles = useCallback(async (files: File[]) => {
    setLoading(true)
    setError(null)
    try {
      const metadata = await Promise.all(files.map((file) => getFileMetadata(file)))
      setItems(metadata)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read metadata.')
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-white">Metadata viewer</h1>
        <p className="mt-1 text-sm text-slate-400">
          Inspect what the browser can read: type, size, dimensions, PDF properties. Read locally,
          never uploaded. Batch viewing is a Premium feature.
        </p>
      </header>

      <DropZone
        accept={ACCEPTED}
        kindLabel="image or PDF"
        onFiles={(files) => void onFiles(files)}
      />

      {loading && (
        <p className="mt-4 text-sm text-slate-400" role="status">
          Reading metadata…
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 space-y-4">
        {items.map((item, index) => (
          <section key={`${item.fileName}-${index}`} className="panel overflow-hidden" aria-label={`Metadata for ${item.fileName}`}>
            <h2 className="border-b border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              {item.fileName}
            </h2>
            <dl className="divide-y divide-slate-800/60">
              {item.rows.map((row) => (
                <div key={row.label} className="grid grid-cols-3 gap-2 px-4 py-2 text-sm">
                  <dt className="text-slate-400">{row.label}</dt>
                  <dd className="col-span-2 break-words text-slate-200">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      {items.length > 0 && (
        <button type="button" onClick={() => setItems([])} className="btn-ghost mt-4 text-xs">
          Clear results
        </button>
      )}
    </div>
  )
}
