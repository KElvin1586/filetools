import { describe, expect, it } from 'vitest'
import {
  classifyLsError,
  classifyLicenseKey,
  parseActivateResult,
  parseValidateResult,
  readStoredLicense,
  writeStoredLicense,
  clearStoredLicense,
  type LicenseRecord,
} from '../lib/license'
import { MemoryStorage } from '../lib/storage'

const ACTIVE_KEY = {
  status: 'active',
  key: 'AAAA-BBBB-CCCC-DDDD',
  activation_limit: 5,
  activation_usage: 1,
  expires_at: null,
}

describe('parseActivateResult — Lemon Squeezy /licenses/activate', () => {
  it('accepts a genuine activation with an instance id', () => {
    const result = parseActivateResult(200, {
      activated: true,
      error: null,
      license_key: ACTIVE_KEY,
      instance: { id: 'inst-123', name: 'browser' },
      meta: { store_id: 1, product_name: 'FileTools Premium' },
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.record.key).toBe('AAAA-BBBB-CCCC-DDDD')
      expect(result.record.instanceId).toBe('inst-123')
      expect(result.productName).toBe('FileTools Premium')
    }
  })

  it('rejects unknown keys as invalid (real LS shape: 404 + error string)', () => {
    const result = parseActivateResult(404, { activated: false, error: 'license_key not found.' })
    expect(result).toMatchObject({ ok: false, reason: 'invalid' })
  })

  it('rejects activation-limit exhaustion', () => {
    const result = parseActivateResult(400, {
      activated: false,
      error: 'This license key has reached the activation limit.',
    })
    expect(result).toMatchObject({ ok: false, reason: 'limit' })
  })

  it('rejects activated-but-disabled licenses', () => {
    const result = parseActivateResult(200, {
      activated: true,
      error: null,
      license_key: { ...ACTIVE_KEY, status: 'disabled' },
      instance: { id: 'inst-123' },
      meta: {},
    })
    expect(result).toMatchObject({ ok: false, reason: 'disabled' })
  })

  it('rejects expired licenses via expires_at even if flagged active', () => {
    const result = parseActivateResult(200, {
      activated: true,
      error: null,
      license_key: { ...ACTIVE_KEY, expires_at: '2020-01-01T00:00:00Z' },
      instance: { id: 'inst-123' },
      meta: {},
    })
    expect(result).toMatchObject({ ok: false, reason: 'expired' })
  })

  it('treats malformed bodies as unknown failures', () => {
    expect(parseActivateResult(200, {})).toMatchObject({ ok: false })
    expect(parseActivateResult(500, null)).toMatchObject({ ok: false })
  })
})

describe('parseValidateResult — Lemon Squeezy /licenses/validate', () => {
  it('accepts a valid, active license', () => {
    expect(
      parseValidateResult(200, { valid: true, error: null, license_key: ACTIVE_KEY }),
    ).toEqual({ ok: true })
  })

  it('rejects unknown keys (real LS shape: 404 + valid:false)', () => {
    expect(parseValidateResult(404, { valid: false, error: 'license_key not found.' })).toMatchObject({
      ok: false,
      reason: 'invalid',
    })
  })

  it('rejects forged instance ids (real LS shape: valid:false + instance error)', () => {
    expect(
      parseValidateResult(400, { valid: false, error: 'instance_id not found.' }),
    ).toMatchObject({ ok: false, reason: 'invalid' })
  })

  it('rejects disabled/revoked licenses even when valid:true', () => {
    expect(
      parseValidateResult(200, { valid: true, error: null, license_key: { ...ACTIVE_KEY, status: 'disabled' } }),
    ).toMatchObject({ ok: false, reason: 'disabled' })
  })

  it('rejects expired licenses', () => {
    expect(
      parseValidateResult(200, { valid: true, error: null, license_key: { ...ACTIVE_KEY, status: 'expired' } }),
    ).toMatchObject({ ok: false, reason: 'expired' })
  })
})

describe('classifyLsError / classifyLicenseKey', () => {
  it('maps known error strings', () => {
    expect(classifyLsError('license_key not found.', 404)).toBe('invalid')
    expect(classifyLsError('This license key has reached the activation limit.', 400)).toBe('limit')
    expect(classifyLsError('disabled', 200)).toBe('disabled')
    expect(classifyLsError('something odd', 200)).toBe('unknown')
  })
  it('maps license statuses', () => {
    expect(classifyLicenseKey({ status: 'active' })).toBeNull()
    expect(classifyLicenseKey({ status: 'disabled' })).toBe('disabled')
    expect(classifyLicenseKey({ status: 'inactive' })).toBe('disabled')
    expect(classifyLicenseKey({ status: 'expired' })).toBe('expired')
    expect(classifyLicenseKey({ status: 'active', expires_at: '2030-01-01T00:00:00Z' })).toBeNull()
    expect(classifyLicenseKey(undefined)).toBeNull()
  })
})

describe('license record storage', () => {
  const record: LicenseRecord = {
    key: 'AAAA-BBBB-CCCC-DDDD',
    instanceId: 'inst-123',
    productName: 'FileTools Premium',
    activatedAt: '2026-01-01T00:00:00.000Z',
  }

  it('round-trips a record through storage', () => {
    const storage = new MemoryStorage()
    writeStoredLicense(storage, record)
    expect(readStoredLicense(storage)).toEqual(record)
  })

  it('rejects fabricated/partial records (tamper resistance)', () => {
    const storage = new MemoryStorage()
    storage.setItem('filetools.license', JSON.stringify({ key: 'FAKE' })) // no instanceId
    expect(readStoredLicense(storage)).toBeNull()
    storage.setItem('filetools.license', 'not json')
    expect(readStoredLicense(storage)).toBeNull()
  })

  it('clears the record', () => {
    const storage = new MemoryStorage()
    writeStoredLicense(storage, record)
    clearStoredLicense(storage)
    expect(readStoredLicense(storage)).toBeNull()
  })
})
