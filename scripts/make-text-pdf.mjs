// Generates a small PDF with real text, an internal link and a web link (never committed).
// Usage: node scripts/make-text-pdf.mjs [--out fixtures/generated/text.pdf]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { PDFDocument, PDFName, PDFString, StandardFonts, rgb } from 'pdf-lib';

const { values } = parseArgs({
  options: { out: { type: 'string', default: 'fixtures/generated/text.pdf' } },
});

const doc = await PDFDocument.create();
doc.setTitle('Folheia text fixture');
doc.setAuthor('Folheia test suite');
const font = await doc.embedFont(StandardFonts.TimesRoman);
const pages = [];
for (let n = 1; n <= 6; n++) {
  const page = doc.addPage([420, 595]);
  page.drawText(`Chapter ${n}`, { x: 40, y: 530, size: 24, font });
  const body = `This is page ${n} of the Folheia text fixture. The quick brown fox jumps over the lazy dog.`;
  page.drawText(body, {
    x: 40,
    y: 490,
    size: 11,
    font,
    maxWidth: 340,
    lineHeight: 15,
    color: rgb(0.1, 0.1, 0.1),
  });
  pages.push(page);
}

function link(page, rect, action) {
  const annotation = doc.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: rect,
    Border: [0, 0, 0],
    A: action,
  });
  const ref = doc.context.register(annotation);
  const existing = page.node.lookup(PDFName.of('Annots'));
  if (existing) existing.push(ref);
  else page.node.set(PDFName.of('Annots'), doc.context.obj([ref]));
}

const first = pages[0];
first.drawText('Go to chapter 4', { x: 40, y: 400, size: 14, font, color: rgb(0, 0, 0.6) });
link(
  first,
  [38, 395, 160, 414],
  doc.context.obj({ S: 'GoTo', D: [pages[3].ref, PDFName.of('Fit')] }),
);
first.drawText('Visit example.org', { x: 40, y: 370, size: 14, font, color: rgb(0, 0, 0.6) });
link(
  first,
  [38, 365, 170, 384],
  doc.context.obj({ S: 'URI', URI: PDFString.of('https://example.org/') }),
);

const bytes = await doc.save();
mkdirSync(dirname(values.out), { recursive: true });
writeFileSync(values.out, bytes);
console.log(`Wrote ${values.out}: ${pages.length} pages`);
