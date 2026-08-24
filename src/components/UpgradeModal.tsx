import { useEffect, useRef, useState } from 'react'
import { config, formatPremiumPrice } from '../config'
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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Focus the key field once the modal is visible.
    const timer = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeUpgrade()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeUpgrade])

  const submit = () => {
    const result = activateLicense(key)
    if (!result.ok) setError(result.error ?? 'Invalid license key.')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeUpgrade()
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
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
            <span className="ml-2 text-sm font-normal text-slate-300">one-time payment</span>
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

        <a
          href={config.upgradeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-premium mt-4 w-full"
        >
          Upgrade to Premium →
        </a>
        <p className="mt-2 text-center text-xs text-slate-500">
          Checkout happens on our external payment page — FileTools never sees your card.
        </p>

        <div className="mt-5 border-t border-slate-800 pt-4">
          <label htmlFor="license-key" className="label">
            Have a license key?
          </label>
          <div className="flex gap-2">
            <input
              id="license-key"
              ref={inputRef}
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Enter license key"
              className="input"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" onClick={submit} className="btn-secondary shrink-0">
              Activate
            </button>
          </div>
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
