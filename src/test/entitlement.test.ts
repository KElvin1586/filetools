import { describe, expect, it } from 'vitest'
import {
  PREMIUM_FEATURES,
  canUseFeature,
  normalizeLicenseKey,
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

describe('normalizeLicenseKey', () => {
  it('trims, uppercases and strips internal whitespace', () => {
    expect(normalizeLicenseKey('  abc-def \n ghi ')).toBe('ABC-DEFGHI')
  })
  it('returns empty string for blank input', () => {
    expect(normalizeLicenseKey('   ')).toBe('')
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
  it('points at the real Lemon Squeezy checkout by default', () => {
    expect(config.upgradeUrl).toBe(
      'https://kelvindigitaltools.lemonsqueezy.com/checkout/buy/5a9a0680-dbb4-4c1b-b38c-02c8bbd20fe1',
    )
  })
  it('has no static/shared license key anywhere in config', () => {
    expect('licenseKey' in config).toBe(false)
  })
  it('dev test checkout URL is present in dev builds only', () => {
    expect(config.testUpgradeUrl).toBe('#/test-checkout')
  })
  it('premium pricing is configurable with sane defaults', () => {
    expect(config.premiumPrice).toBe('9.99')
    expect(config.premiumCurrency).toBe('USD')
  })
})
