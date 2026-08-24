import { useEntitlement } from '../state/entitlement'
import { ImageToolShell } from '../components/ImageToolShell'
import { PremiumBadge, PremiumGate } from '../components/PremiumGate'
import { type OutputFormat } from '../lib/files'
import { compressToTargetSize, processImage } from '../lib/images'

interface CompressSettings extends Record<string, unknown> {
  level: 'light' | 'balanced' | 'strong'
  mode: 'level' | 'quality' | 'target'
  quality: number
  targetKB: number
  format: 'image/jpeg' | 'image/webp'
}

const DEFAULTS: CompressSettings = {
  level: 'balanced',
  mode: 'level',
  quality: 60,
  targetKB: 500,
  format: 'image/jpeg',
}

const LEVEL_QUALITY: Record<CompressSettings['level'], number> = {
  light: 80,
  balanced: 60,
  strong: 40,
}

const LEVEL_LABELS: Record<CompressSettings['level'], string> = {
  light: 'Light (best quality)',
  balanced: 'Balanced',
  strong: 'Strong (smallest file)',
}

export function CompressTool() {
  const { isPremium } = useEntitlement()

  return (
    <ImageToolShell
      tool="compress"
      title="Compress images"
      description="Shrink JPG, PNG and WebP files. Presets on Free; exact quality and target file size on Premium."
      defaultSettings={DEFAULTS}
      historySummary={(s) =>
        s.mode === 'target'
          ? `to ≤${s.targetKB} KB`
          : s.mode === 'quality'
            ? `quality ${s.quality}%`
            : `${s.level} compression`
      }
      processOne={async (file, s) => {
        if (s.mode === 'target') {
          const { blob, qualityUsed, name } = await compressToTargetSize(
            file,
            s.targetKB * 1024,
            s.format,
          )
          void qualityUsed
          return {
            blob,
            name,
            width: 0,
            height: 0,
            format: s.format,
            originalBytes: file.size,
            processedBytes: blob.size,
          }
        }
        const quality = s.mode === 'quality' ? s.quality : LEVEL_QUALITY[s.level]
        const format: OutputFormat =
          file.type === 'image/png' && s.mode === 'level' ? 'image/png' : s.format
        return processImage(file, {
          format,
          quality: quality / 100,
          suffix: 'compressed',
        })
      }}
      renderOptions={(s, patch) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="compress-level" className="label">
                Compression level
              </label>
              <select
                id="compress-level"
                className="input"
                value={s.level}
                disabled={s.mode !== 'level'}
                onChange={(e) => patch({ level: e.target.value as CompressSettings['level'] })}
              >
                {(Object.keys(LEVEL_LABELS) as Array<CompressSettings['level']>).map((level) => (
                  <option key={level} value={level}>
                    {LEVEL_LABELS[level]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="compress-format" className="label">
                Output format
              </label>
              <select
                id="compress-format"
                className="input"
                value={s.format}
                onChange={(e) => patch({ format: e.target.value as CompressSettings['format'] })}
              >
                <option value="image/jpeg">JPG (smallest)</option>
                <option value="image/webp">WebP (modern)</option>
              </select>
            </div>
          </div>

          <PremiumGate
            feature="advancedCompression"
            teaser="Dial in exact quality or set a target file size in KB."
          >
            <div className="grid gap-4 rounded-lg border border-slate-800 p-3 sm:grid-cols-2">
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="radio"
                    name="compress-mode"
                    checked={s.mode === 'quality'}
                    onChange={() => patch({ mode: 'quality' })}
                    className="accent-sky-400"
                  />
                  Exact quality — {s.quality}%
                </label>
                <input
                  aria-label="Exact quality"
                  type="range"
                  min={1}
                  max={100}
                  disabled={s.mode !== 'quality'}
                  value={s.quality}
                  onChange={(e) => patch({ mode: 'quality', quality: Number(e.target.value) })}
                  className="mt-2 w-full accent-sky-400"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="radio"
                    name="compress-mode"
                    checked={s.mode === 'target'}
                    onChange={() => patch({ mode: 'target' })}
                    className="accent-sky-400"
                  />
                  Target file size
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    aria-label="Target size in kilobytes"
                    type="number"
                    min={10}
                    disabled={s.mode !== 'target'}
                    className="input"
                    value={s.targetKB}
                    onChange={(e) => patch({ mode: 'target', targetKB: Number(e.target.value) })}
                  />
                  <span className="text-sm text-slate-400">KB</span>
                </div>
              </div>
              {s.mode !== 'level' && (
                <button
                  type="button"
                  className="btn-ghost px-2 py-1 text-xs sm:col-span-2"
                  onClick={() => patch({ mode: 'level' })}
                >
                  ← Back to preset levels
                </button>
              )}
            </div>
          </PremiumGate>
          {!isPremium && (
            <p className="text-xs text-slate-500">
              Free plan: preset compression levels, single files.
              <PremiumBadge />
            </p>
          )}
        </>
      )}
    />
  )
}
