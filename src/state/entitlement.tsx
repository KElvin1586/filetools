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
  type Plan,
  type PremiumFeature,
} from '../lib/entitlement'
import { getStorage } from '../lib/storage'

export interface EntitlementContextValue {
  plan: Plan
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
}

const EntitlementContext = createContext<EntitlementContextValue | null>(null)

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan>(() => parseStoredPlan(getStorage().getItem(PLAN_STORAGE_KEY)))
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState<PremiumFeature | null>(null)

  const openUpgrade = useCallback((feature?: PremiumFeature) => {
    setUpgradeFeature(feature ?? null)
    setUpgradeOpen(true)
  }, [])

  const closeUpgrade = useCallback(() => setUpgradeOpen(false), [])

  const canUse = useCallback((feature: PremiumFeature) => canUseFeature(plan, feature), [plan])

  const requestFeature = useCallback(
    (feature: PremiumFeature) => {
      if (canUseFeature(plan, feature)) return true
      openUpgrade(feature)
      return false
    },
    [plan, openUpgrade],
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
      isPremium: plan === 'premium',
      requestFeature,
      canUse,
      activateLicense,
      deactivate,
      upgradeOpen,
      upgradeFeature,
      openUpgrade,
      closeUpgrade,
    }),
    [plan, requestFeature, canUse, activateLicense, deactivate, upgradeOpen, upgradeFeature, openUpgrade, closeUpgrade],
  )

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>
}

export function useEntitlement(): EntitlementContextValue {
  const ctx = useContext(EntitlementContext)
  if (!ctx) throw new Error('useEntitlement must be used inside EntitlementProvider')
  return ctx
}
