/**
 * Central, environment-driven configuration for FileTools.
 * Everything here can be overridden at build time via VITE_* variables
 * (see .env.example). No servers, no payments — just configuration.
 */

function readString(key: string, fallback: string): string {
  const value = import.meta.env?.[key]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback
}

function readPositiveNumber(key: string, fallback: number): number {
  const raw = import.meta.env?.[key]
  if (typeof raw !== 'string' || raw.trim() === '') return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const config = {
  appName: 'FileTools',
  version: '1.0.0',

  /** One-time Premium price shown in the upgrade modal. */
  premiumPrice: readString('VITE_PREMIUM_PRICE', '9.99'),
  premiumCurrency: readString('VITE_PREMIUM_CURRENCY', 'USD'),

  /**
   * External checkout/payment page for upgrades. FileTools never processes
   * payments itself — this is simply where interested users are sent.
   */
  upgradeUrl: readString('VITE_UPGRADE_URL', 'https://example.com/filetools/upgrade'),

  /**
   * License key that unlocks Premium. Distribute through your real payment
   * flow. Client-side keys are obfuscation, not security.
   */
  licenseKey: readString('VITE_PREMIUM_LICENSE_KEY', 'FILETOOLS-PREMIUM'),

  /** Per-file size limit for every tool. */
  maxFileSizeBytes: readPositiveNumber('VITE_MAX_FILE_MB', 50) * 1024 * 1024,

  /** Hard cap on batch sizes even for Premium users (UI + memory sanity). */
  maxBatchFiles: 25,

  /** Free-tier allowance for multi-file PDF utilities. */
  freePdfMergeLimit: 3,
  freePdfImagesLimit: 5,
} as const

/** Formats the configured Premium price for display, e.g. "$9.99". */
export function formatPremiumPrice(): string {
  const amount = Number(config.premiumPrice)
  if (Number.isFinite(amount)) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: config.premiumCurrency,
      }).format(amount)
    } catch {
      // Unknown currency code — fall through to plain formatting.
    }
  }
  return `${config.premiumPrice} ${config.premiumCurrency}`
}
