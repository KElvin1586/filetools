import { useCallback, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { config } from '../config'
import { formatBytes } from '../lib/files'
import { validateFiles } from '../lib/validation'
import { useEntitlement } from '../state/entitlement'

interface DropZoneProps {
  accept: readonly string[]
  kindLabel: string
  onFiles: (files: File[]) => void
  /** Allow multi-file (batch) selection. Batch is gated to Premium. */
  batch?: boolean
  /** Set false when the tool implements its own free/premium limits (PDF tools). */
  gateBatchSelection?: boolean
  label?: string
  hint?: string
  disabled?: boolean
}

/**
 * Accessible drag-and-drop target. Validates size, declared type and magic
 * bytes before files reach any tool; batch drops trigger the Premium gate.
 */
export function DropZone({
  accept,
  kindLabel,
  onFiles,
  batch = true,
  gateBatchSelection = true,
  label,
  hint,
  disabled = false,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const { isPremium, requestFeature } = useEntitlement()

  const handleFiles = useCallback(
    async (incoming: File[]) => {
      if (disabled || incoming.length === 0) return

      const files = incoming
      if (incoming.length > config.maxBatchFiles) {
        setErrors([`Please select at most ${config.maxBatchFiles} files at once.`])
        return
      }

      // Central FREE|PREMIUM gate: more than one file = batch = Premium.
      if (files.length > 1 && gateBatchSelection && (!batch || !isPremium)) {
        const allowed = batch ? requestFeature('batch') : false
        if (!allowed) {
          setErrors(
            batch
              ? ['Batch processing is a Premium feature — one file at a time on the Free plan.']
              : [`This tool accepts one ${kindLabel} at a time.`],
          )
          return
        }
        return // user just saw the modal; they can retry after upgrading
      }

      const { valid, errors: validationErrors } = await validateFiles(files, {
        maxBytes: config.maxFileSizeBytes,
        acceptedMimeTypes: accept,
        kindLabel,
      })
      setErrors(validationErrors)
      if (valid.length > 0) onFiles(valid)
    },
    [accept, batch, disabled, gateBatchSelection, isPremium, kindLabel, onFiles, requestFeature],
  )

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      setDragging(false)
      void handleFiles(Array.from(event.dataTransfer.files))
    },
    [handleFiles],
  )

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      inputRef.current?.click()
    }
  }, [])

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label ?? `Add ${kindLabel} files`}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={onKeyDown}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging
            ? 'border-sky-400 bg-sky-500/10'
            : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <svg
          aria-hidden="true"
          className="mb-3 h-10 w-10 text-slate-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"
          />
        </svg>
        <p className="text-sm font-medium text-slate-200">
          {label ?? `Drag & drop ${batch ? 'files' : `a ${kindLabel}`} here, or click to browse`}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {hint ??
            `${accept.join(', ')} · up to ${formatBytes(config.maxFileSizeBytes, 0)} per file${
              batch && !isPremium ? ' · batch is Premium' : ''
            }`}
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept={accept.join(',')}
          data-testid="file-input"
          onChange={(e) => {
            const list = e.target.files ? Array.from(e.target.files) : []
            e.target.value = '' // allow picking the same file twice
            void handleFiles(list)
          }}
        />
      </div>
      {errors.length > 0 && (
        <ul
          className="mt-3 space-y-1 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300"
          role="alert"
        >
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
