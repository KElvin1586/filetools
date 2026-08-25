import { config } from '../config'
import { useEntitlement } from '../state/entitlement'

interface HeaderProps {
  onHome: () => void
  onOpenHistory: () => void
}

export function Header({ onHome, onOpenHistory }: HeaderProps) {
  const { isPremium, openUpgrade, deactivate, devOverride, setDevForce } = useEntitlement()
  const hasDevMode = import.meta.env.DEV

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-1.5 px-2 sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-1.5 text-base font-bold text-white sm:gap-2 sm:text-lg"
          aria-label="FileTools home"
        >
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-6 w-6 sm:h-7 sm:w-7" />
          FileTools
        </button>
        <span
          className="hidden rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-300 sm:inline"
          title="Files are processed locally in your browser and never uploaded"
        >
          100% local · private
        </span>

        <div className="ml-auto flex items-center gap-2">
          {hasDevMode && setDevForce && (
            <button
              type="button"
              onClick={() => setDevForce(devOverride === null ? 'premium' : null)}
              title="DEVELOPMENT TEST MODE — forces the whole app into Premium (or clears the forcing). Never exists in production builds."
              aria-pressed={devOverride !== null}
              className="rounded border border-emerald-600/60 px-2 py-1 font-mono text-[11px] font-semibold text-emerald-300 hover:bg-emerald-950/60"
            >
              {devOverride
                ? `🧪 TEST ${devOverride.toUpperCase()}`
                : '🧪 TEST: real'}
            </button>
          )}
          <button type="button" onClick={onOpenHistory} className="btn-ghost px-2 py-1.5 text-sm sm:px-3" aria-label="Open processing history">
            History
          </button>
          {isPremium ? (
            <button
              type="button"
              onClick={deactivate}
              title="Premium is active on this device. Click to revert to Free."
              className="rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-slate-950 sm:px-3"
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
