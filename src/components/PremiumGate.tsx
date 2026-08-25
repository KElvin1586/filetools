import type { ReactNode } from 'react'
import { FEATURE_LABELS, type PremiumFeature } from '../lib/entitlement'
import { useEntitlement } from '../state/entitlement'

interface PremiumGateProps {
  feature: PremiumFeature
  children: ReactNode
  /** Short teaser shown on the locked panel. */
  teaser?: string
}

/**
 * Renders children for Premium users; for Free users renders a locked panel
 * with the 🔒 PREMIUM badge that opens the upgrade modal on click.
 */
export function PremiumGate({ feature, children, teaser }: PremiumGateProps) {
  const { isPremium, openUpgrade } = useEntitlement()
  if (isPremium) return <>{children}</>

  return (
    <button
      type="button"
      onClick={() => openUpgrade(feature)}
      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-3 text-left transition-colors hover:bg-amber-500/10"
    >
      <span>
        <span className="block text-sm font-medium text-amber-300">
          🔒 PREMIUM · {FEATURE_LABELS[feature]}
        </span>
        {teaser && <span className="mt-0.5 block text-xs text-slate-400">{teaser}</span>}
      </span>
      <span className="shrink-0 rounded-md bg-amber-400 px-2.5 py-1 text-xs font-semibold text-slate-950 group-hover:bg-amber-300">
        Upgrade
      </span>
    </button>
  )
}

/** Small inline 🔒 PREMIUM badge used on labels and buttons. */
export function PremiumBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
      🔒 Premium
    </span>
  )
}
