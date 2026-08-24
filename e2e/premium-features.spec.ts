import { expect, test } from '@playwright/test'
import { unzipSync } from 'fflate'
import { captureDownload, fixture, pngDimensions, unlockPremium } from './helpers'

/**
 * Premium feature QA — each premium capability is exercised end-to-end and
 * its real output verified, then re-locked by switching back to Free.
 */

test('advanced compression: target file size lands under the target', async ({ page }) => {
  await page.goto('/')
  await unlockPremium(page)
  await page.goto('/#/compress')
  await page.getByTestId('file-input').setInputFiles(fixture('gradient.png'))

  await page.getByRole('radio', { name: /Target file size/i }).check()
  await page.getByLabel('Target size in kilobytes').fill('30')
  await page.getByRole('button', { name: /Process file/i }).click()
  await expect(page.getByText('Results (1)')).toBeVisible()

  const { buffer } = await captureDownload(page, () =>
    page.getByRole('button', { name: 'Download', exact: true }).click(),
  )
  expect(buffer.length).toBeLessThanOrEqual(30 * 1024)
})

test('batch conversion to WebP produces a ZIP of real WebP files', async ({ page }) => {
  await page.goto('/')
  await unlockPremium(page)
  await page.goto('/#/convert')
  await page
    .getByTestId('file-input')
    .setInputFiles([fixture('red.png'), fixture('blue.png'), fixture('gradient.png')])
  await page.getByRole('button', { name: /Process 3 files/i }).click()
  await expect(page.getByText('Results (3)')).toBeVisible()

  const { buffer, filename } = await captureDownload(page, () =>
    page.getByRole('button', { name: /Download ZIP/i }).click(),
  )
  expect(filename).toBe('filetools-results.zip')
  const entries = unzipSync(buffer)
  const names = Object.keys(entries).sort()
  expect(names).toEqual(['blue_webp.webp', 'gradient_webp.webp', 'red_webp.webp'])
  for (const name of names) {
    const data = Buffer.from(entries[name])
    expect(data.subarray(0, 4).toString('ascii')).toBe('RIFF')
    expect(data.subarray(8, 12).toString('ascii')).toBe('WEBP')
  }
})

test('batch resize with exact dimensions applies to every file', async ({ page }) => {
  await page.goto('/')
  await unlockPremium(page)
  await page.goto('/#/resize')
  await page
    .getByTestId('file-input')
    .setInputFiles([fixture('red.png'), fixture('blue.png')])

  await page.getByLabel('Mode').selectOption('exact')
  await page.getByLabel('Width (px)').fill('300')
  await page.getByLabel('Height (px)').fill('200')
  await page.getByRole('button', { name: /Process 2 files/i }).click()
  await expect(page.getByText('Results (2)')).toBeVisible()

  const { buffer } = await captureDownload(page, () =>
    page.getByRole('button', { name: /Download ZIP/i }).click(),
  )
  const entries = unzipSync(buffer)
  for (const name of Object.keys(entries)) {
    expect(pngDimensions(Buffer.from(entries[name]))).toEqual({ width: 300, height: 200 })
  }
})

test('batch rotation rotates every file', async ({ page }) => {
  await page.goto('/')
  await unlockPremium(page)
  await page.goto('/#/rotate')
  await page.getByTestId('file-input').setInputFiles([fixture('red.png'), fixture('blue.png')])
  await page.getByRole('button', { name: /Process 2 files/i }).click()
  await expect(page.getByText('Results (2)')).toBeVisible()

  const { buffer } = await captureDownload(page, () =>
    page.getByRole('button', { name: /Download ZIP/i }).click(),
  )
  const entries = unzipSync(buffer)
  expect(pngDimensions(Buffer.from(entries['red_rotated.png']))).toEqual({ width: 600, height: 800 })
  expect(pngDimensions(Buffer.from(entries['blue_rotated.png']))).toEqual({ width: 300, height: 400 })
})

test('premium unlock persists across reload and relocks after deactivate', async ({ page }) => {
  await page.goto('/')
  await unlockPremium(page)

  // Reload — premium persists (localStorage).
  await page.reload()
  await expect(page.getByRole('button', { name: '★ PREMIUM' })).toBeVisible()

  // Deactivate → free again, batch locked again with upgrade modal.
  await page.getByRole('button', { name: '★ PREMIUM' }).click()
  await expect(page.getByText('FREE', { exact: true })).toBeVisible()
  await page.goto('/#/resize')
  await page.getByTestId('file-input').setInputFiles([fixture('red.png'), fixture('blue.png')])
  await expect(page.getByRole('alert')).toContainText(/Batch processing is a Premium feature/i)
  await expect(page.getByRole('dialog')).toBeVisible()
})
