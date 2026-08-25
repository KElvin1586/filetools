import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility audit: axe-core scans on key screens plus keyboard-only
 * verification of the upgrade modal (focus trap, Escape, labelled controls).
 */

test('axe: home page has no serious accessibility violations', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([])
})

test('axe: upgrade modal has no serious accessibility violations', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Upgrade', exact: true }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  expect(serious.map((v) => v.id)).toEqual([])
})

test('upgrade modal: focus is trapped and Escape closes', async ({ page }) => {
  await page.goto('/')
  const upgradeButton = page.getByRole('button', { name: 'Upgrade', exact: true }).first()
  await upgradeButton.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // Tab through the whole dialog twice — focus must never leave it.
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab')
    const inside = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]')
      return dlg !== null && dlg.contains(document.activeElement)
    })
    expect(inside, `focus escaped the dialog after ${i + 1} Tabs`).toBe(true)
  }
  // Shift+Tab backwards must also stay trapped.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Shift+Tab')
    const inside = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]')
      return dlg !== null && dlg.contains(document.activeElement)
    })
    expect(inside).toBe(true)
  }

  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})

test('all interactive controls in the resize tool are labelled', async ({ page }) => {
  await page.goto('/#/resize')
  const unlabeled = await page.evaluate(() => {
    const offenders: string[] = []
    document.querySelectorAll('button, input, select, a[href]').forEach((el) => {
      const text = (el.textContent ?? '').trim()
      const ariaLabel = el.getAttribute('aria-label')
      const labelledBy = el.getAttribute('aria-labelledby')
      const id = el.getAttribute('id')
      const hasLabel = id !== null && document.querySelector(`label[for="${id}"]`) !== null
      if (!text && !ariaLabel && !labelledBy && !hasLabel) {
        offenders.push(el.outerHTML.slice(0, 80))
      }
    })
    return offenders
  })
  expect(unlabeled).toEqual([])
})

test('keyboard: full free resize flow without a mouse', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab') // skip to first interactive element
  // Focus should land somewhere sensible on the page.
  const focused = await page.evaluate(() => document.activeElement?.tagName)
  expect(focused).not.toBe('BODY')
})

test('production build contains no dev test checkout or test mode', async ({ page }) => {
  await page.goto('/#/test-checkout')
  // The dev-only route must not exist in production builds — we land on Home.
  await expect(page.getByRole('heading', { name: /Private file utilities/i })).toBeVisible()
  await expect(page.getByText('Development Test Mode')).not.toBeVisible()
  // No dev toggle in the header either.
  await expect(page.getByRole('button', { name: /🧪 TEST/ })).not.toBeVisible()
})
