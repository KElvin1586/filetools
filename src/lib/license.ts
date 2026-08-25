/**
 * Lemon Squeezy license integration — the real licensing mechanism for Premium.
 *
 * Uses Lemon Squeezy's public license API (activate / validate / deactivate),
 * which requires no API key and is CORS-enabled by design for client software:
 *   https://docs.lemonsqueezy.com/api-reference/license-api
 *
 * No secrets live here — these endpoints authenticate with the customer's
 * license key itself. Server-side secrets (LS API keys, webhook signing
 * secrets) must never be placed in this client bundle.
 */

const LS_API = 'https://api.lemonsqueezy.com/v1/licenses'

export interface LicenseRecord {
  key: string
  instanceId: string
  productName?: string
  activatedAt: string
}

export type LicenseFailReason = 'invalid' | 'disabled' | 'expired' | 'limit' | 'network' | 'unknown'

export type LicenseResult =
  | { ok: true; record: LicenseRecord; productName?: string }
  | { ok: false; reason: LicenseFailReason; message: string }

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: LicenseFailReason; message: string }

interface LsLicenseKeyPayload {
  status?: string
  activation_usage?: number
  activation_limit?: number | null
  expires_at?: string | null
}

const USER_MESSAGES: Record<LicenseFailReason, string> = {
  invalid: 'That license key was not found. Copy the key exactly from your Lemon Squeezy purchase email.',
  disabled: 'This license key has been disabled or revoked. Contact the seller if you believe this is a mistake.',
  expired: 'This license key has expired.',
  limit: 'This license key has reached its device activation limit. Deactivate it on another device first.',
  network: 'Could not reach the license server. Check your internet connection and try again.',
  unknown: 'The license could not be verified. Please try again.',
}

function fail(reason: LicenseFailReason, detail?: string): LicenseResult {
  void detail
  return { ok: false, reason, message: USER_MESSAGES[reason] }
}

/** Classifies a Lemon Squeezy license_key payload from activate/validate. */
export function classifyLicenseKey(payload: LsLicenseKeyPayload | undefined): LicenseFailReason | null {
  if (!payload) return null // no payload → fall back to the error string/status
  if (payload.status === 'disabled') return 'disabled'
  if (payload.status === 'expired') return 'expired'
  if (payload.status === 'inactive') return 'disabled'
  if (payload.expires_at && Date.parse(payload.expires_at) < Date.now()) return 'expired'
  return null
}

interface ActivateBody {
  activated?: boolean
  error?: string | null
  license_key?: LsLicenseKeyPayload & { key?: string }
  instance?: { id?: string }
  meta?: { product_name?: string }
}

/** Parses a Lemon Squeezy /licenses/activate response (any HTTP status). */
export function parseActivateResult(httpStatus: number, body: unknown): LicenseResult {
  const data = (body ?? {}) as ActivateBody
  if (data.activated === true && data.instance?.id && data.license_key?.key) {
    // A technically-activated key can still be disabled/expired — check first.
    const keyProblem = classifyLicenseKey(data.license_key)
    if (keyProblem) return fail(keyProblem)
    return {
      ok: true,
      record: {
        key: data.license_key.key,
        instanceId: data.instance.id,
        productName: data.meta?.product_name,
        activatedAt: new Date().toISOString(),
      },
      productName: data.meta?.product_name,
    }
  }
  const keyProblem = classifyLicenseKey(data.license_key)
  if (keyProblem) return fail(keyProblem)
  return fail(classifyLsError(data.error, httpStatus))
}

interface ValidateBody {
  valid?: boolean
  error?: string | null
  license_key?: LsLicenseKeyPayload
}

/** Parses a Lemon Squeezy /licenses/validate response (any HTTP status). */
export function parseValidateResult(httpStatus: number, body: unknown): ValidationResult {
  const data = (body ?? {}) as ValidateBody
  const keyProblem = classifyLicenseKey(data.license_key)
  if (keyProblem) return fail(keyProblem)
  if (data.valid === true) return { ok: true }
  return fail(classifyLsError(data.error, httpStatus))
}

/** Maps Lemon Squeezy error strings / HTTP statuses to failure reasons. */
export function classifyLsError(error: string | null | undefined, httpStatus: number): LicenseFailReason {
  const text = (error ?? '').toLowerCase()
  if (text.includes('not found')) return 'invalid'
  if (text.includes('activation limit') || text.includes('activation_limit')) return 'limit'
  if (text.includes('disabled')) return 'disabled'
  if (text.includes('expired')) return 'expired'
  if (httpStatus === 404 || httpStatus === 400) return 'invalid'
  return 'unknown'
}

async function postLicense(endpoint: string, payload: Record<string, string>): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${LS_API}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = (await response.json().catch(() => ({}))) as unknown
  return { status: response.status, body }
}

/**
 * Activates a customer's license key against Lemon Squeezy, creating a device
 * instance. Real network call to the real licensing API — no simulation.
 */
export async function activateLemonSqueezyLicense(key: string, instanceName: string): Promise<LicenseResult> {
  try {
    const { status, body } = await postLicense('activate', {
      license_key: key.trim(),
      instance_name: instanceName,
    })
    return parseActivateResult(status, body)
  } catch {
    return fail('network')
  }
}

/**
 * Revalidates a previously activated license (key + instance id). Used on app
 * load so disabled/refunded/expired licenses stop unlocking Premium, and so a
 * fabricated localStorage record without a matching Lemon Squeezy instance
 * cannot keep Premium active.
 */
export async function validateLemonSqueezyLicense(record: LicenseRecord): Promise<ValidationResult> {
  try {
    const { status, body } = await postLicense('validate', {
      license_key: record.key,
      instance_id: record.instanceId,
    })
    return parseValidateResult(status, body)
  } catch {
    return { ok: false, reason: 'network', message: USER_MESSAGES.network }
  }
}

/** Best-effort deactivation — frees the device activation in Lemon Squeezy. */
export async function deactivateLemonSqueezyLicense(record: LicenseRecord): Promise<void> {
  try {
    await postLicense('deactivate', {
      license_key: record.key,
      instance_id: record.instanceId,
    })
  } catch {
    // Offline deactivation is fine — the key's activation limit protects the seller.
  }
}

const LICENSE_STORAGE_KEY = 'filetools.license'

export function readStoredLicense(storage: { getItem(k: string): string | null }): LicenseRecord | null {
  try {
    const raw = storage.getItem(LICENSE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LicenseRecord>
    if (typeof parsed.key === 'string' && typeof parsed.instanceId === 'string' && parsed.key && parsed.instanceId) {
      return {
        key: parsed.key,
        instanceId: parsed.instanceId,
        productName: typeof parsed.productName === 'string' ? parsed.productName : undefined,
        activatedAt: typeof parsed.activatedAt === 'string' ? parsed.activatedAt : '',
      }
    }
    return null
  } catch {
    return null
  }
}

export function writeStoredLicense(storage: { setItem(k: string, v: string): void }, record: LicenseRecord): void {
  storage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(record))
}

export function clearStoredLicense(storage: { removeItem(k: string): void }): void {
  storage.removeItem(LICENSE_STORAGE_KEY)
}
