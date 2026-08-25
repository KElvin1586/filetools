/**
 * Centralized FREE | PREMIUM entitlement provider.
 *
 * Every premium-gated action calls `requestFeature(feature)`:
 *  - Premium users: returns true, the action proceeds.
 *  - Free users: returns false and opens the Upgrade modal.
 *
 * Premium is earned exclusively through a Lemon Squeezy license that is
 * activated and revalidated against the real license API
 * (src/lib/license.ts). There is no client-side unlock flag: a stored
 * license record must revalidate on every load. Fabricated localStorage
 * records fail validation and are discarded; revoked/expired licenses
 * stop unlocking Premium. The only exception is a documented offline
 * grace: if the license server is unreachable, a previously activated
 * license keeps working rather than locking out paying customers.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  canUseFeature,
  normalizeLicenseKey,
  parseStoredPlanDev,
  type Plan,
  type PremiumFeature,
} from '../lib/entitlement'
import {
  activateLemonSqueezyLicense,
  clearStoredLicense,
  deactivateLemonSqueezyLicense,
  readStoredLicense,
  validateLemonSqueezyLicense,
  writeStoredLicense,
  type LicenseRecord,
} from '../lib/license'
import { getStorage } from '../lib/storage'

/** Legacy v1.0/1.1 storage key — no longer trusted, removed on load. */
const LEGACY_PLAN_KEY = 'filetools.plan'

export interface EntitlementContextValue {
  plan: Plan
  /** Plan forced via the dev-only test mode; null = follow real license state. */
  devOverride: Plan | null
  /** Effective plan for all feature gates (dev override wins when set). */
  effectivePlan: Plan
  isPremium: boolean
  /** True while a stored license is being revalidated on load. */
  checkingLicense: boolean
  /** Product name returned by Lemon Squeezy for the active license, if any. */
  licensedProduct: string | null
  /** Gate for premium actions. Opens the upgrade modal for free users. */
  requestFeature: (feature: PremiumFeature) => boolean
  canUse: (feature: PremiumFeature) => boolean
  /** Activates a real Lemon Squeezy license key (async network verification). */
  activateLicense: (key: string) => Promise<{ ok: boolean; error?: string }>
  /** Deactivates the license (frees the device activation) and returns to Free. */
  deactivate: () => Promise<void>
  upgradeOpen: boolean
  upgradeFeature: PremiumFeature | null
  openUpgrade: (feature?: PremiumFeature) => void
  closeUpgrade: () => void
  /** Dev-only: force a plan regardless of licenses. Null/absent in production. */
  setDevForce: ((forced: Plan | null) => void) | null
}

const EntitlementContext = createContext<EntitlementContextValue | null>(null)

export function EntitlementProvider({ children }: { children: ReactNode }) {
  // Dev-only test mode: does not exist in production builds (dead-code eliminated).
  const hasDevMode = import.meta.env.DEV
  const devStorageKey = hasDevMode ? 'filetools.plan.dev' : ''
  const [devOverride, setDevOverride] = useState<Plan | null>(() =>
    hasDevMode ? parseStoredPlanDev(getStorage().getItem(devStorageKey)) : null,
  )

  const [record, setRecord] = useState<LicenseRecord | null>(() => {
    const storage = getStorage()
    // The old plain 'premium' flag is trivially forgeable — drop it. Only a
    // license record that revalidates against Lemon Squeezy grants Premium.
    storage.removeItem(LEGACY_PLAN_KEY)
    return readStoredLicense(storage)
  })
  // Nothing is premium until the stored record has revalidated this session.
  const [licenseValid, setLicenseValid] = useState(false)
  const [checkingLicense, setCheckingLicense] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState<PremiumFeature | null>(null)

  const plan: Plan = record !== null && licenseValid ? 'premium' : 'free'
  const effectivePlan: Plan = hasDevMode && devOverride ? devOverride : plan

  // Revalidate the stored license against Lemon Squeezy on every load.
  // setState here is intentional: this effect synchronizes React state with an
  // external system (the license server + localStorage).
  useEffect(() => {
    if (!record) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async license check lifecycle
    setCheckingLicense(true)
    void validateLemonSqueezyLicense(record).then((result) => {
      if (cancelled) return
      setCheckingLicense(false)
      if (result.ok) {
        setLicenseValid(true)
      } else if (result.reason === 'network') {
        // Offline grace: keep a previously activated license working when the
        // license server can't be reached (e.g. customer is offline).
        setLicenseValid(true)
      } else {
        // Revoked / expired / invalid / fabricated — remove and stay Free.
        clearStoredLicense(getStorage())
        setRecord(null)
        setLicenseValid(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [record])

  const setDevForce = useCallback(
    (forced: Plan | null) => {
      if (!hasDevMode) return
      setDevOverride(forced)
      const storage = getStorage()
      if (forced) storage.setItem(devStorageKey, forced)
      else storage.removeItem(devStorageKey)
    },
    [hasDevMode, devStorageKey],
  )

  const openUpgrade = useCallback((feature?: PremiumFeature) => {
    setUpgradeFeature(feature ?? null)
    setUpgradeOpen(true)
  }, [])

  const closeUpgrade = useCallback(() => setUpgradeOpen(false), [])

  const canUse = useCallback(
    (feature: PremiumFeature) => canUseFeature(effectivePlan, feature),
    [effectivePlan],
  )

  const requestFeature = useCallback(
    (feature: PremiumFeature) => {
      if (canUseFeature(effectivePlan, feature)) return true
      openUpgrade(feature)
      return false
    },
    [effectivePlan, openUpgrade],
  )

  const activateLicense = useCallback(async (key: string) => {
    const normalized = normalizeLicenseKey(key)
    if (!normalized) return { ok: false, error: 'Enter the license key from your purchase email.' }
    const result = await activateLemonSqueezyLicense(normalized, 'FileTools (browser)')
    if (!result.ok) return { ok: false, error: result.message }
    writeStoredLicense(getStorage(), result.record)
    setRecord(result.record)
    setLicenseValid(true)
    setUpgradeOpen(false)
    return { ok: true }
  }, [])

  const deactivate = useCallback(async () => {
    if (record) void deactivateLemonSqueezyLicense(record)
    clearStoredLicense(getStorage())
    setRecord(null)
    setLicenseValid(false)
  }, [record])

  const value = useMemo<EntitlementContextValue>(
    () => ({
      plan,
      devOverride: hasDevMode ? devOverride : null,
      effectivePlan,
      isPremium: effectivePlan === 'premium',
      checkingLicense,
      licensedProduct: plan === 'premium' ? record?.productName ?? null : null,
      setDevForce: hasDevMode ? setDevForce : null,
      requestFeature,
      canUse,
      activateLicense,
      deactivate,
      upgradeOpen,
      upgradeFeature,
      openUpgrade,
      closeUpgrade,
    }),
    [plan, hasDevMode, devOverride, effectivePlan, checkingLicense, record, setDevForce, requestFeature, canUse, activateLicense, deactivate, upgradeOpen, upgradeFeature, openUpgrade, closeUpgrade],
  )

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>
}

export function useEntitlement(): EntitlementContextValue {
  const ctx = useContext(EntitlementContext)
  if (!ctx) throw new Error('useEntitlement must be used inside EntitlementProvider')
  return ctx
}
