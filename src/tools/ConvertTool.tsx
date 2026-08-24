import { useEntitlement } from '../state/entitlement'
import { ImageToolShell } from '../components/ImageToolShell'
import { PremiumBadge, PremiumGate } from '../components/PremiumGate'
import { extensionForMime, type OutputFormat } from '../lib/files'
import { processImage } from '../lib/images'

interface ConvertSettings extends Record<string, unknown> {
  format: OutputFormat
  quality: number
  background: string
}

const DEFAULTS: ConvertSettings = {
  format: 'image/webp',
  quality: 85,
  background: '#ffffff',
}

export function ConvertTool() {
  const { isPremium } = useEntitlement()

  return (
    <ImageToolShell
      tool="convert"
      title="Convert images"
      description="Convert between JPG, PNG and WebP. GIF and BMP inputs are decoded and re-encoded too (first frame for GIF)."
      defaultSettings={DEFAULTS}
      historySummary={(s) => `to ${extensionForMime(s.format).toUpperCase()}`}
      processOne={(file, s) =>
        processImage(file, {
          format: s.format,
          quality: s.quality / 100,
          background: s.background,
          suffix: extensionForMime(s.format),
        })
      }
      renderOptions={(s, patch) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="convert-format" className="label">
                Convert to
              </label>
              <select
                id="convert-format"
                className="input"
                value={s.format}
                onChange={(e) => patch({ format: e.target.value as OutputFormat })}
              >
                <option value="image/jpeg">JPG — universal, lossy</option>
                <option value="image/png">PNG — lossless, transparency</option>
                <option value="image/webp">WebP — modern, small</option>
              </select>
            </div>
          </div>

          <PremiumGate
            feature="advancedSettings"
            teaser="Tune quality for lossy formats and pick a background when flattening transparency to JPG."
          >
            <div className="grid gap-4 rounded-lg border border-slate-800 p-3 sm:grid-cols-2">
              <div>
                <label htmlFor="convert-quality" className="label">
                  Quality — {s.quality}% {s.format === 'image/png' && '(ignored for PNG)'}
                </label>
                <input
                  id="convert-quality"
                  type="range"
                  min={1}
                  max={100}
                  value={s.quality}
                  onChange={(e) => patch({ quality: Number(e.target.value) })}
                  className="w-full accent-sky-400"
                />
              </div>
              <div>
                <label htmlFor="convert-background" className="label">
                  JPG background
                </label>
                <input
                  id="convert-background"
                  type="color"
                  value={s.background}
                  onChange={(e) => patch({ background: e.target.value })}
                  className="h-9 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900"
                />
              </div>
            </div>
          </PremiumGate>
          {!isPremium && (
            <p className="text-xs text-slate-500">
              Free plan: conversion at a good default quality, single files.
              <PremiumBadge />
            </p>
          )}
        </>
      )}
    />
  )
}
