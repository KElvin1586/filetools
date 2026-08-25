/**
 * ZIP creation via fflate — small, dependency-free and fully client-side.
 */

import { zipSync } from 'fflate'
import { uniqueFilename } from './files'

export interface ZipEntryInput {
  name: string
  data: Uint8Array
}

/** Builds a ZIP archive, de-duplicating filenames so nothing is silently lost. */
export function createZip(entries: ZipEntryInput[]): Uint8Array {
  if (entries.length === 0) throw new Error('Nothing to add to the ZIP archive.')
  const taken = new Set<string>()
  const fileMap: Record<string, Uint8Array> = {}
  for (const entry of entries) {
    const name = uniqueFilename(entry.name, taken)
    taken.add(name)
    fileMap[name] = entry.data
  }
  return zipSync(fileMap, { level: 6 })
}
