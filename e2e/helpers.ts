import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Download, Page } from '@playwright/test'
import { expect } from '@playwright/test'

export const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'generated')

export function fixture(name: string): string {
  return path.join(FIXTURES, name)
}

/** Reads width/height from a real PNG's IHDR chunk. */
export function pngDimensions(buffer: Buffer): { width: number; height: number } {
  const pngMagic = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (!pngMagic) throw new Error('Not a PNG file')
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

/** Waits for and saves a browser download, returning its bytes and suggested name. */
export async function captureDownload(
  page: Page,
  action: () => Promise<void>,
): Promise<{ buffer: Buffer; filename: string }> {
  const [download] = await Promise.all([page.waitForEvent('download'), action()])
  return readDownload(download)
}

export async function readDownload(download: Download): Promise<{ buffer: Buffer; filename: string }> {
  const filePath = await download.path()
  if (!filePath) throw new Error('Download has no path')
  return { buffer: fs.readFileSync(filePath), filename: download.suggestedFilename() }
}

export const TEST_LICENSE_KEY = 'FT-E2E-TEST-KEY-1234-5678'
export const LS_CHECKOUT_URL =
  'https://kelvindigitaltools.lemonsqueezy.com/checkout/buy/5a9a0680-dbb4-4c1b-b38c-02c8bbd20fe1'

/**
 * Stubs Lemon Squeezy's license API at the browser-network boundary so E2E
 * tests exercise the app's REAL activation/validation code paths (and the real
 * response shapes observed against api.lemonsqueezy.com) without charging money
 * or depending on external network. The app code itself is never faked.
 */
export async function stubLicenseApi(page: Page): Promise<void> {
  await page.route('**/api.lemonsqueezy.com/v1/licenses/**', async (route) => {
    const request = route.request()
    const url = request.url()
    let key: string
    try {
      const body = request.postDataJSON() as { license_key?: string } | null
      key = body?.license_key ?? ''
    } catch {
      key = ''
    }
    const isValidKey = key === TEST_LICENSE_KEY
    const fulfill = (status: number, payload: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) })

    if (url.endsWith('/activate')) {
      if (isValidKey) {
        return fulfill(200, {
          activated: true,
          error: null,
          license_key: { status: 'active', key, activation_limit: 5, activation_usage: 1, expires_at: null },
          instance: { id: 'e2e-instance-1', name: 'browser' },
          meta: { product_name: 'FileTools Premium' },
        })
      }
      return fulfill(404, { activated: false, error: 'license_key not found.' })
    }
    if (url.endsWith('/validate')) {
      if (isValidKey) {
        return fulfill(200, {
          valid: true,
          error: null,
          license_key: { status: 'active', key, activation_limit: 5, activation_usage: 1, expires_at: null },
          instance: { id: 'e2e-instance-1', name: 'browser' },
          meta: {},
        })
      }
      return fulfill(404, { valid: false, error: 'license_key not found.' })
    }
    if (url.endsWith('/deactivate')) {
      return fulfill(200, { deactivated: true, error: null })
    }
    return route.continue()
  })
}

export async function unlockPremium(page: Page, key = TEST_LICENSE_KEY): Promise<void> {
  await stubLicenseApi(page)
  await page.getByRole('button', { name: 'Upgrade', exact: true }).first().click()
  await page.getByLabel(/license key/i).fill(key)
  await page.getByRole('button', { name: 'Activate' }).click()
  await expect(page.getByRole('button', { name: '★ PREMIUM' })).toBeVisible()
}
