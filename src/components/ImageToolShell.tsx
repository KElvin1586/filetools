import { useCallback, useState, type ReactNode } from 'react'
import { IMAGE_MIME_TYPES } from '../lib/files'
import { makeHistoryEntry } from '../lib/history'
import type { ImageProcessingResult } from '../lib/images'
import type { ToolId } from '../lib/presets'
import { useHistory } from '../state/history'
import { DropZone } from './DropZone'
import { FileList } from './FileList'
import { PresetsBar } from './PresetsBar'
import { ResultsList, type ResultItem } from './ResultsList'

interface ImageToolShellProps<S extends Record<string, unknown>> {
  tool: ToolId
  title: string
  description: string
  defaultSettings: S
  processOne: (file: File, settings: S) => Promise<ImageProcessingResult>
  renderOptions: (settings: S, patch: (partial: Partial<S>) => void, files: File[]) => ReactNode
  historySummary: (settings: S) => string
  accept?: readonly string[]
  kindLabel?: string
}

/**
 * Shared scaffold for the image tools: dropzone → options → process → results.
 * Handles batching, per-file errors, progress and history recording.
 */
export function ImageToolShell<S extends Record<string, unknown>>({
  tool,
  title,
  description,
  defaultSettings,
  processOne,
  renderOptions,
  historySummary,
  accept = IMAGE_MIME_TYPES,
  kindLabel = 'image',
}: ImageToolShellProps<S>) {
  const [files, setFiles] = useState<File[]>([])
  const [settings, setSettings] = useState<S>(defaultSettings)
  const [results, setResults] = useState<ResultItem[]>([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const { record } = useHistory()

  const patch = useCallback(
    (partial: Partial<S>) => setSettings((current) => ({ ...current, ...partial })),
    [],
  )

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((current) => [...current, ...incoming])
    setResults([])
    setErrors([])
  }, [])

  const run = useCallback(async () => {
    if (files.length === 0 || processing) return
    setProcessing(true)
    setErrors([])
    setProgress({ done: 0, total: files.length })

    const output: ResultItem[] = []
    const failures: string[] = []
    let inputBytes = 0
    let outputBytes = 0

    for (const [index, file] of files.entries()) {
      inputBytes += file.size
      try {
        const result = await processOne(file, settings)
        outputBytes += result.processedBytes
        output.push({
          name: result.name,
          blob: result.blob,
          originalBytes: result.originalBytes,
          note: result.width > 0 ? `${result.width} × ${result.height}` : undefined,
        })
      } catch (error) {
        failures.push(
          `${file.name}: ${error instanceof Error ? error.message : 'processing failed'}`,
        )
      }
      setProgress({ done: index + 1, total: files.length })
    }

    setResults(output)
    setErrors(failures)
    setProcessing(false)
    setProgress(null)

    if (output.length > 0) {
      record(
        makeHistoryEntry(tool, historySummary(settings), {
          inputCount: files.length,
          outputCount: output.length,
          inputBytes,
          outputBytes,
        }),
      )
    }
  }, [files, processing, processOne, settings, record, tool, historySummary])

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </header>

      <DropZone accept={accept} kindLabel={kindLabel} onFiles={addFiles} />

      <FileList
        files={files}
        onRemove={(index) => setFiles((current) => current.filter((_, i) => i !== index))}
        onClear={() => {
          setFiles([])
          setResults([])
          setErrors([])
        }}
      />

      {files.length > 0 && (
        <section aria-label="Options" className="panel mt-4 space-y-4 p-4">
          <PresetsBar tool={tool} getSettings={() => settings} onApply={(s) => patch(s as Partial<S>)} />
          {renderOptions(settings, patch, files)}
          <div className="flex items-center gap-3 border-t border-slate-800 pt-4">
            <button type="button" onClick={() => void run()} disabled={processing} className="btn-primary">
              {processing
                ? progress
                  ? `Processing ${progress.done} of ${progress.total}…`
                  : 'Processing…'
                : `Process ${files.length > 1 ? `${files.length} files` : 'file'}`}
            </button>
            {processing && (
              <span className="text-xs text-slate-400" role="status">
                Working locally — do not close the tab.
              </span>
            )}
          </div>
        </section>
      )}

      {errors.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300" role="alert">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      <ResultsList results={results} onClear={() => setResults([])} />
    </div>
  )
}
