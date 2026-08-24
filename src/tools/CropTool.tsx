import { useCallback, useEffect, useRef, useState } from 'react'
import { DropZone } from '../components/DropZone'
import { ResultsList, type ResultItem } from '../components/ResultsList'
import { IMAGE_MIME_TYPES, OUTPUT_FORMATS, type OutputFormat } from '../lib/files'
import { makeHistoryEntry } from '../lib/history'
import {
  clampCropRect,
  parseAspectRatio,
  processImage,
  type CropRect,
} from '../lib/images'
import { useHistory } from '../state/history'

type HandleMode = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const ASPECT_OPTIONS = ['free', '1:1', '4:3', '3:2', '16:9'] as const

function resizeCrop(
  start: CropRect,
  mode: HandleMode,
  dx: number,
  dy: number,
  aspect: number | null,
  imgW: number,
  imgH: number,
): CropRect {
  let { x, y, width, height } = start
  if (mode.includes('e')) width = start.width + dx
  if (mode.includes('s')) height = start.height + dy
  if (mode.includes('w')) {
    x = start.x + dx
    width = start.width - dx
  }
  if (mode.includes('n')) {
    y = start.y + dy
    height = start.height - dy
  }
  if (aspect) {
    if (mode.includes('e') || mode.includes('w')) {
      const h = width / aspect
      if (mode.includes('n')) y = start.y + (start.height - h)
      height = h
    } else {
      const w = height * aspect
      if (mode.includes('w')) x = start.x + (start.width - w)
      width = w
    }
  }
  width = Math.max(10, width)
  height = Math.max(10, height)
  return clampCropRect({ x, y, width, height }, imgW, imgH)
}

interface CropEditorProps {
  file: File
  imageUrl: string
  naturalWidth: number
  naturalHeight: number
  crop: CropRect
  onChange: (crop: CropRect) => void
  aspect: number | null
}

/** Interactive crop overlay with pointer drag, corner handles and numeric inputs. */
function CropEditor({ imageUrl, naturalWidth, naturalHeight, crop, onChange, aspect }: CropEditorProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const dragRef = useRef<{ mode: HandleMode; startX: number; startY: number; startCrop: CropRect } | null>(null)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const update = () => setScale(frame.clientWidth / naturalWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [naturalWidth])

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      event.preventDefault()
      const dx = (event.clientX - drag.startX) / scale
      const dy = (event.clientY - drag.startY) / scale
      if (drag.mode === 'move') {
        onChange(
          clampCropRect(
            { ...drag.startCrop, x: drag.startCrop.x + dx, y: drag.startCrop.y + dy },
            naturalWidth,
            naturalHeight,
          ),
        )
      } else {
        onChange(
          resizeCrop(drag.startCrop, drag.mode, dx, dy, aspect, naturalWidth, naturalHeight),
        )
      }
    }
    const onUp = () => {
      dragRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [aspect, naturalWidth, naturalHeight, onChange, scale])

  const beginDrag = (mode: HandleMode, event: React.PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = { mode, startX: event.clientX, startY: event.clientY, startCrop: crop }
  }

  const style = {
    left: crop.x * scale,
    top: crop.y * scale,
    width: crop.width * scale,
    height: crop.height * scale,
  }

  const handles: HandleMode[] = ['nw', 'ne', 'sw', 'se']

  return (
    <div
      ref={frameRef}
      className="relative inline-block max-w-full select-none overflow-hidden rounded-lg border border-slate-700"
      style={{ touchAction: 'none' }}
    >
      <img src={imageUrl} alt="Crop preview" className="block max-h-[55vh] max-w-full" draggable={false} />
      <div
        role="presentation"
        aria-hidden="true"
        onPointerDown={(e) => beginDrag('move', e)}
        className="absolute cursor-move border-2 border-sky-400"
        style={{ ...style, boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.65)' }}
      >
        {handles.map((handle) => (
          <span
            key={handle}
            onPointerDown={(e) => beginDrag(handle, e)}
            className="absolute h-4 w-4 rounded-sm border border-slate-950 bg-sky-400"
            style={{
              left: handle.includes('w') ? -8 : undefined,
              right: handle.includes('e') ? -8 : undefined,
              top: handle.includes('n') ? -8 : undefined,
              bottom: handle.includes('s') ? -8 : undefined,
              cursor:
                handle === 'nw' || handle === 'se'
                  ? 'nwse-resize'
                  : 'nesw-resize',
            }}
          />
        ))}
      </div>
    </div>
  )
}

export function CropTool() {
  const [file, setFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null)
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 1, height: 1 })
  const [aspectChoice, setAspectChoice] = useState<string>('free')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ResultItem[]>([])
  const { record } = useHistory()

  const reset = useCallback(() => {
    setFile(null)
    setNatural(null)
    setResults([])
    setError(null)
    setImageUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
  }, [])

  const onFiles = useCallback(
    (files: File[]) => {
      const picked = files[0]
      if (!picked) return
      reset()
      const url = URL.createObjectURL(picked)
      const image = new Image()
      image.onload = () => {
        const dims = { width: image.naturalWidth, height: image.naturalHeight }
        setNatural(dims)
        setCrop({ x: 0, y: 0, width: dims.width, height: dims.height })
      }
      image.onerror = () => setError('The image could not be decoded.')
      image.src = url
      setFile(picked)
      setImageUrl(url)
    },
    [reset],
  )

  const onAspectChange = (value: string) => {
    setAspectChoice(value)
    const aspect = parseAspectRatio(value)
    if (aspect && natural) {
      setCrop((current) => {
        const width = Math.min(current.width, natural.width)
        return clampCropRect(
          { ...current, width, height: width / aspect },
          natural.width,
          natural.height,
        )
      })
    }
  }

  const applyCrop = async () => {
    if (!file || !natural) return
    setProcessing(true)
    setError(null)
    try {
      const format: OutputFormat = (OUTPUT_FORMATS as readonly string[]).includes(file.type)
        ? (file.type as OutputFormat)
        : 'image/png'
      const result = await processImage(file, {
        crop,
        format,
        quality: 0.92,
        suffix: 'cropped',
      })
      setResults([
        {
          name: result.name,
          blob: result.blob,
          originalBytes: result.originalBytes,
          note: `${result.width} × ${result.height}`,
        },
      ])
      record(
        makeHistoryEntry('crop', `crop to ${result.width}×${result.height}`, {
          inputCount: 1,
          outputCount: 1,
          inputBytes: file.size,
          outputBytes: result.blob.size,
        }),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cropping failed.')
    } finally {
      setProcessing(false)
    }
  }

  const setCropField = (field: keyof CropRect) => (value: number) => {
    if (!natural) return
    setCrop((current) =>
      clampCropRect({ ...current, [field]: value }, natural.width, natural.height),
    )
  }

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-white">Crop image</h1>
        <p className="mt-1 text-sm text-slate-400">
          Drag the frame or its corners, or type exact pixel values. Single image at a time.
        </p>
      </header>

      {!file ? (
        <DropZone accept={IMAGE_MIME_TYPES} kindLabel="image" batch={false} onFiles={onFiles} />
      ) : (
        <>
          <div className="panel p-4">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="truncate text-sm text-slate-300">{file.name}</span>
              <span className="text-xs text-slate-400">
                {natural?.width} × {natural?.height} px
              </span>
              <button type="button" onClick={reset} className="btn-ghost px-2 py-1 text-xs">
                Choose another image
              </button>
            </div>

            {imageUrl && natural && (
              <CropEditor
                file={file}
                imageUrl={imageUrl}
                naturalWidth={natural.width}
                naturalHeight={natural.height}
                crop={crop}
                onChange={setCrop}
                aspect={parseAspectRatio(aspectChoice)}
              />
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div>
                <label htmlFor="crop-aspect" className="label">Aspect</label>
                <select
                  id="crop-aspect"
                  className="input"
                  value={aspectChoice}
                  onChange={(e) => onAspectChange(e.target.value)}
                >
                  {ASPECT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === 'free' ? 'Free' : option}
                    </option>
                  ))}
                </select>
              </div>
              {(
                [
                  ['x', 'X'],
                  ['y', 'Y'],
                  ['width', 'Width'],
                  ['height', 'Height'],
                ] as const
              ).map(([field, labelText]) => (
                <div key={field}>
                  <label htmlFor={`crop-${field}`} className="label">{labelText}</label>
                  <input
                    id={`crop-${field}`}
                    type="number"
                    min={0}
                    className="input"
                    value={Math.round(crop[field])}
                    onChange={(e) => setCropField(field)(Number(e.target.value))}
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => void applyCrop()}
                disabled={processing || !natural}
                className="btn-primary"
              >
                {processing ? 'Cropping…' : 'Crop image'}
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300" role="alert">
              {error}
            </p>
          )}
        </>
      )}

      <ResultsList results={results} onClear={() => setResults([])} />
    </div>
  )
}
