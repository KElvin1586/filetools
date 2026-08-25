import { config, formatPremiumAltPrice, formatPremiumPrice } from '../config'
import { PREMIUM_FEATURES, FEATURE_LABELS } from '../lib/entitlement'
import type { ToolId } from '../lib/presets'
import { useEntitlement } from '../state/entitlement'

export interface ToolDescriptor {
  id: ToolId
  title: string
  icon: string
  blurb: string
  premiumNote?: string
}

export const TOOL_DESCRIPTORS: readonly ToolDescriptor[] = [
  {
    id: 'resize',
    title: 'Resize',
    icon: '📐',
    blurb: 'Scale by percentage, fit into bounds, or set exact dimensions.',
    premiumNote: 'Batch & exact dimensions',
  },
  {
    id: 'compress',
    title: 'Compress',
    icon: '🗜️',
    blurb: 'Shrink JPG/PNG/WebP files with quality presets.',
    premiumNote: 'Target size & exact quality',
  },
  {
    id: 'convert',
    title: 'Convert',
    icon: '🔄',
    blurb: 'Convert between JPG, PNG and WebP — plus GIF/BMP input.',
    premiumNote: 'Batch conversion & quality control',
  },
  {
    id: 'crop',
    title: 'Crop',
    icon: '✂️',
    blurb: 'Interactive crop with aspect presets and exact pixel control.',
  },
  {
    id: 'rotate',
    title: 'Rotate & flip',
    icon: '⟳',
    blurb: 'Rotate in 90° steps and flip horizontally or vertically.',
    premiumNote: 'Batch rotation',
  },
  {
    id: 'metadata',
    title: 'Metadata',
    icon: '🔍',
    blurb: 'See type, size, dimensions and PDF properties — read locally.',
  },
  {
    id: 'pdf',
    title: 'PDF tools',
    icon: '📄',
    blurb: 'Combine images into a PDF or merge several PDFs into one.',
    premiumNote: 'Larger batches',
  },
] as const

const FREE_FEATURES = [
  'Single-file processing',
  'Image resize (percentage & fit)',
  'Basic compression presets',
  'JPG / PNG / WebP conversion',
  'Crop, rotate & flip',
  'Metadata viewer',
  'Per-file downloads',
]

interface HomeProps {
  onOpenTool: (tool: ToolId) => void
}

export function Home({ onOpenTool }: HomeProps) {
  const { isPremium, openUpgrade } = useEntitlement()

  return (
    <div>
      <section className="py-8 text-center sm:py-12">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Private file utilities, <span className="text-sky-400">in your browser</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
          Resize, compress, convert, crop and rotate images. Inspect metadata. Build and merge
          PDFs. Every operation runs locally on your device — files are never uploaded anywhere.
        </p>
      </section>

      <section aria-label="Tools" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOL_DESCRIPTORS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => onOpenTool(tool.id)}
            className="panel group p-5 text-left transition-colors hover:border-sky-500/60 hover:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl" aria-hidden="true">{tool.icon}</span>
              {tool.premiumNote && (
                <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                  🔒 {tool.premiumNote}
                </span>
              )}
            </div>
            <h2 className="mt-3 font-semibold text-white group-hover:text-sky-300">{tool.title}</h2>
            <p className="mt-1 text-sm text-slate-400">{tool.blurb}</p>
          </button>
        ))}
      </section>

      <section aria-label="Pricing" className="mt-14">
        <h2 className="text-center text-xl font-bold text-white">Simple, honest pricing</h2>
        <p className="mt-1 text-center text-sm text-slate-400">
          One-time payment. No subscriptions, no accounts, no tracking.
        </p>
        <div className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="panel p-6">
            <h3 className="font-semibold text-white">Free</h3>
            <p className="mt-1 text-3xl font-bold text-white">$0</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span aria-hidden="true" className="text-emerald-400">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <div className="panel relative border-amber-500/40 p-6">
            <h3 className="font-semibold text-amber-300">Premium</h3>
            <p className="mt-1 text-3xl font-bold text-white">
              {formatPremiumPrice()}
              <span className="ml-2 text-sm font-normal text-slate-400">
                one-time · {formatPremiumAltPrice()}
              </span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li className="flex gap-2">
                <span aria-hidden="true" className="text-emerald-400">✓</span>
                Everything in Free
              </li>
              {PREMIUM_FEATURES.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span aria-hidden="true" className="text-emerald-400">✓</span>
                  {FEATURE_LABELS[feature]}
                </li>
              ))}
            </ul>
            {isPremium ? (
              <p className="mt-5 rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-sm font-medium text-emerald-300">
                ★ Premium active on this device
              </p>
            ) : (
              <button type="button" onClick={() => openUpgrade()} className="btn-premium mt-5 w-full">
                Upgrade to Premium
              </button>
            )}
          </div>
        </div>
        <p className="mt-4 max-w-full text-center text-xs text-slate-400">
          {config.upgradeUrl ? (
            <>
              Payments are handled securely by Lemon Squeezy:{' '}
              <a href={config.upgradeUrl} target="_blank" rel="noopener noreferrer" className="text-sky-400 underline underline-offset-2 break-all hover:text-sky-300">
                Buy FileTools Premium
              </a>
            </>
          ) : (
            'Checkout URL is not configured for this deployment yet — the Upgrade button will become active once the owner sets VITE_UPGRADE_URL.'
          )}
        </p>
      </section>
    </div>
  )
}
