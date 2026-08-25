# FileTools User Guide

FileTools is a private, browser-based file utility suite. Everything runs locally on your
device — your files are never uploaded. This guide walks through every tool and plan.

## Getting around

The home screen lists all seven tools. Click a card to open it; use **← All tools** to go
back. The header shows your plan (FREE or ★ PREMIUM), a History button, and an Upgrade button.

Every tool follows the same flow:

1. **Add files** — drag them onto the dashed dropzone, or click it to browse.
2. **Review the selection** — remove individual files or clear the list.
3. **Adjust options** — the panel below the file list.
4. **Process** — click the primary button.
5. **Download** — each result has a Download button; Premium batches also offer
   **Download ZIP**.

## Resize

Scale images by **percentage**, **fit** them into a bounding box, or set **exact dimensions**
(pixel-perfect; aspect ratio is not preserved in exact mode). Exact dimensions and batch
resizing are Premium.

## Compress

Pick a quality preset — Light, Medium (default), Strong — or switch to **Custom** (Premium)
for an exact quality slider or a **target file size** in KB. The tool binary-searches quality
to land just under your target. PNG output is lossless by format; converting to JPEG/WebP is
recommended for photos.

## Convert

Convert between JPG, PNG and WebP. GIF and BMP files are accepted as input (first frame of
animated GIFs). Quality control and output-naming are Premium.

## Crop

Open one image, then drag the crop handles on the preview, use the aspect presets
(freeform, 1:1, 4:3, 16:9), or type exact pixels in the Left / Top / Width / Height inputs.
Everything updates live.

## Rotate & flip

Rotate in 90° steps and flip horizontally or vertically, with a live preview of the first
selected image. Output keeps the source format where possible.

## Metadata

Drop an image or PDF to see what the browser can read locally: name, declared type,
detected type (magic bytes), size, dimensions, aspect ratio, megapixels, and for PDFs the
page count and document metadata (title, author, producer, dates). Nothing is uploaded.

## PDF tools

- **Images → PDF** — combine images into a single PDF; file order = page order. Free plan:
  up to 5 images per document; Premium raises this to 50.
- **Merge PDFs** — combine 2+ PDFs into one, in file order. Free plan: up to 3 PDFs;
  Premium raises this to 50.

## Free vs Premium

The Free plan covers single-file work end-to-end. Premium is a **one-time KSh 1,299 (≈ $10 USD)** purchase
(configurable) that unlocks:

- Batch processing (up to 50 files per job)
- Advanced compression (target size, exact quality slider)
- Batch resizing, batch conversion, exact resize dimensions
- Advanced image settings (output format & smoothing)
- Presets — built-in ones plus your own saved settings
- Processing history (last 25 jobs)
- ZIP download of batch results

Free users see 🔒 PREMIUM markers on gated controls. Clicking one opens the upgrade modal.

## Upgrading

1. Click **Upgrade** in the header (or any 🔒 control).
2. The modal shows the price and feature list. Click **Upgrade to Premium →** to open the
   Lemon Squeezy checkout (FileTools never handles your card).
3. After checkout, Lemon Squeezy emails you a **license key**. Open the upgrade modal,
   paste the key into *Have a license key from your purchase email?* and click
   **Activate**. The app verifies the key with Lemon Squeezy's license server before
   Premium unlocks.

> **Developers:** in `npm run dev` builds you can test both plans without any purchase —
> use the **🧪 TEST** toggle in the header or visit `#/test-checkout`. Neither exists in
> production builds.

Premium revalidates with the license server on each visit — it stays active after
reload, and stops working if the key is revoked or refunded. To deactivate this device,
click the ★ PREMIUM badge in the header.

## Presets (Premium)

On image tools, the Presets row offers built-ins like *Avatar · 256px*, *Web hero · 1920px*
and *Product photo · JPG q80*. Select one to apply its settings instantly. Use **Save current
as preset** to store your own; saved presets persist locally.

## History (Premium)

The History button in the header lists your last 25 completed jobs with tool, time, file
counts and sizes. History never stores file contents — only statistics. Clear it any time.

## Privacy & limits

- All processing happens in your browser via Canvas, pdf-lib and fflate. There is no server.
- Limits: 50 MB per file, 50 files per Premium batch, images up to 32,767 px per side.
- Supported inputs: JPEG, PNG, WebP, GIF (first frame), BMP; PDFs for merge/metadata.
- Downloads are generated locally from in-memory blobs.

## Troubleshooting

- **"Not a supported image"** — the file's real content doesn't match a supported type. We
  verify magic bytes, so a renamed file (e.g. `.txt` → `.png`) is correctly rejected.
- **"Exceeds the 50 MB limit"** — the per-file cap. The owner can raise it at build time.
- **WebP output not available** — your browser's canvas can't encode WebP; choose PNG or JPEG.
- **Animated GIF becomes static** — browsers decode only the first frame; this is expected.
- **Downloads don't appear** — check your browser's download permissions for the site.
