// Generates heavy, image-filled test PDFs (never committed).
// Usage: node scripts/make-fixture-pdf.mjs [--pages 300] [--out fixtures/generated/heavy.pdf] [--spreads]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import jpeg from 'jpeg-js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const { values } = parseArgs({
  options: {
    pages: { type: 'string', default: '300' },
    out: { type: 'string', default: 'fixtures/generated/heavy.pdf' },
    spreads: { type: 'boolean', default: false },
    width: { type: 'string', default: '1800' },
    height: { type: 'string', default: '2400' },
  },
});

const pageCount = Number(values.pages);
const imgW = Number(values.width);
const imgH = Number(values.height);

/** A photo-like JPEG: smooth color fields, soft blobs and grain (compresses like a real photo). */
function photo(seed) {
  let s = seed * 9301 + 49297;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const data = Buffer.alloc(imgW * imgH * 4);
  const blobs = Array.from({ length: 7 }, () => ({
    x: rand() * imgW,
    y: rand() * imgH,
    r: (0.15 + rand() * 0.35) * imgW,
    c: [rand() * 255, rand() * 255, rand() * 255],
  }));
  const base = [rand() * 120 + 60, rand() * 120 + 60, rand() * 120 + 60];
  for (let y = 0; y < imgH; y++) {
    for (let x = 0; x < imgW; x++) {
      let [r, g, b] = base;
      for (const blob of blobs) {
        const d = Math.hypot(x - blob.x, y - blob.y) / blob.r;
        if (d < 1) {
          const k = (1 - d) * (1 - d);
          r += (blob.c[0] - r) * k;
          g += (blob.c[1] - g) * k;
          b += (blob.c[2] - b) * k;
        }
      }
      const grain = (rand() - 0.5) * 36;
      const i = (y * imgW + x) * 4;
      data[i] = r + grain;
      data[i + 1] = g + grain;
      data[i + 2] = b + grain;
      data[i + 3] = 255;
    }
  }
  return jpeg.encode({ data, width: imgW, height: imgH }, 82).data;
}

const UNIQUE = 16;
console.log(`Generating ${UNIQUE} photos ${imgW}x${imgH}…`);
const photos = Array.from({ length: UNIQUE }, (_, i) => photo(i + 1));

const doc = await PDFDocument.create();
doc.setTitle(values.spreads ? 'Folheia fixture (spreads)' : 'Folheia fixture');
doc.setAuthor('Folheia test suite');
const font = await doc.embedFont(StandardFonts.Helvetica);
const pageW = 595;
const pageH = 793;

for (let n = 0; n < pageCount; n++) {
  const isSpread = values.spreads && n > 0 && n < pageCount - 1;
  const width = isSpread ? pageW * 2 : pageW;
  const page = doc.addPage([width, pageH]);
  // Embed every page's image separately so the file is as heavy as a real magazine.
  const image = await doc.embedJpg(photos[n % UNIQUE]);
  page.drawImage(image, { x: 0, y: 0, width, height: pageH });
  page.drawRectangle({ x: 24, y: 24, width: 120, height: 40, color: rgb(1, 1, 1), opacity: 0.85 });
  page.drawText(`${n + 1}`, { x: 36, y: 36, size: 22, font, color: rgb(0.1, 0.1, 0.1) });
}

const bytes = await doc.save({ useObjectStreams: true });
mkdirSync(dirname(values.out), { recursive: true });
writeFileSync(values.out, bytes);
console.log(
  `Wrote ${values.out}: ${pageCount} pages, ${(bytes.length / 1024 / 1024).toFixed(1)} MB`,
);
