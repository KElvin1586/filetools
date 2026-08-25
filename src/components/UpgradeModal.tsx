import { useEffect, useRef, useState } from 'react'
import { config, formatPremiumAltPrice, formatPremiumPrice } from '../config'
import { FEATURE_LABELS, PREMIUM_FEATURES } from '../lib/entitlement'
import { useEntitlement } from '../state/entitlement'

/**
 * Upgrade modal shown whenever a free user hits a Premium gate.
 * No fake payments: it shows the configured one-time price, links to the
 * configured external checkout URL, and accepts a license key.
 */
export function UpgradeModal() {
  const { upgradeOpen } = useEntitlement()
  // Fresh mount on every open — no reset logic needed.
  if (!upgradeOpen) return null
  return <UpgradeDialog />
}

function UpgradeDialog() {
  const {
    upgradeFeature,
    closeUpgrade,
    activateLicense,
  } = useEntitlement()
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const dialog = dialogRef.current
    if (dialog) {
      // Focus the dialog itself first; users can Tab to the controls.
      dialog.focus()

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          closeUpgrade()
          return
        }
        // Keep Tab cycling inside the dialog.
        if (event.key !== 'Tab') return
        const focusable = dialog.querySelectorAll<HTMLElement>(FOCUSABLE)
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
      document.addEventListener('keydown', onKeyDown)
      return () => {
        document.removeEventListener('keydown', onKeyDown)
        previouslyFocused?.focus()
      }
    }
  }, [closeUpgrade])

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const result = await activateLicense(key)
      if (!result.ok) setError(result.error ?? 'Invalid license key.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeUpgrade()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl outline-none"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="upgrade-title" className="text-lg font-semibold text-white">
              🔒 Premium feature
            </h2>
            {upgradeFeature && (
              <p className="mt-1 text-sm text-amber-300">
                {FEATURE_LABELS[upgradeFeature]} requires Premium.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={closeUpgrade}
            aria-label="Close upgrade dialog"
            className="btn-ghost -mr-2 -mt-2 px-2 py-1 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-2xl font-bold text-amber-300">
            {formatPremiumPrice()}
            <span className="ml-2 text-sm font-normal text-slate-300">
              one-time payment · {formatPremiumAltPrice()}
            </span>
          </p>
          <ul className="mt-3 space-y-1 text-sm text-slate-200">
            {PREMIUM_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <span aria-hidden="true" className="text-emerald-400">✓</span>
                {FEATURE_LABELS[feature]}
              </li>
            ))}
          </ul>
        </div>

        {config.upgradeUrl ? (
          <>
            <a
              href={config.upgradeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-premium mt-4 w-full"
            >
              Upgrade to Premium →
            </a>
            <p className="mt-2 text-center text-xs text-slate-400">
              Checkout happens on the external payment page — FileTools never sees your card.
            </p>
          </>
        ) : (
          <>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              aria-disabled="true"
              title="Checkout is not configured for this deployment."
              className="btn-premium mt-4 w-full cursor-not-allowed opacity-50"
            >
              Upgrade to Premium →
            </a>
            <p className="mt-2 text-center text-xs text-slate-400">
              This deployment has no checkout configured — the owner must set
              VITE_UPGRADE_URL before upgrades can be purchased.
            </p>
          </>
        )}
        {config.testUpgradeUrl && (
          <p className="mt-3 rounded-md border border-emerald-600/40 bg-emerald-950/40 px-3 py-2 text-center text-xs text-emerald-300">
            Development build —{' '}
            <a href={config.testUpgradeUrl} className="font-medium underline underline-offset-2">
              open the internal test checkout ↗
            </a>
            {' '}(Test Mode — no real payment, never shipped to production)
          </p>
        )}

        <div className="mt-5 border-t border-slate-800 pt-4">
          <label htmlFor="license-key" className="label">
            Have a license key from your purchase email?
          </label>
          <div className="flex gap-2">
            <input
              id="license-key"
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !submitting && void submit()}
              placeholder="e.g. 1A2B3C4D-…"
              className="input"
              autoComplete="off"
              spellCheck={false}
              disabled={submitting}
            />
            <button
              type="button"
              onClick={() => void submit()}
              className="btn-secondary shrink-0"
              disabled={submitting}
            >
              {submitting ? 'Verifying…' : 'Activate'}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Keys are verified with Lemon Squeezy's license server — Premium never unlocks
            without a valid, activated license.
          </p>
          {error && (
            <p className="mt-2 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
