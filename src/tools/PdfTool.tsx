import { useCallback, useState } from 'react'
import { DropZone } from '../components/DropZone'
import { FileList } from '../components/FileList'
import { ResultsList, type ResultItem } from '../components/ResultsList'
import { PremiumBadge } from '../components/PremiumGate'
import { config } from '../config'
import { IMAGE_MIME_TYPES, PDF_MIME_TYPE } from '../lib/files'
import { makeHistoryEntry } from '../lib/history'
import { rasterizeToPngBytes } from '../lib/images'
import { imagesToPdf, mergePdfs } from '../lib/pdf'
import { useEntitlement } from '../state/entitlement'
import { useHistory } from '../state/history'

type PdfMode = 'images-to-pdf' | 'merge'

/**
 * PDF utilities that are reliable fully client-side via pdf-lib:
 * images → PDF and PDF merging. Larger batches are Premium.
 */
export function PdfTool() {
  const [mode, setMode] = useState<PdfMode>('images-to-pdf')
  const [files, setFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ResultItem[]>([])
  const { isPremium, requestFeature } = useEntitlement()
  const { record } = useHistory()

  const freeLimit = mode === 'merge' ? config.freePdfMergeLimit : config.freePdfImagesLimit

  const onFiles = useCallback(
    (incoming: File[]) => {
      setError(null)
      setResults([])
      const total = files.length + incoming.length
      if (!isPremium && total > freeLimit) {
        requestFeature('batch')
        setError(
          `Free plan: up to ${freeLimit} ${mode === 'merge' ? 'PDFs' : 'images'} per job. Premium raises the limit to ${config.maxBatchFiles}.`,
        )
        return
      }
      setFiles((current) => [...current, ...incoming])
    },
    [files.length, freeLimit, isPremium, mode, requestFeature],
  )

  const switchMode = (next: PdfMode) => {
    setMode(next)
    setFiles([])
    setResults([])
    setError(null)
  }

  const run = async () => {
    setProcessing(true)
    setError(null)
    setResults([])
    try {
      const inputBytes = files.reduce((sum, f) => sum + f.size, 0)
      if (mode === 'images-to-pdf') {
        const images = await Promise.all(
          files.map(async (file) => {
            if (file.type === 'image/jpeg' || file.type === 'image/png') {
              return {
                bytes: new Uint8Array(await file.arrayBuffer()),
                mimeType: file.type,
                name: file.name,
              }
            }
            // WebP/GIF/BMP can't be embedded directly — rasterise to PNG first.
            return { bytes: await rasterizeToPngBytes(file), mimeType: 'image/png', name: file.name }
          }),
        )
        const pdf = await imagesToPdf(images)
        setResults([
          {
            name: 'images.pdf',
            blob: new Blob([pdf.buffer as ArrayBuffer], { type: PDF_MIME_TYPE }),
            originalBytes: inputBytes,
            note: `${images.length} page${images.length === 1 ? '' : 's'}`,
          },
        ])
        record(
          makeHistoryEntry('pdf', `images → PDF (${images.length} pages)`, {
            inputCount: files.length,
            outputCount: 1,
            inputBytes,
            outputBytes: pdf.byteLength,
          }),
        )
      } else {
        const pdfBytes = await Promise.all(
          files.map(async (f) => new Uint8Array(await f.arrayBuffer())),
        )
        const merged = await mergePdfs(pdfBytes)
        setResults([
          {
            name: 'merged.pdf',
            blob: new Blob([merged.buffer as ArrayBuffer], { type: PDF_MIME_TYPE }),
            originalBytes: inputBytes,
          },
        ])
        record(
          makeHistoryEntry('pdf', `merged ${files.length} PDFs`, {
            inputCount: files.length,
            outputCount: 1,
            inputBytes,
            outputBytes: merged.byteLength,
          }),
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF operation failed.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-white">PDF utilities</h1>
        <p className="mt-1 text-sm text-slate-400">
          Combine images into a PDF or merge PDFs — done locally with pdf-lib.
        </p>
      </header>

      <div className="mb-4 flex gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1" role="tablist" aria-label="PDF mode">
        {(
          [
            ['images-to-pdf', 'Images → PDF'],
            ['merge', 'Merge PDFs'],
          ] as const
        ).map(([value, labelText]) => (
          <button
            key={value}
            role="tab"
            aria-selected={mode === value}
            type="button"
            onClick={() => switchMode(value)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mode === value ? 'bg-sky-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {labelText}
          </button>
        ))}
      </div>

      <DropZone
        accept={mode === 'merge' ? [PDF_MIME_TYPE] : IMAGE_MIME_TYPES}
        kindLabel={mode === 'merge' ? 'PDF' : 'image'}
        onFiles={onFiles}
        gateBatchSelection={false}
        label={
          mode === 'merge'
            ? 'Drop PDF files here (order = merge order)'
            : 'Drop images here (order = page order)'
        }
        hint={
          isPremium
            ? `Up to ${config.maxBatchFiles} files`
            : `Free plan: up to ${freeLimit} files per job · larger batches are Premium`
        }
      />

      <FileList
        files={files}
        onRemove={(index) => setFiles((current) => current.filter((_, i) => i !== index))}
        onClear={() => {
          setFiles([])
          setResults([])
          setError(null)
        }}
      />

      {files.length > 0 && (
        <div className="panel mt-4 flex items-center gap-3 p-4">
          <button
            type="button"
            onClick={() => void run()}
            disabled={processing || (mode === 'merge' && files.length < 2)}
            className="btn-primary"
          >
            {processing
              ? 'Working…'
              : mode === 'merge'
                ? `Merge ${files.length} PDFs`
                : `Create PDF from ${files.length} image${files.length === 1 ? '' : 's'}`}
          </button>
          {!isPremium && (
            <span className="text-xs text-slate-400">
              Larger batches <PremiumBadge />
            </span>
          )}
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      <ResultsList results={results} onClear={() => setResults([])} />
    </div>
  )
}
