/**
 * Minimal Storage abstraction so persistence works everywhere (including
 * private-mode Safari, where localStorage writes can throw) and so unit
 * tests can inject a fake.
 */

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export class MemoryStorage implements StorageLike {
  private map = new Map<string, string>()
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
}

let fallback: StorageLike | null = null

export function getStorage(): StorageLike {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Probe — some environments expose localStorage but throw on write.
      const probe = '__filetools_probe__'
      window.localStorage.setItem(probe, '1')
      window.localStorage.removeItem(probe)
      return window.localStorage
    }
  } catch {
    // fall through to memory storage
  }
  if (!fallback) fallback = new MemoryStorage()
  return fallback
}
