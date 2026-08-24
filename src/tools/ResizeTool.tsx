import { useEntitlement } from '../state/entitlement'
import { ImageToolShell } from '../components/ImageToolShell'
import { PremiumBadge, PremiumGate } from '../components/PremiumGate'
import { OUTPUT_FORMATS, type OutputFormat } from '../lib/files'
import { processImage, type ResizeMode } from '../lib/images'

interface ResizeSettings extends Record<string, unknown> {
  mode: ResizeMode
  percent: number
  width: number
  height: number
  allowUpscale: boolean
  format: 'original' | OutputFormat
  quality: number
  background: string
}

const DEFAULTS: ResizeSettings = {
  mode: 'percent',
  percent: 50,
  width: 1920,
  height: 1080,
  allowUpscale: false,
  format: 'original',
  quality: 85,
  background: '#ffffff',
}

function outputFormatFor(file: File, settings: ResizeSettings): OutputFormat {
  if (settings.format !== 'original') return settings.format
  return (OUTPUT_FORMATS as readonly string[]).includes(file.type)
    ? (file.type as OutputFormat)
    : 'image/png'
}

export function ResizeTool() {
  const { isPremium } = useEntitlement()

  return (
    <ImageToolShell
      tool="resize"
      title="Resize images"
      description="Scale images by percentage, fit them into a bounding box, or set exact dimensions. Everything runs locally."
      defaultSettings={DEFAULTS}
      historySummary={(s) =>
        s.mode === 'percent'
          ? `to ${s.percent}%`
          : s.mode === 'fit'
            ? `fit ${s.width}×${s.height}`
            : `exact ${s.width}×${s.height}`
      }
      processOne={(file, s) =>
        processImage(file, {
          resize: {
            mode: s.mode,
            percent: s.percent,
            width: s.width,
            height: s.height,
            allowUpscale: s.allowUpscale,
          },
          format: outputFormatFor(file, s),
          quality: s.quality / 100,
          background: s.background,
          suffix: 'resized',
        })
      }
      renderOptions={(s, patch) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="resize-mode" className="label">
                Mode
              </label>
              <select
                id="resize-mode"
                className="input"
                value={s.mode}
                onChange={(e) => {
                  const mode = e.target.value as ResizeMode
                  if (mode === 'exact' && !isPremium) return // locked option is disabled anyway
                  patch({ mode })
                }}
              >
                <option value="percent">Percentage</option>
                <option value="fit">Fit within bounds</option>
                <option value="exact" disabled={!isPremium}>
                  Exact dimensions {isPremium ? '' : '· 🔒 Premium'}
                </option>
              </select>
            </div>

            {s.mode === 'percent' && (
              <div>
                <label htmlFor="resize-percent" className="label">
                  Scale — {s.percent}%
                </label>
                <input
                  id="resize-percent"
                  type="range"
                  min={1}
                  max={200}
                  value={s.percent}
                  onChange={(e) => patch({ percent: Number(e.target.value) })}
                  className="w-full accent-sky-400"
                />
              </div>
            )}

            {s.mode !== 'percent' && (
              <>
                <div>
                  <label htmlFor="resize-width" className="label">
                    Width (px)
                  </label>
                  <input
                    id="resize-width"
                    type="number"
                    min={1}
                    max={16384}
                    className="input"
                    value={s.width}
                    onChange={(e) => patch({ width: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label htmlFor="resize-height" className="label">
                    Height (px)
                  </label>
                  <input
                    id="resize-height"
                    type="number"
                    min={1}
                    max={16384}
                    className="input"
                    value={s.height}
                    onChange={(e) => patch({ height: Number(e.target.value) })}
                  />
                </div>
              </>
            )}
          </div>

          <PremiumGate
            feature="advancedResize"
            teaser="Exact dimensions, upscaling, output format and quality control."
          >
            <div className="grid gap-4 rounded-lg border border-slate-800 p-3 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={s.allowUpscale}
                  onChange={(e) => patch({ allowUpscale: e.target.checked })}
                  className="accent-sky-400"
                />
                Allow upscaling
              </label>
              <div>
                <label htmlFor="resize-format" className="label">
                  Output format
                </label>
                <select
                  id="resize-format"
                  className="input"
                  value={s.format}
                  onChange={(e) => patch({ format: e.target.value as ResizeSettings['format'] })}
                >
                  <option value="original">Keep original</option>
                  <option value="image/jpeg">JPG</option>
                  <option value="image/png">PNG</option>
                  <option value="image/webp">WebP</option>
                </select>
              </div>
              <div>
                <label htmlFor="resize-quality" className="label">
                  Quality — {s.quality}%
                </label>
                <input
                  id="resize-quality"
                  type="range"
                  min={1}
                  max={100}
                  value={s.quality}
                  onChange={(e) => patch({ quality: Number(e.target.value) })}
                  className="w-full accent-sky-400"
                />
              </div>
            </div>
          </PremiumGate>
          {!isPremium && (
            <p className="text-xs text-slate-500">
              Free plan: percentage and fit resizing, single files, original format kept.
              <PremiumBadge />
            </p>
          )}
        </>
      )}
    />
  )
}
