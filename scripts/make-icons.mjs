// Draws the app icon, the "F" monogram: the capital F of Young Serif (the
// title typeface, OFL-1.1) in ink over paper, with the terracotta rule of the
// catalog cards under it. Writes the PWA PNGs and the favicon SVG, with no
// dependencies: the glyph outline is embedded below and rasterized here.
import { mkdirSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

const LIGHT = { paper: '#F3EDE1', ink: '#2B2420', accent: '#A9481F' };
const DARK = { paper: '#12161D', ink: '#EDE3CF', accent: '#E2A84B' };

// Young Serif "F", in font units (1000 per em, y up).
const F_PATH =
  'M278 354 L278 155 Q278 110 295 85 Q312 60 346 60 L353 60 Q368 60 368 45 L368 15 Q368 0 353 0 L45 0 Q30 0 30 15 L30 45 Q30 60 45 60 L47 60 Q119 60 119 155 L119 594 Q119 689 46 689 L45 689 Q30 689 30 704 L30 734 Q30 750 45 750 L546 750 Q559 750 565 755 L571 760 Q574 763 579 763 Q587 763 592 755 L671 619 Q674 615 674 610 Q674 603 666 598 L626 576 Q619 572 615 572 Q608 572 603 581 L600 586 Q569 638 523.5 658.5 Q478 679 420 679 L278 679 L278 434 L366 434 Q411 434 436 451 Q461 468 461 501 L461 508 Q461 523 476 523 L506 523 Q521 523 521 508 L521 281 Q521 266 506 266 L476 266 Q461 266 461 281 L461 287 Q461 321 436.5 337.5 Q412 354 366 354 L278 354 Z';

// The monogram block, in font units: glyph box, gap, then the rule.
const GLYPH = { left: 30, right: 674, top: 763 };
const GAP = 114;
const RULE = { width: 682, height: 68 };
const BLOCK_HEIGHT = GLYPH.top + GAP + RULE.height;
const CENTER_X = (GLYPH.left + GLYPH.right) / 2;

/** Maps font units into a square of `size`, the block taking `share` of its height. */
function layout(size, share) {
  const scale = (size * share) / BLOCK_HEIGHT;
  const top = (size - size * share) / 2;
  return {
    scale,
    x: (u) => size / 2 + (u - CENTER_X) * scale,
    y: (u) => top + (GLYPH.top - u) * scale,
  };
}

/** Flattens the glyph path into polygon points. */
function glyphPolygon(map) {
  const points = [];
  let current = [0, 0];
  for (const part of F_PATH.match(/[MLQZ][^MLQZ]*/g)) {
    const type = part[0];
    const n = part.slice(1).trim().split(/\s+/).filter(Boolean).map(Number);
    if (type === 'M' || type === 'L') {
      current = [n[0], n[1]];
      points.push(current);
    } else if (type === 'Q') {
      const [x0, y0] = current;
      for (let i = 1; i <= 8; i++) {
        const t = i / 8;
        const a = (1 - t) * (1 - t);
        const b = 2 * (1 - t) * t;
        const c = t * t;
        points.push([a * x0 + b * n[0] + c * n[2], a * y0 + b * n[1] + c * n[3]]);
      }
      current = [n[2], n[3]];
    }
  }
  return points.map(([x, y]) => [map.x(x), map.y(y)]);
}

function rulePolygon(map) {
  const left = CENTER_X - RULE.width / 2;
  const right = CENTER_X + RULE.width / 2;
  const top = -GAP;
  const bottom = top - RULE.height;
  return [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
  ].map(([x, y]) => [map.x(x), map.y(y)]);
}

/** Coverage (0–1) of a polygon per pixel, nonzero rule, 4×4 supersampling. */
function coverage(size, polygon) {
  const SUB = 4;
  const cover = new Float32Array(size * size);
  const edges = polygon.map((p, i) => [p, polygon[(i + 1) % polygon.length]]);
  for (let sy = 0; sy < size * SUB; sy++) {
    const y = (sy + 0.5) / SUB;
    const crossings = [];
    for (const [[x0, y0], [x1, y1]] of edges) {
      if (y0 === y1 || y < Math.min(y0, y1) || y >= Math.max(y0, y1)) continue;
      crossings.push([x0 + ((y - y0) / (y1 - y0)) * (x1 - x0), y1 > y0 ? 1 : -1]);
    }
    crossings.sort((a, b) => a[0] - b[0]);
    let winding = 0;
    let k = 0;
    const row = Math.floor(sy / SUB) * size;
    for (let sx = 0; sx < size * SUB; sx++) {
      const x = (sx + 0.5) / SUB;
      while (k < crossings.length && crossings[k][0] <= x) winding += crossings[k++][1];
      if (winding !== 0) cover[row + Math.floor(sx / SUB)] += 1 / (SUB * SUB);
    }
  }
  return cover;
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function png(size, share, colors) {
  const map = layout(size, share);
  const glyph = coverage(size, glyphPolygon(map));
  const rule = coverage(size, rulePolygon(map));
  const [paper, ink, accent] = [colors.paper, colors.ink, colors.accent].map(rgb);
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const color = paper.map((p, c) => {
        const withInk = p + (ink[c] - p) * Math.min(1, glyph[i]);
        return Math.round(withInk + (accent[c] - withInk) * Math.min(1, rule[i]));
      });
      row.set([...color, 255], 1 + x * 4);
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

/** The favicon follows the system theme: Ateliê by day, Sebo à noite by night. */
function favicon() {
  const map = layout(64, 0.66);
  const r = (n) => Math.round(n * 100) / 100;
  const rule = rulePolygon(map);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <style>
    .paper { fill: ${LIGHT.paper} } .ink { fill: ${LIGHT.ink} } .accent { fill: ${LIGHT.accent} }
    @media (prefers-color-scheme: dark) {
      .paper { fill: ${DARK.paper} } .ink { fill: ${DARK.ink} } .accent { fill: ${DARK.accent} }
    }
  </style>
  <rect class="paper" width="64" height="64" rx="14"/>
  <path class="ink" transform="translate(${r(map.x(0))} ${r(map.y(0))}) scale(${map.scale.toFixed(4)} ${(-map.scale).toFixed(4)})" d="${F_PATH}"/>
  <rect class="accent" x="${r(rule[0][0])}" y="${r(rule[0][1])}" width="${r(rule[1][0] - rule[0][0])}" height="${r(rule[2][1] - rule[0][1])}"/>
</svg>
`;
}

mkdirSync('public/icons', { recursive: true });
// Home-screen icons are full squares (the system rounds them); maskable ones
// keep the monogram inside the 80% safe circle.
writeFileSync('public/icons/icon-192.png', png(192, 0.62, LIGHT));
writeFileSync('public/icons/icon-512.png', png(512, 0.62, LIGHT));
writeFileSync('public/icons/maskable-512.png', png(512, 0.5, LIGHT));
writeFileSync('public/icons/apple-touch-icon.png', png(180, 0.62, LIGHT));
writeFileSync('public/icons/favicon.svg', favicon());
console.log('Icons written to public/icons');
