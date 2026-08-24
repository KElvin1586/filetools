import { expect, test } from '@playwright/test'

/**
 * Responsive audit: every target viewport from the QA checklist must render
 * the landing page, a tool page, the PDF tool and the upgrade modal without
 * horizontal overflow.
 */

const WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920] as const
const HEIGHT = 800

const ROUTES = ['/', '/#/resize', '/#/compress', '/#/crop', '/#/pdf'] as const

async function horizontalOverflow(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

for (const width of WIDTHS) {
  test(`viewport ${width}px: no horizontal overflow on any key route`, async ({ page }) => {
    await page.setViewportSize({ width, height: HEIGHT })
    for (const route of ROUTES) {
      await page.goto(route)
      await expect(page.getByRole('banner')).toBeVisible()
      expect(await horizontalOverflow(page), `${route} overflows at ${width}px`).toBeLessThanOrEqual(1)
    }
  })
}

test('upgrade modal fits at 320px and 768px', async ({ page }) => {
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: HEIGHT })
    await page.goto('/')
    await page.getByRole('button', { name: 'Upgrade', exact: true }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const box = await dialog.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeLessThanOrEqual(width)
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)
    await page.keyboard.press('Escape')
  }
})

test('pricing cards stack at mobile widths and split at tablet+', async ({ page }) => {
  await page.goto('/')

  await page.setViewportSize({ width: 375, height: HEIGHT })
  const free = await page.getByText('Free', { exact: true }).first().boundingBox()
  const premium = await page.getByText('Premium', { exact: true }).first().boundingBox()
  expect(free).not.toBeNull()
  expect(premium).not.toBeNull()
  // Stacked vertically on mobile.
  expect(premium!.y).toBeGreaterThan(free!.y + free!.height - 1)

  await page.setViewportSize({ width: 1024, height: HEIGHT })
  const free2 = await page.getByText('Free', { exact: true }).first().boundingBox()
  const premium2 = await page.getByText('Premium', { exact: true }).first().boundingBox()
  // Side by side at tablet and up.
  expect(Math.abs(free2!.y - premium2!.y)).toBeLessThan(20)
})
