import { expect, test } from '@playwright/test'
import { captureDownload, fixture, pngDimensions } from './helpers'

test('mobile layout has no horizontal overflow on home or tool pages', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Private file utilities/i })).toBeVisible()

  const overflow = async () =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

  expect(await overflow()).toBeLessThanOrEqual(1)

  await page.goto('/#/resize')
  await expect(page.getByRole('heading', { name: 'Resize images' })).toBeVisible()
  expect(await overflow()).toBeLessThanOrEqual(1)

  await page.goto('/#/pdf')
  expect(await overflow()).toBeLessThanOrEqual(1)
})

test('mobile users can complete a full resize flow', async ({ page }) => {
  await page.goto('/#/resize')
  await page.getByTestId('file-input').setInputFiles(fixture('red.png'))
  await page.getByRole('button', { name: /Process file/i }).click()
  await expect(page.getByText('400 × 300')).toBeVisible()

  const { buffer } = await captureDownload(page, () =>
    page.getByRole('button', { name: 'Download', exact: true }).click(),
  )
  expect(pngDimensions(buffer)).toEqual({ width: 400, height: 300 })
})

test('mobile upgrade modal fits the viewport', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Upgrade', exact: true }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/1,299/)).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
})
