import { expect, test } from '@playwright/test'
import { TEST_LICENSE_KEY, stubLicenseApi, unlockPremium } from './helpers'

/**
 * License security & lifecycle E2E — the flows that must hold for a real
 * commercial product: forged state must not unlock, revoked licenses must
 * stop unlocking, and legitimate licenses must persist across reload.
 */

test('a forged localStorage license record does not survive reload', async ({ page }) => {
  await stubLicenseApi(page)
  await page.goto('/')

  // Attacker fabricates a record directly in localStorage.
  await page.evaluate(() => {
    localStorage.setItem(
      'filetools.license',
      JSON.stringify({
        key: 'FORGED-KEY-0000-0000',
        instanceId: 'forged-instance',
        activatedAt: new Date().toISOString(),
      }),
    )
  })
  await page.reload()

  // Revalidation against the license server fails → Premium never unlocks,
  // and the forged record is removed from storage.
  await expect(page.getByRole('button', { name: '★ PREMIUM' })).not.toBeVisible()
  await expect(page.getByText('FREE', { exact: true })).toBeVisible()
  const stored = await page.evaluate(() => localStorage.getItem('filetools.license'))
  expect(stored).toBeNull()
})

test('the legacy plain premium flag no longer unlocks anything', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('filetools.plan', 'premium'))
  await page.reload()
  await expect(page.getByRole('button', { name: '★ PREMIUM' })).not.toBeVisible()
  await expect(page.getByText('FREE', { exact: true })).toBeVisible()
})

test('a license revoked server-side is revoked in the app on reload', async ({ page }) => {
  await stubLicenseApi(page)
  await page.goto('/')
  await unlockPremium(page)
  await expect(page.getByRole('button', { name: '★ PREMIUM' })).toBeVisible()

  // The seller disables the key in Lemon Squeezy — validate now reports disabled.
  await page.unroute('**/api.lemonsqueezy.com/v1/licenses/**')
  await page.route('**/api.lemonsqueezy.com/v1/licenses/**', async (route) => {
    if (route.request().url().endsWith('/validate')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: true,
          error: null,
          license_key: { status: 'disabled', key: TEST_LICENSE_KEY, activation_limit: 5, activation_usage: 1, expires_at: null },
          instance: { id: 'e2e-instance-1' },
          meta: {},
        }),
      })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  await page.reload()
  await expect(page.getByRole('button', { name: '★ PREMIUM' })).not.toBeVisible()
  await expect(page.getByText('FREE', { exact: true })).toBeVisible()
})

test('valid license persists across reload (revalidated) and deactivation returns to Free', async ({ page }) => {
  await stubLicenseApi(page)
  await page.goto('/')
  await unlockPremium(page)

  // Reload — the stored license revalidates against the license server.
  await page.reload()
  await expect(page.getByRole('button', { name: '★ PREMIUM' })).toBeVisible()

  // Deactivate ("logout") → Free, and stays Free after reload.
  await page.getByRole('button', { name: '★ PREMIUM' }).click()
  await expect(page.getByText('FREE', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('FREE', { exact: true })).toBeVisible()

  // "Login" again with the same legitimate key → Premium again.
  await unlockPremium(page)
  await expect(page.getByRole('button', { name: '★ PREMIUM' })).toBeVisible()
})

test('offline license server keeps a previously activated license working (grace)', async ({ page }) => {
  await stubLicenseApi(page)
  await page.goto('/')
  await unlockPremium(page)

  // License server unreachable on reload → premium retained, not locked out.
  await page.unroute('**/api.lemonsqueezy.com/v1/licenses/**')
  await page.route('**/api.lemonsqueezy.com/v1/licenses/**', (route) => route.abort())

  await page.reload()
  await expect(page.getByRole('button', { name: '★ PREMIUM' })).toBeVisible()
})
