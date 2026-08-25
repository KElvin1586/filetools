# AGENTS.md — FileTools repository knowledge

## Commands
- `npm run dev` — dev server (5173)
- `npm run build` — typecheck + production build to `dist/`
- `npm test` — 61 Vitest unit tests (node env, real code paths)
- `npm run test:e2e` — 16 Playwright tests; regenerates fixtures, builds, previews on 4173
- `npm run lint` — ESLint flat config
- `node scripts/make-fixtures.mjs` — regenerate E2E binary fixtures (hand-encoded PNGs, pdf-lib PDFs)

## Architecture notes
- **Entitlement gate**: everything goes through `canUseFeature(plan, feature)` in
  `src/lib/entitlement.ts`. Never scatter premium checks; add features to `PREMIUM_FEATURES`.
- **Pure logic lives in `src/lib/`** (no React) so it stays unit-testable in Node.
- **React Compiler-era lint rules** (`react-hooks/set-state-in-effect`, no refs in render) are
  enforced. Reset modal state by remounting (see UpgradeModal's fresh-mount pattern); create
  object URLs in effects; run side effects from event handlers, not effects.
- **DropZone** gates multi-file selection to Premium by default; tools with their own
  free/premium limits (PdfTool) pass `gateBatchSelection={false}`.
- **pdf-lib** is dynamically imported — it stays out of the main bundle.
- Playwright E2E asserts on real downloaded bytes (PNG IHDR, WebP RIFF, PDF pages, ZIP
  entries), never on mocked processing.

## Gotchas
- Emoji icons render as boxes in headless Chromium without emoji fonts — sandbox-only issue.
- `vite preview` needs `preview.allowedHosts` for non-localhost hosts (configured for
  `*.prod-runtime.all-hands.dev`).
- Animated GIFs decode to the first frame only — expected browser behavior, not a bug.
- Premium = Lemon Squeezy license API (src/lib/license.ts): activate on purchase-key entry,
  revalidate on every load, deactivate on opt-out. No static keys anywhere. E2E stubs the
  network boundary (page.route) with real LS response shapes; unit tests cover parsers.
- index.html `%VITE_*%` placeholders break the build ("URI malformed") when the var is
  undefined — substitutions happen in the `htmlEnvPlugin` in vite.config.ts with defaults;
  add new placeholders there, not directly to index.html.
- Dev premium test mode lives behind `import.meta.env.DEV` (Header toggle + #/test-checkout);
  keep it out of production bundles.
- Playwright browser binaries must be re-downloaded (`npx playwright install chromium`) after
  any Playwright version bump (e.g. when adding @axe-core/playwright).
