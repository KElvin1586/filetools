import { expect, test } from '@playwright/test'
import { unzipSync } from 'fflate'
import { LS_CHECKOUT_URL, captureDownload, fixture, pngDimensions, stubLicenseApi, unlockPremium } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('home page shows all tools, pricing and the privacy claim', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Private file utilities/i })).toBeVisible()
  for (const name of ['Resize', 'Compress', 'Convert', 'Crop', 'Rotate & flip', 'Metadata', 'PDF tools']) {
    await expect(page.getByRole('button', { name: new RegExp(name) })).toBeVisible()
  }
  // Pricing: Free = $0, Premium = $9.99 one-time (default config)
  await expect(page.getByText('$0', { exact: true })).toBeVisible()
  await expect(page.getByText('$9.99')).toBeVisible()
  await expect(page.getByText(/never uploaded/i).first()).toBeVisible()
})

test('resize: 800×600 PNG at 50% downloads a real 400×300 PNG', async ({ page }) => {
  await page.goto('/#/resize')
  await page.getByTestId('file-input').setInputFiles(fixture('red.png'))
  await page.getByRole('button', { name: /Process file/i }).click()
  await expect(page.getByText('400 × 300')).toBeVisible()

  const { buffer, filename } = await captureDownload(page, () =>
    page.getByRole('button', { name: 'Download', exact: true }).click(),
  )
  expect(filename).toBe('red_resized.png')
  expect(pngDimensions(buffer)).toEqual({ width: 400, height: 300 })
})

test('convert: PNG → WebP produces genuine WebP bytes', async ({ page }) => {
  await page.goto('/#/convert')
  await page.getByTestId('file-input').setInputFiles(fixture('red.png'))
  await page.getByRole('button', { name: /Process file/i }).click()

  const { buffer, filename } = await captureDownload(page, () =>
    page.getByRole('button', { name: 'Download', exact: true }).click(),
  )
  expect(filename).toBe('red_webp.webp')
  expect(buffer.subarray(0, 4).toString('ascii')).toBe('RIFF')
  expect(buffer.subarray(8, 12).toString('ascii')).toBe('WEBP')
})

test('compress: output is smaller than the original', async ({ page }) => {
  await page.goto('/#/compress')
  await page.getByTestId('file-input').setInputFiles(fixture('gradient.png'))
  await page.getByLabel('Compression level').selectOption('strong')
  await page.getByRole('button', { name: /Process file/i }).click()
  await expect(page.getByText(/−\d+%/)).toBeVisible()

  const { buffer } = await captureDownload(page, () =>
    page.getByRole('button', { name: 'Download', exact: true }).click(),
  )
  const original = await import('node:fs').then((fs) => fs.readFileSync(fixture('gradient.png')))
  expect(buffer.length).toBeLessThan(original.length)
})

test('crop: exact pixel inputs crop to 400×300', async ({ page }) => {
  await page.goto('/#/crop')
  await page.getByTestId('file-input').setInputFiles(fixture('red.png'))
  await expect(page.getByText('800 × 600 px')).toBeVisible()

  await page.getByLabel('Width').fill('400')
  await page.getByLabel('Height').fill('300')
  await page.getByRole('button', { name: 'Crop image' }).click()
  await expect(page.getByText('400 × 300')).toBeVisible()

  const { buffer, filename } = await captureDownload(page, () =>
    page.getByRole('button', { name: 'Download', exact: true }).click(),
  )
  expect(filename).toBe('red_cropped.png')
  expect(pngDimensions(buffer)).toEqual({ width: 400, height: 300 })
})

test('rotate: 90° rotation swaps dimensions', async ({ page }) => {
  await page.goto('/#/rotate')
  await page.getByTestId('file-input').setInputFiles(fixture('red.png'))
  await page.getByRole('button', { name: /Process file/i }).click()
  await expect(page.getByText('600 × 800')).toBeVisible()

  const { buffer } = await captureDownload(page, () =>
    page.getByRole('button', { name: 'Download', exact: true }).click(),
  )
  expect(pngDimensions(buffer)).toEqual({ width: 600, height: 800 })
})

test('metadata viewer shows dimensions and local-processing note', async ({ page }) => {
  await page.goto('/#/metadata')
  await page.getByTestId('file-input').setInputFiles(fixture('red.png'))
  await expect(page.getByText('800 × 600 px')).toBeVisible()
  await expect(page.getByText('image/png').first()).toBeVisible()
  await expect(page.getByText('Read locally in your browser — never uploaded.')).toBeVisible()
})

test('images → PDF produces a real 2-page PDF', async ({ page }) => {
  await page.goto('/#/pdf')
  await page.getByTestId('file-input').setInputFiles([fixture('red.png'), fixture('blue.png')])
  await page.getByRole('button', { name: /Create PDF from 2 images/i }).click()

  const { buffer, filename } = await captureDownload(page, () =>
    page.getByRole('button', { name: 'Download', exact: true }).click(),
  )
  expect(filename).toBe('images.pdf')
  expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-')
  const { PDFDocument } = await import('pdf-lib')
  const doc = await PDFDocument.load(buffer)
  expect(doc.getPageCount()).toBe(2)
})

test('merge PDFs produces a combined 3-page PDF', async ({ page }) => {
  await page.goto('/#/pdf')
  await page.getByRole('tab', { name: 'Merge PDFs' }).click()
  await page.getByTestId('file-input').setInputFiles([fixture('doc-a.pdf'), fixture('doc-b.pdf')])
  await page.getByRole('button', { name: /Merge 2 PDFs/i }).click()

  const { buffer, filename } = await captureDownload(page, () =>
    page.getByRole('button', { name: 'Download', exact: true }).click(),
  )
  expect(filename).toBe('merged.pdf')
  const { PDFDocument } = await import('pdf-lib')
  const doc = await PDFDocument.load(buffer)
  expect(doc.getPageCount()).toBe(3)
})

test('invalid files are rejected with a clear error', async ({ page }) => {
  await page.goto('/#/resize')
  await page.getByTestId('file-input').setInputFiles(fixture('notes.txt'))
  await expect(page.getByRole('alert')).toContainText(/not a supported image/i)
})

test('FREEMIUM: free users cannot batch; premium unlocks batch + ZIP', async ({ page }) => {
  await page.goto('/#/resize')

  // 1. Free user selects 2 files → blocked, error + upgrade modal appears.
  await page.getByTestId('file-input').setInputFiles([fixture('red.png'), fixture('blue.png')])
  await expect(page.getByRole('alert')).toContainText(/Batch processing is a Premium feature/i)
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('$9.99')
  // The upgrade CTA points at the REAL Lemon Squeezy checkout — never a placeholder.
  const upgradeCta = dialog.getByRole('link', { name: /Upgrade to Premium/i })
  await expect(upgradeCta).toHaveAttribute('href', LS_CHECKOUT_URL)

  // 2. Clicking Upgrade alone must NOT unlock Premium (it just opens checkout).
  await expect(page.getByRole('button', { name: '★ PREMIUM' })).not.toBeVisible()

  // 3. Wrong key rejected by the license server → stays Free.
  await stubLicenseApi(page)
  await dialog.getByLabel(/license key/i).fill('NOT-A-KEY')
  await dialog.getByRole('button', { name: 'Activate' }).click()
  await expect(dialog.getByRole('alert')).toContainText(/not found/i)
  await expect(page.getByRole('button', { name: '★ PREMIUM' })).not.toBeVisible()

  // 4. Valid key activates against the (stubbed) license server → Premium.
  await dialog.getByLabel(/license key/i).fill('FT-E2E-TEST-KEY-1234-5678')
  await dialog.getByRole('button', { name: 'Activate' }).click()
  await expect(page.getByRole('button', { name: '★ PREMIUM' })).toBeVisible()

  // 5. Batch now works end-to-end.
  await page.getByTestId('file-input').setInputFiles([fixture('red.png'), fixture('blue.png')])
  await expect(page.getByText('Selected (2)')).toBeVisible()
  await page.getByRole('button', { name: /Process 2 files/i }).click()
  await expect(page.getByText('Results (2)')).toBeVisible()

  // 6. ZIP download contains two real resized PNGs.
  const { buffer, filename } = await captureDownload(page, () =>
    page.getByRole('button', { name: /Download ZIP/i }).click(),
  )
  expect(filename).toBe('filetools-results.zip')
  expect(buffer.subarray(0, 2).toString('ascii')).toBe('PK')
  const entries = unzipSync(buffer)
  const names = Object.keys(entries).sort()
  expect(names).toEqual(['blue_resized.png', 'red_resized.png'])
  expect(pngDimensions(Buffer.from(entries['red_resized.png']))).toEqual({ width: 400, height: 300 })
  expect(pngDimensions(Buffer.from(entries['blue_resized.png']))).toEqual({ width: 200, height: 150 })
})

test('premium history records completed jobs', async ({ page }) => {
  await page.goto('/')
  await unlockPremium(page)
  await expect(page.getByRole('button', { name: '★ PREMIUM' })).toBeVisible()

  await page.goto('/#/resize')
  await page.getByTestId('file-input').setInputFiles(fixture('red.png'))
  await page.getByRole('button', { name: /Process file/i }).click()
  await expect(page.getByText('Results (1)')).toBeVisible()

  await page.getByRole('button', { name: 'Open processing history' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Resize')
  await expect(dialog).toContainText('1 in / 1 out')
})

test('premium presets apply saved settings', async ({ page }) => {
  await page.goto('/')
  await unlockPremium(page)
  await page.goto('/#/resize')
  await page.getByTestId('file-input').setInputFiles(fixture('red.png'))

  await page.getByLabel('Apply a preset').selectOption({ label: 'Avatar · 256px' })
  await page.getByRole('button', { name: /Process file/i }).click()
  await expect(page.getByText('256 × 192')).toBeVisible()
})
