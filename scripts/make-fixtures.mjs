/**
 * Generates real binary fixtures for E2E tests:
 *  - valid PNGs of known dimensions (hand-rolled encoder, no deps)
 *  - real PDFs via pdf-lib
 *  - a plain-text file for negative validation tests
 */
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'e2e', 'fixtures', 'generated')
fs.mkdirSync(outDir, { recursive: true })

// --- CRC32 ---------------------------------------------------------------
const crcTable = new Int32Array(256)
for (let n = 0; n < 256; n += 1) {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c
}
function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i += 1) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** Encodes an 8-bit RGB PNG. pixelFn(x, y) -> [r, g, b] */
function encodePng(width, height, pixelFn) {
  const stride = width * 3 + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0 // filter: none
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = pixelFn(x, y)
      const o = y * stride + 1 + x * 3
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: truecolor RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const red = encodePng(800, 600, () => [200, 30, 30])
const blue = encodePng(400, 300, () => [30, 60, 200])
// Noisy gradient compresses realistically (unlike a flat color).
const gradient = encodePng(640, 480, (x, y) => [
  (x * 7 + y * 13) % 256,
  (x * 3 + y * 5) % 256,
  (x ^ y) % 256,
])

fs.writeFileSync(path.join(outDir, 'red.png'), red)
fs.writeFileSync(path.join(outDir, 'blue.png'), blue)
fs.writeFileSync(path.join(outDir, 'gradient.png'), gradient)
fs.writeFileSync(path.join(outDir, 'notes.txt'), 'This is plain text, not an image.\n')

// --- PDFs via pdf-lib ------------------------------------------------------
const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')

async function makePdf(name, label, pageCount) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  doc.setTitle(label)
  for (let i = 0; i < pageCount; i += 1) {
    const page = doc.addPage([400, 300])
    page.drawText(`${label} — page ${i + 1}`, { x: 40, y: 150, size: 18, font, color: rgb(0, 0, 0) })
  }
  fs.writeFileSync(path.join(outDir, name), await doc.save())
}

await makePdf('doc-a.pdf', 'Document A', 1)
await makePdf('doc-b.pdf', 'Document B', 2)

console.log('Fixtures written to', outDir)
