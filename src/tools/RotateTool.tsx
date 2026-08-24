import { useEffect, useState } from 'react'
import { ImageToolShell } from '../components/ImageToolShell'
import { OUTPUT_FORMATS, type OutputFormat } from '../lib/files'
import { processImage, normalizeRotation } from '../lib/images'

interface RotateSettings extends Record<string, unknown> {
  degrees: number
  flipHorizontal: boolean
  flipVertical: boolean
  format: 'original' | OutputFormat
  quality: number
}

const DEFAULTS: RotateSettings = {
  degrees: 90,
  flipHorizontal: false,
  flipVertical: false,
  format: 'original',
  quality: 90,
}

function outputFormatFor(file: File, settings: RotateSettings): OutputFormat {
  if (settings.format !== 'original') return settings.format
  return (OUTPUT_FORMATS as readonly string[]).includes(file.type)
    ? (file.type as OutputFormat)
    : 'image/png'
}

/** Live CSS-transform preview of the rotation/flip applied to the first queued file. */
function RotationPreview({ files, degrees, flipH, flipV }: { files: File[]; degrees: number; flipH: boolean; flipV: boolean }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const file = files[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URLs must be created in an effect
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [files])

  if (!url || files.length === 0) return null
  const normalized = normalizeRotation(degrees)
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
      <span className="text-xs uppercase tracking-wide text-slate-400">Preview — {files[0].name}</span>
      <div className="flex h-48 w-full items-center justify-center overflow-hidden">
        <img
          src={url}
          alt={`Preview of ${files[0].name}`}
          className="max-h-44 max-w-full transition-transform duration-200"
          style={{
            transform: `rotate(${normalized}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})${normalized === 90 || normalized === 270 ? ' scale(0.6)' : ''}`,
          }}
        />
      </div>
    </div>
  )
}

export function RotateTool() {
  return (
    <ImageToolShell
      tool="rotate"
      title="Rotate & flip images"
      description="Rotate by 90° steps and flip horizontally or vertically. Lossless geometry, re-encoded locally."
      defaultSettings={DEFAULTS}
      historySummary={(s) =>
        `${normalizeRotation(s.degrees)}°${s.flipHorizontal ? ' + flip H' : ''}${s.flipVertical ? ' + flip V' : ''}`
      }
      processOne={(file, s) =>
        processImage(file, {
          rotateDegrees: s.degrees,
          flipHorizontal: s.flipHorizontal,
          flipVertical: s.flipVertical,
          format: outputFormatFor(file, s),
          quality: s.quality / 100,
          suffix: 'rotated',
        })
      }
      renderOptions={(s, patch, files) => (
        <>
          <RotationPreview
            files={files}
            degrees={s.degrees}
            flipH={s.flipHorizontal}
            flipV={s.flipVertical}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => patch({ degrees: normalizeRotation(s.degrees - 90) })}
            >
              ⟲ 90° left
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => patch({ degrees: normalizeRotation(s.degrees + 90) })}
            >
              ⟳ 90° right
            </button>
            <button
              type="button"
              className={s.flipHorizontal ? 'btn-primary' : 'btn-secondary'}
              aria-pressed={s.flipHorizontal}
              onClick={() => patch({ flipHorizontal: !s.flipHorizontal })}
            >
              ⇋ Flip horizontal
            </button>
            <button
              type="button"
              className={s.flipVertical ? 'btn-primary' : 'btn-secondary'}
              aria-pressed={s.flipVertical}
              onClick={() => patch({ flipVertical: !s.flipVertical })}
            >
              ⇅ Flip vertical
            </button>
            <span className="text-sm text-slate-400">
              Current: {normalizeRotation(s.degrees)}°
            </span>
          </div>
        </>
      )}
    />
  )
}

export { RotationPreview }
