import { describe, expect, it } from 'vitest'
import {
  PREMIUM_FEATURES,
  canUseFeature,
  isValidLicenseKey,
  normalizeLicenseKey,
  parseStoredPlan,
  parseStoredPlanDev,
  DEV_TEST_MODE,
} from '../lib/entitlement'
import { config } from '../config'

describe('canUseFeature — the central FREE|PREMIUM gate', () => {
  it('blocks every premium feature for free users', () => {
    for (const feature of PREMIUM_FEATURES) {
      expect(canUseFeature('free', feature)).toBe(false)
    }
  })
  it('allows every premium feature for premium users', () => {
    for (const feature of PREMIUM_FEATURES) {
      expect(canUseFeature('premium', feature)).toBe(true)
    }
  })
})

describe('license keys', () => {
  it('normalizes case and whitespace', () => {
    expect(normalizeLicenseKey('  abc-def \n GHI ')).toBe('ABC-DEFGHI')
  })
  it('accepts the configured key regardless of case/spacing', () => {
    expect(isValidLicenseKey(config.licenseKey)).toBe(true)
    expect(isValidLicenseKey(config.licenseKey.toLowerCase())).toBe(true)
    expect(isValidLicenseKey(`  ${config.licenseKey}  `)).toBe(true)
  })
  it('rejects wrong and empty keys', () => {
    expect(isValidLicenseKey('WRONG-KEY')).toBe(false)
    expect(isValidLicenseKey('')).toBe(false)
    expect(isValidLicenseKey('   ')).toBe(false)
  })
})

describe('parseStoredPlan', () => {
  it('only accepts the exact premium marker', () => {
    expect(parseStoredPlan('premium')).toBe('premium')
    expect(parseStoredPlan('free')).toBe('free')
    expect(parseStoredPlan('PREMIUM')).toBe('free')
    expect(parseStoredPlan(null)).toBe('free')
    expect(parseStoredPlan('{"plan":"premium"}')).toBe('free')
  })
})


describe('dev test mode', () => {
  it('is only available in non-production builds', () => {
    // Vitest runs in dev mode, so DEV_TEST_MODE is true here.
    expect(DEV_TEST_MODE).toBe(true)
  })
  it('parses stored dev overrides', () => {
    expect(parseStoredPlanDev('premium')).toBe('premium')
    expect(parseStoredPlanDev('free')).toBe('free')
    expect(parseStoredPlanDev('garbage')).toBeNull()
    expect(parseStoredPlanDev(null)).toBeNull()
  })
})

describe('upgrade URL configuration', () => {
  it('never defaults to a placeholder domain', () => {
    expect(config.upgradeUrl).not.toContain('example.com')
    expect(config.upgradeUrl).not.toContain('example.org')
    expect(config.upgradeUrl).not.toContain('example.net')
  })
  it('dev test checkout URL is present in dev builds', () => {
    expect(config.testUpgradeUrl).toBe('#/test-checkout')
  })
  it('premium pricing is configurable with sane defaults', () => {
    expect(config.premiumPrice).toBe('9.99')
    expect(config.premiumCurrency).toBe('USD')
  })
})
