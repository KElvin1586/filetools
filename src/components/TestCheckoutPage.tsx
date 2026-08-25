/**
 * DEVELOPMENT-ONLY test checkout page.
 *
 * Simulates the "return from payment provider" step so developers can exercise
 * the complete upgrade flow (modal → checkout → activation) without any real
 * money changing hands. The route is registered only in development builds and
 * the page additionally refuses to render anything payment-like in production.
 */

import { useEntitlement } from '../state/entitlement'
import { DEV_TEST_MODE, DEV_PLAN_STORAGE_KEY } from '../lib/entitlement'
import { clearStoredLicense } from '../lib/license'
import { getStorage } from '../lib/storage'

export function TestCheckoutPage() {
  const { setDevForce, devOverride } = useEntitlement()

  // Production safety net — the route is only registered in dev builds, but
  // never render payment-like UI outside them either way.
  if (!DEV_TEST_MODE) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h2 className="text-xl font-bold text-white">Not available</h2>
        <p className="mt-2 text-sm text-slate-400">
          The test checkout exists only in development builds.
        </p>
      </div>
    )
  }

  const resetAll = () => {
    const storage = getStorage()
    clearStoredLicense(storage)
    storage.removeItem(DEV_PLAN_STORAGE_KEY)
    storage.removeItem('filetools.plan') // legacy key
    // Force is applied via context so the page still reflects current state.
    setDevForce?.(null)
    window.location.reload()
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border-2 border-dashed border-emerald-500/50 bg-emerald-950/20 p-6">
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
          🧪 Development Test Mode
        </p>
        <h2 className="mt-2 text-center text-2xl font-bold text-white">
          Test checkout
        </h2>
        <p className="mt-3 text-center text-sm text-slate-300">
          This page stands in for a real payment provider during development.
          <strong className="text-emerald-300"> No real payment is or will be processed; </strong>
          no payment credentials are collected or stored anywhere.
        </p>

        <div className="mt-6 space-y-3">
          <p className="text-xs text-slate-400">
            Current dev forcing: <strong className="text-slate-200">{devOverride ?? 'none (using real license state)'}</strong>
          </p>

          <button
            type="button"
            onClick={() => setDevForce?.('premium')}
            aria-pressed={devOverride === 'premium'}
            className="btn-premium w-full !py-3"
          >
            Simulate plan: PREMIUM (dev forcing)
          </button>
          <button
            type="button"
            onClick={() => setDevForce?.('free')}
            aria-pressed={devOverride === 'free'}
            className="btn-secondary w-full !py-3"
          >
            Simulate plan: FREE (dev forcing)
          </button>
          <button
            type="button"
            onClick={resetAll}
            className="btn-ghost w-full !py-3 text-sm"
          >
            Reset entitlement state (clear real + dev state)
          </button>

          <p className="text-xs text-slate-400">
            Dev forcing overrides the real license state for every feature gate
            in this session and persists in localStorage under
            <code className="mx-1 rounded bg-slate-800 px-1 py-0.5">{DEV_PLAN_STORAGE_KEY}</code>
            — it can never enable Premium in a production build, because
            <code className="mx-1 rounded bg-slate-800 px-1 py-0.5">setDevForce</code>
            is compiled out of production bundles entirely.
          </p>
        </div>

        <div className="mt-6 border-t border-emerald-500/20 pt-4 text-xs text-slate-400">
          <p>
            Hook up real payments later by setting <code>VITE_UPGRADE_URL</code> to your
            checkout provider and issuing license keys from your own backend — no app
            code changes required.
          </p>
        </div>
      </div>
    </div>
  )
}
