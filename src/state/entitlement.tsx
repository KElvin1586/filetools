/**
 * Centralized FREE | PREMIUM entitlement provider.
 *
 * Every premium-gated action calls `requestFeature(feature)`:
 *  - Premium users: returns true, the action proceeds.
 *  - Free users: returns false and opens the Upgrade modal.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  PLAN_STORAGE_KEY,
  canUseFeature,
  isValidLicenseKey,
  parseStoredPlan,
  parseStoredPlanDev,
  type Plan,
  type PremiumFeature,
} from '../lib/entitlement'
import { getStorage } from '../lib/storage'

export interface EntitlementContextValue {
  plan: Plan
  /** Plan forced via the dev-only test mode; null = follow real license state. */
  devOverride: Plan | null
  /** Effective plan for all feature gates (dev override wins when set). */
  effectivePlan: Plan
  isPremium: boolean
  /** Gate for premium actions. Opens the upgrade modal for free users. */
  requestFeature: (feature: PremiumFeature) => boolean
  canUse: (feature: PremiumFeature) => boolean
  activateLicense: (key: string) => { ok: boolean; error?: string }
  deactivate: () => void
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
  const [plan, setPlan] = useState<Plan>(() => parseStoredPlan(getStorage().getItem(PLAN_STORAGE_KEY)))
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState<PremiumFeature | null>(null)

  const effectivePlan: Plan = hasDevMode && devOverride ? devOverride : plan

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

  const activateLicense = useCallback((key: string) => {
    if (!isValidLicenseKey(key)) {
      return { ok: false, error: 'That license key is not valid for this deployment.' }
    }
    setPlan('premium')
    getStorage().setItem(PLAN_STORAGE_KEY, 'premium')
    setUpgradeOpen(false)
    return { ok: true }
  }, [])

  const deactivate = useCallback(() => {
    setPlan('free')
    getStorage().removeItem(PLAN_STORAGE_KEY)
  }, [])

  const value = useMemo<EntitlementContextValue>(
    () => ({
      plan,
      devOverride: hasDevMode ? devOverride : null,
      effectivePlan,
      isPremium: effectivePlan === 'premium',
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
    [plan, hasDevMode, devOverride, effectivePlan, setDevForce, requestFeature, canUse, activateLicense, deactivate, upgradeOpen, upgradeFeature, openUpgrade, closeUpgrade],
  )

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>
}

export function useEntitlement(): EntitlementContextValue {
  const ctx = useContext(EntitlementContext)
  if (!ctx) throw new Error('useEntitlement must be used inside EntitlementProvider')
  return ctx
}
