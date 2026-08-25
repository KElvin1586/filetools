/**
 * Premium entitlement logic — the single source of truth for FREE vs PREMIUM.
 * Pure functions here; the React provider lives in state/entitlement.tsx.
 * License verification itself lives in lib/license.ts (Lemon Squeezy API).
 */

export type Plan = 'free' | 'premium'

export type PremiumFeature =
  | 'batch'
  | 'advancedCompression'
  | 'advancedResize'
  | 'advancedSettings'
  | 'presets'
  | 'history'
  | 'zipDownload'

export const FEATURE_LABELS: Record<PremiumFeature, string> = {
  batch: 'Batch processing',
  advancedCompression: 'Advanced compression controls',
  advancedResize: 'Batch resizing & exact dimensions',
  advancedSettings: 'Advanced image settings',
  presets: 'Presets',
  history: 'Processing history',
  zipDownload: 'ZIP download of results',
}

export const PREMIUM_FEATURES: readonly PremiumFeature[] = Object.keys(
  FEATURE_LABELS,
) as PremiumFeature[]

export const DEV_PLAN_STORAGE_KEY = 'filetools.plan.dev'

/** Whether the dev-only premium test mode is available (never in production). */
export const DEV_TEST_MODE: boolean = import.meta.env.DEV

/** Central entitlement check — every premium code path goes through here. */
export function canUseFeature(plan: Plan, feature: PremiumFeature): boolean {
  void feature // all premium features share one plan gate today
  return plan === 'premium'
}

/** Normalizes user input before it is sent to the Lemon Squeezy license API. */
export function normalizeLicenseKey(input: string): string {
  return input.trim().replace(/\s+/g, '').toUpperCase()
}

/** Dev override accepts 'free' too; anything else = no override. */
export function parseStoredPlanDev(raw: string | null): Plan | null {
  return raw === 'premium' || raw === 'free' ? raw : null
}
