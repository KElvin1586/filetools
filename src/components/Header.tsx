import { config } from '../config'
import { useEntitlement } from '../state/entitlement'

interface HeaderProps {
  onHome: () => void
  onOpenHistory: () => void
}

export function Header({ onHome, onOpenHistory }: HeaderProps) {
  const { isPremium, openUpgrade, deactivate } = useEntitlement()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-2 text-lg font-bold text-white"
          aria-label="FileTools home"
        >
          <img src="./favicon.svg" alt="" className="h-7 w-7" />
          FileTools
        </button>
        <span
          className="hidden rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-300 sm:inline"
          title="Files are processed locally in your browser and never uploaded"
        >
          100% local · private
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={onOpenHistory} className="btn-ghost px-3 py-1.5 text-sm" aria-label="Open processing history">
            History
          </button>
          {isPremium ? (
            <button
              type="button"
              onClick={deactivate}
              title="Premium is active on this device. Click to revert to Free."
              className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-slate-950"
            >
              ★ PREMIUM
            </button>
          ) : (
            <>
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-400">
                FREE
              </span>
              <button type="button" onClick={() => openUpgrade()} className="btn-premium px-3 py-1.5 text-xs">
                Upgrade
              </button>
            </>
          )}
        </div>
      </div>
      <span className="sr-only">{config.appName} v{config.version}</span>
    </header>
  )
}
