# Changelog

All notable changes to FileTools are documented here.
This project adheres to [Semantic Versioning](https://semver.org/).

## [1.1.0] — 2026-08-24

Commercial QA & freemium hardening release.

### Changed — placeholder & config cleanup

- `VITE_UPGRADE_URL` now defaults to **unset** instead of a placeholder domain; with no
  checkout configured, the Upgrade button renders visibly disabled with a plain explanation
  (Home pricing section likewise). Nothing in the app can send users to an example domain —
  enforced by a unit test.
- All documented env vars are actually read now: `VITE_APP_NAME`, `VITE_APP_URL`,
  `VITE_MAX_BATCH_FILES`, `VITE_FREE_PDF_IMAGES_LIMIT`, `VITE_FREE_PDF_MERGE_LIMIT`
  (previously documented but hardcoded).
- Version is injected from `package.json` at build time (`__APP_VERSION__`).

### Added — development premium test mode

- `import.meta.env.DEV`-only test mode: **🧪 TEST** header toggle forces the whole app into
  Premium or Free; `#/test-checkout` internal page simulates the payment-return step.
  Both are dead-code-eliminated from production builds (verified by an E2E test) and never
  claim a real payment occurred or store credentials.
- Upgrade modal shows the internal test checkout link in dev builds.

### Fixed — accessibility (found by new axe-core E2E tests)

- `text-slate-500` body text failed WCAG AA contrast on the dark theme → bumped to
  `text-slate-400` across the app.
- Links inside text blocks now always underlined (footer, pricing).
- Hidden file input now has an accessible name.
- Upgrade modal: proper focus trap (Tab/Shift+Tab cycle), focus restore on close,
  `aria-modal` on the inner dialog.
- Tool pages now render an `<h1>` (semantic heading structure).

### Fixed — responsive (found by new viewport E2E tests)

- Header overflowed 320 px viewports by 26 px (brand + History + FREE + Upgrade) → compact
  spacing/sizing on small screens; regression-tested at 9 widths (320→1920).

### Added — tests & docs

- E2E suites: premium features (target-size compression, batch convert/resize/rotate ZIP
  contents, relock after deactivate), responsive widths, axe scans, focus trap, labels,
  production build contains no test mode. 38 E2E + 66 unit tests total.
- Docs: PRICING.md, COMMERCIAL-LICENSE.md; LICENSE renamed to LICENSE.md; dev test mode
  documented in README/USER-GUIDE.
- SEO: Open Graph + Twitter meta, canonical URL, `robots.txt`, generated `og-image.png`,
  env-driven `VITE_APP_URL`/`VITE_META_DESCRIPTION` substitution at build time.

## [1.0.0] — 2026-08-24

Initial release.

### Tools

- **Resize** — percentage, fit-to-box and exact-dimension modes with pixel caps
- **Compress** — quality presets, exact quality slider, and target-size mode that
  binary-searches quality to land under a chosen file size
- **Convert** — JPG ⇄ PNG ⇄ WebP, with GIF (first frame) and BMP input
- **Crop** — interactive drag handles, aspect presets, exact pixel inputs, live preview
- **Rotate & flip** — 90° steps, horizontal/vertical flip, live preview
- **Metadata** — magic-byte type detection, dimensions, aspect ratio, PDF properties
- **PDF tools** — images → PDF and PDF merge via pdf-lib
- Drag & drop everywhere, per-file downloads, ZIP download for Premium batches

### Freemium

- Centralized `canUseFeature(plan, feature)` entitlement gate
- Free plan: single-file processing, basic resize/compress/convert, per-file downloads
- Premium plan ($9.99 one-time, configurable): batch processing, advanced compression,
  batch resize/convert, advanced settings, presets, history, ZIP downloads
- 🔒 PREMIUM markers and an upgrade modal for gated features; external checkout URL and
  local license-key activation (no fake payment flow)

### Privacy & security

- 100% client-side processing; zero network requests for file handling
- Magic-byte verification, declared/content mismatch rejection, size and pixel caps,
  filename sanitization
- localStorage only for Premium status, presets and history — never file contents

### Engineering

- React 18 + TypeScript (strict) + Vite 5 + Tailwind CSS 3
- 61 unit tests (Vitest) + 16 end-to-end tests (Playwright, real Chromium, desktop and
  mobile emulation) verifying real output bytes: PNG dimensions, WebP headers, PDF page
  counts, ZIP contents
