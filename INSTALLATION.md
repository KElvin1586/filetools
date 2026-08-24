# Installation

FileTools is a fully static, client-side web app. You need Node.js and npm — nothing else.
There is no database, backend, or external service to provision.

## Requirements

- Node.js ≥ 18 (developed and tested on Node 22)
- npm ≥ 9

## Install & run

```bash
git clone https://github.com/KElvin1586/filetools.git
cd filetools
npm install
npm run dev        # dev server on http://localhost:5173
```

## Configuration

Copy `.env.example` to `.env` and adjust as needed. All values are baked in at build time
(standard Vite `VITE_*` behavior) — change them before `npm run build` for production.

```bash
cp .env.example .env
```

| Variable | Default | Notes |
| --- | --- | --- |
| `VITE_PREMIUM_PRICE` | `9.99` | One-time Premium price shown in UI |
| `VITE_PREMIUM_CURRENCY` | `USD` | Any ISO-4217 code (EUR, GBP, …) |
| `VITE_UPGRADE_URL` | *(unset)* | Your real checkout page; unset = Upgrade button shows a plain "not configured" notice, never a placeholder link |
| `VITE_PREMIUM_LICENSE_KEY` | `FILETOOLS-PREMIUM` | Key that unlocks Premium. **Change it** — it ships with the client bundle. |
| `VITE_MAX_FILE_MB` | `50` | Per-file size limit |
| `VITE_MAX_BATCH_FILES` | `50` | Premium batch cap |
| `VITE_FREE_PDF_IMAGES_LIMIT` | `5` | Free images→PDF pages |
| `VITE_FREE_PDF_MERGE_LIMIT` | `3` | Free PDF merge inputs |

> Note: entitlement is client-side by design. The license key and all limits are visible in
> the shipped bundle; this app sells convenience, not secrecy. For tamper-proof licensing you
> would need a server — which this project deliberately avoids.

## Production build

```bash
npm run build      # outputs dist/
npm run preview    # serves dist/ locally on http://localhost:4173
```

`dist/` is a plain static folder — deploy it anywhere (see DEPLOYMENT.md). The build uses a
relative base (`base: './'`), so it works from any sub-path without extra config.

## Development

```bash
npm run dev        # Vite dev server with HMR
npm test           # unit tests (Vitest, run once)
npm run test:watch # unit tests in watch mode
npm run test:e2e   # Playwright E2E (builds + previews the app automatically)
npm run lint       # ESLint
npm run typecheck  # strict TypeScript, no emit
```

### Running E2E tests

```bash
npx playwright install chromium   # one-time browser download
npm run test:e2e
```

The suite regenerates binary fixtures (`scripts/make-fixtures.mjs`), builds the app, serves
it via `vite preview`, and runs desktop + mobile (Pixel 7 emulation) tests in real Chromium.

## Project structure

```
src/
  config.ts            runtime config from VITE_* env vars
  lib/                 pure processing & gating logic (no React)
    files.ts           filename/byte helpers
    validation.ts      magic-byte sniffing + size/type validation
    images.ts          canvas pipeline: resize, crop, rotate, compress
    pdf.ts             pdf-lib: images→PDF, merge, info
    zip.ts             fflate ZIP creation
    metadata.ts        metadata extraction
    entitlement.ts     FREE|PREMIUM gate, license keys
    presets.ts         preset model + persistence
    history.ts         job history model + persistence
    storage.ts         typed localStorage wrapper
  state/               React context providers (entitlement, history)
  components/          UI primitives (DropZone, UpgradeModal, PremiumGate, TestCheckoutPage, …)
  tools/               one screen per tool
  test/                unit tests
e2e/                   Playwright specs + generated fixtures
scripts/make-fixtures.mjs
```
