/**
 * Tool presets: named, reusable settings bundles. Built-ins ship with the
 * app; custom presets are a Premium feature persisted to local storage.
 */

import type { StorageLike } from './storage'

export type ToolId =
  | 'resize'
  | 'compress'
  | 'convert'
  | 'crop'
  | 'rotate'
  | 'metadata'
  | 'pdf'

export interface ToolPreset {
  id: string
  name: string
  tool: ToolId
  settings: Record<string, unknown>
  createdAt: number
  builtIn?: boolean
}

export const BUILT_IN_PRESETS: readonly ToolPreset[] = [
  {
    id: 'builtin-resize-avatar',
    name: 'Avatar · 256px',
    tool: 'resize',
    builtIn: true,
    createdAt: 0,
    settings: { mode: 'fit', width: 256, height: 256 },
  },
  {
    id: 'builtin-resize-social',
    name: 'Social post · 1080px',
    tool: 'resize',
    builtIn: true,
    createdAt: 0,
    settings: { mode: 'fit', width: 1080, height: 1080 },
  },
  {
    id: 'builtin-resize-fullhd',
    name: 'Full HD · 1920px',
    tool: 'resize',
    builtIn: true,
    createdAt: 0,
    settings: { mode: 'fit', width: 1920, height: 1080 },
  },
  {
    id: 'builtin-compress-email',
    name: 'Email-friendly · 500 KB',
    tool: 'compress',
    builtIn: true,
    createdAt: 0,
    settings: { mode: 'target', targetKB: 500, format: 'image/jpeg' },
  },
  {
    id: 'builtin-convert-webp',
    name: 'Modern web · WebP q80',
    tool: 'convert',
    builtIn: true,
    createdAt: 0,
    settings: { format: 'image/webp', quality: 80 },
  },
] as const

const PRESETS_STORAGE_KEY = 'filetools.presets'

/** Validates and normalises untrusted JSON into presets. Bad entries are dropped. */
export function parsePresets(json: string | null): ToolPreset[] {
  if (!json) return []
  try {
    const raw: unknown = JSON.parse(json)
    if (!Array.isArray(raw)) return []
    const valid: ToolPreset[] = []
    for (const item of raw) {
      if (
        item &&
        typeof item === 'object' &&
        typeof (item as ToolPreset).id === 'string' &&
        typeof (item as ToolPreset).name === 'string' &&
        typeof (item as ToolPreset).tool === 'string' &&
        (item as ToolPreset).settings !== null &&
        typeof (item as ToolPreset).settings === 'object'
      ) {
        const preset = item as ToolPreset
        valid.push({
          id: preset.id.slice(0, 64),
          name: preset.name.slice(0, 60),
          tool: preset.tool,
          settings: preset.settings,
          createdAt: typeof preset.createdAt === 'number' ? preset.createdAt : Date.now(),
        })
      }
    }
    return valid
  } catch {
    return []
  }
}

export function serializePresets(presets: readonly ToolPreset[]): string {
  return JSON.stringify(presets.filter((p) => !p.builtIn))
}

export function loadCustomPresets(storage: StorageLike): ToolPreset[] {
  return parsePresets(storage.getItem(PRESETS_STORAGE_KEY))
}

export function saveCustomPresets(storage: StorageLike, presets: readonly ToolPreset[]): void {
  storage.setItem(PRESETS_STORAGE_KEY, serializePresets(presets))
}

export function makePreset(
  name: string,
  tool: ToolId,
  settings: Record<string, unknown>,
): ToolPreset {
  return {
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim().slice(0, 60) || 'Untitled preset',
    tool,
    settings,
    createdAt: Date.now(),
  }
}
