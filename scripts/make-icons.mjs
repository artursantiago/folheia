// Draws the placeholder app icon (a blank catalog card: paper, ruled lines and
// the red header rule) as PNGs. No logo on purpose until one is designed.
import { mkdirSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

const PAPER = [0xf3, 0xed, 0xe1];
const CARD = [0xfb, 0xf7, 0xef];
const RULE = [0xdd, 0xd1, 0xbe];
const ACCENT = [0xa9, 0x48, 0x1f];
const INK = [0x2b, 0x24, 0x20];

function png(size, draw) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      const [r, g, b, a = 255] = draw(x / size, y / size);
      row.set([r, g, b, a], 1 + x * 4);
    }
    rows.push(row);
  }
  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, 'ascii');
    data.copy(out, 8);
    out.writeUInt32BE(zlib.crc32(Buffer.concat([Buffer.from(type), data])), 8 + data.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** The card occupies `inset` margin; `safe` shrinks it for maskable icons. */
function card(inset) {
  return (x, y) => {
    const inCard = x > inset && x < 1 - inset && y > inset + 0.06 && y < 1 - inset - 0.06;
    if (!inCard) return PAPER;
    const cy = (y - inset - 0.06) / (1 - 2 * inset - 0.12);
    const cx = (x - inset) / (1 - 2 * inset);
    if (cy > 0.22 && cy < 0.245) return ACCENT;
    if (cy < 0.22 && cy > 0.09 && cy < 0.13 && cx > 0.1 && cx < 0.45) return INK;
    for (const line of [0.42, 0.58, 0.74])
      if (Math.abs(cy - line) < 0.012 && cx > 0.1 && cx < 0.9) return RULE;
    const hole = Math.hypot(cx - 0.5, (cy - 0.88) * 0.75);
    if (hole < 0.045) return PAPER;
    return CARD;
  };
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192, card(0.1)));
writeFileSync('public/icons/icon-512.png', png(512, card(0.1)));
writeFileSync('public/icons/maskable-512.png', png(512, card(0.2)));
writeFileSync('public/icons/apple-touch-icon.png', png(180, card(0.1)));
console.log('Icons written to public/icons');
