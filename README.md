# FileTools

Private, client-side file utilities that run entirely in your browser. No server, no database,
no accounts, no tracking — every file is processed locally on your device and never uploaded.

**Stack:** React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · pdf-lib · fflate

## Tools

| Tool | What it does |
| --- | --- |
| Resize | Scale by percentage, fit into a bounding box, or set exact dimensions |
| Compress | Quality presets (light/medium/strong), exact quality slider, target file size |
| Convert | JPG ⇄ PNG ⇄ WebP conversion; GIF and BMP accepted as input |
| Crop | Interactive crop with aspect presets, freeform drag, exact pixel inputs |
| Rotate & flip | 90° steps, horizontal/vertical flip, live preview |
| Metadata | Type (magic-byte verified), size, dimensions, aspect ratio, PDF properties |
| PDF tools | Images → PDF and PDF merge (client-side via pdf-lib) |

## Plans

A single entitlement check (`canUseFeature(plan, feature)` in `src/lib/entitlement.ts`) gates
every premium capability. Free users are blocked from executing premium functions and see
🔒 PREMIUM markers plus an upgrade modal.

**Free — $0**

- Single-file processing
- Resize (percentage & fit modes)
- Basic compression presets
- JPG/PNG/WebP conversion
- Crop, rotate & flip, metadata, basic PDF tools
- Per-file downloads

**Premium — $9.99 one-time (configurable)**

- Batch processing (up to 50 files)
- Advanced compression controls (target size, exact quality)
- Batch resizing & exact dimensions
- Batch conversion & quality control
- Advanced image settings (output format, smoothing)
- Presets (built-in + custom)
- Processing history (last 25 jobs)
- ZIP download of batch results

Pricing, upgrade URL, limits and the demo license key are all configured via environment
variables — see `.env.example`. There are **no fake payments**: the Upgrade button links to a
configurable external checkout URL, and a license key activates Premium locally.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build & preview:

```bash
npm run build
npm run preview
```

## Testing

```bash
npm test            # 61 unit tests (Vitest, real code paths, no mocks)
npm run test:e2e    # 16 end-to-end tests (Playwright, real Chromium, desktop + mobile)
```

E2E tests generate real binary fixtures (hand-encoded PNGs, pdf-lib PDFs), drive the built
app in Chromium, download the results and verify the actual bytes (PNG IHDR dimensions, WebP
RIFF headers, PDF page counts, ZIP contents).

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_PREMIUM_PRICE` | `9.99` | One-time Premium price |
| `VITE_PREMIUM_CURRENCY` | `USD` | Display currency |
| `VITE_UPGRADE_URL` | `https://example.com/filetools/upgrade` | External checkout page |
| `VITE_LICENSE_KEY` | `FILETOOLS-PREMIUM` | Demo key that unlocks Premium |
| `VITE_MAX_FILE_MB` | `50` | Per-file size limit |
| `VITE_MAX_BATCH_FILES` | `50` | Max files per Premium batch |
| `VITE_FREE_PDF_IMAGES_LIMIT` | `5` | Free images→PDF page limit |
| `VITE_FREE_PDF_MERGE_LIMIT` | `3` | Free PDF merge input limit |

See `.env.example` and `src/config.ts`.

## Privacy

Files are processed **locally in the browser** using Canvas, `createImageBitmap`, File APIs,
pdf-lib and fflate. Nothing is uploaded, transmitted, or stored on any server. You can verify
this in your browser's network inspector: the app makes zero file-related requests. The only
data persisted is Premium status, presets and history — in your browser's `localStorage`, on
your device, and never sent anywhere.

## Security

- Magic-byte (file signature) verification for every file — declared types are not trusted
- Declared-vs-content mismatch detection and rejection
- Per-file size limits (50 MB default) and batch count limits
- Canvas pixel cap (32,767 px per side) to prevent memory exhaustion
- Filenames sanitized before downloads
- TypeScript strict mode, no `any`, no `dangerouslySetInnerHTML`

## Documentation

- [User guide](USER-GUIDE.md) — how to use every tool
- [Installation](INSTALLATION.md) — local setup & development
- [Deployment](DEPLOYMENT.md) — static hosting & configuration
- [Changelog](CHANGELOG.md) · [License](LICENSE) (MIT)
