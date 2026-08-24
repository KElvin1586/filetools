# Changelog

All notable changes to FileTools are documented here.
This project adheres to [Semantic Versioning](https://semver.org/).

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
