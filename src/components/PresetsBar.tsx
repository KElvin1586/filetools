import { useState } from 'react'
import { BUILT_IN_PRESETS, loadCustomPresets, makePreset, saveCustomPresets, type ToolId, type ToolPreset } from '../lib/presets'
import { getStorage } from '../lib/storage'
import { useEntitlement } from '../state/entitlement'
import { PremiumGate } from './PremiumGate'

interface PresetsBarProps {
  tool: ToolId
  /** Current settings snapshot for "save current as preset". */
  getSettings: () => Record<string, unknown>
  onApply: (settings: Record<string, unknown>) => void
}

/** Premium preset bar: apply built-in/custom presets, save and delete custom ones. */
export function PresetsBar({ tool, getSettings, onApply }: PresetsBarProps) {
  const { isPremium } = useEntitlement()
  const [custom, setCustom] = useState<ToolPreset[]>(() => loadCustomPresets(getStorage()))
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')

  const presets = [...BUILT_IN_PRESETS.filter((p) => p.tool === tool), ...custom.filter((p) => p.tool === tool)]

  const apply = (id: string) => {
    const preset = presets.find((p) => p.id === id)
    if (preset) onApply({ ...preset.settings })
  }

  const saveCurrent = () => {
    const preset = makePreset(name, tool, getSettings())
    const next = [...custom, preset]
    setCustom(next)
    saveCustomPresets(getStorage(), next)
    setSaving(false)
    setName('')
  }

  const remove = (id: string) => {
    const next = custom.filter((p) => p.id !== id)
    setCustom(next)
    saveCustomPresets(getStorage(), next)
  }

  return (
    <PremiumGate feature="presets" teaser="Save and reuse your favourite settings in one click.">
      {isPremium && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Presets</span>
          <select
            aria-label="Apply a preset"
            className="input w-auto py-1 text-xs"
            value=""
            onChange={(e) => e.target.value && apply(e.target.value)}
          >
            <option value="">Apply…</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
                {preset.builtIn ? '' : ' ★'}
              </option>
            ))}
          </select>
          {saving ? (
            <span className="flex items-center gap-1">
              <input
                aria-label="Preset name"
                className="input w-36 py-1 text-xs"
                placeholder="Preset name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveCurrent()}
              />
              <button type="button" onClick={saveCurrent} className="btn-primary px-2 py-1 text-xs">
                Save
              </button>
              <button type="button" onClick={() => setSaving(false)} className="btn-ghost px-2 py-1 text-xs">
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setSaving(true)} className="btn-ghost px-2 py-1 text-xs">
              + Save current
            </button>
          )}
          {custom
            .filter((p) => p.tool === tool)
            .map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => remove(p.id)}
                title={`Delete preset "${p.name}"`}
                className="text-xs text-slate-400 hover:text-red-400"
              >
                ✕ {p.name}
              </button>
            ))}
        </div>
      )}
    </PremiumGate>
  )
}
