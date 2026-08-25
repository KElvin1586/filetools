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
  appName: readString('VITE_APP_NAME', 'FileTools'),
  version: __APP_VERSION__,

  /** One-time Premium price shown in the upgrade modal. */
  premiumPrice: readString('VITE_PREMIUM_PRICE', '1299'),
  /** Currency the checkout actually charges (Lemon Squeezy store currency). */
  premiumCurrency: readString('VITE_PREMIUM_CURRENCY', 'KES'),
  /** Approximate USD reference shown next to the price ("≈ $10 USD"). */
  premiumAltPrice: readString('VITE_PREMIUM_PRICE_ALT', '10'),
  premiumAltCurrency: readString('VITE_PREMIUM_CURRENCY_ALT', 'USD'),

  /**
   * External checkout/payment page for upgrades. FileTools never processes
   * payments itself — this is simply where interested users are sent.
   * Empty (unset) = upgrade button shows a plain configuration notice;
   * never a placeholder URL.
   */
  upgradeUrl: readString(
    'VITE_UPGRADE_URL',
    'https://kelvindigitaltools.lemonsqueezy.com/checkout/buy/5a9a0680-dbb4-4c1b-b38c-02c8bbd20fe1',
  ),

  /**
   * DEVELOPMENT-ONLY: internal test checkout page for the dev upgrade flow.
   * Null in production builds — never exposed to real users.
   */
  testUpgradeUrl: import.meta.env.DEV
    ? readString('VITE_TEST_UPGRADE_URL', '#/test-checkout')
    : null,

  /**
   * Premium is unlocked by activating a Lemon Squeezy license key via the
   * license API (src/lib/license.ts). There is deliberately no shared/static
   * key in this bundle — anything client-side would be forgeable anyway.
   */

  /** Per-file size limit for every tool. */
  maxFileSizeBytes: readPositiveNumber('VITE_MAX_FILE_MB', 50) * 1024 * 1024,

  /** Hard cap on batch sizes even for Premium users (UI + memory sanity). */
  maxBatchFiles: readPositiveNumber('VITE_MAX_BATCH_FILES', 50),

  /** Free-tier allowance for multi-file PDF utilities. */
  freePdfMergeLimit: readPositiveNumber('VITE_FREE_PDF_MERGE_LIMIT', 3),
  freePdfImagesLimit: readPositiveNumber('VITE_FREE_PDF_IMAGES_LIMIT', 5),
} as const

/** Formats a price for display, e.g. "KSh 1,299" or "$9.99". */
export function formatPrice(amount: string, currency: string): string {
  const value = Number(amount)
  if (Number.isFinite(value)) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        // Whole amounts read better without trailing zeros ("KSh 1,299").
        ...(Number.isInteger(value) ? { maximumFractionDigits: 0 } : {}),
      }).format(value)
    } catch {
      // Unknown currency code — fall through to plain formatting.
    }
  }
  return `${amount} ${currency}`
}

/** Formats the configured Premium price for display, e.g. "KSh 1,299". */
export function formatPremiumPrice(): string {
  return formatPrice(config.premiumPrice, config.premiumCurrency)
}

/** Formats the approximate reference price, e.g. "≈ $10 USD". */
export function formatPremiumAltPrice(): string {
  return `≈ ${formatPrice(config.premiumAltPrice, config.premiumAltCurrency)} ${config.premiumAltCurrency}`
}
