import { formatBytes } from '../lib/files'

interface FileListProps {
  files: File[]
  onRemove: (index: number) => void
  onClear: () => void
}

/** Shows the queued input files with sizes and remove buttons. */
export function FileList({ files, onRemove, onClear }: FileListProps) {
  if (files.length === 0) return null
  return (
    <section aria-label="Selected files" className="panel mt-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          Selected <span className="text-slate-400">({files.length})</span>
        </h3>
        <button type="button" onClick={onClear} className="btn-ghost px-2 py-1 text-xs">
          Remove all
        </button>
      </div>
      <ul className="mt-2 divide-y divide-slate-800">
        {files.map((file, index) => (
          <li key={`${file.name}-${index}`} className="flex items-center gap-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm text-slate-200" title={file.name}>
              {file.name}
            </span>
            <span className="text-xs text-slate-500">{formatBytes(file.size)}</span>
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Remove ${file.name}`}
              className="btn-ghost px-2 py-1 text-xs text-slate-400 hover:text-red-400"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
