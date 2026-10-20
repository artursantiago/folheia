// Generates test comics (never committed): a CBZ with ComicInfo, natural-order
// names, a double-page spread and macOS junk; plus fake CBR/CB7 headers.
// Usage: node scripts/make-fixture-cbz.mjs [--dir fixtures/generated]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import zlib from 'node:zlib';
import jpeg from 'jpeg-js';

const { values } = parseArgs({
  options: { dir: { type: 'string', default: 'fixtures/generated' } },
});

function art(width, height, hue) {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const band = Math.floor((x + y) / 40) % 2;
      data[i] = (hue * 37 + band * 60) % 255;
      data[i + 1] = (hue * 91 + y / 6) % 255;
      data[i + 2] = (hue * 53 + x / 6) % 255;
      data[i + 3] = 255;
    }
  return jpeg.encode({ data, width, height }, 80).data;
}

/** Minimal ZIP writer (STORED entries, like most CBZ files). */
function zip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameBytes = Buffer.from(name, 'utf8');
    const crc = zlib.crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    locals.push(local, nameBytes, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

const files = [];
// Pages 1..11, named so that plain sorting would get them wrong (2 after 10).
for (let n = 1; n <= 11; n++) {
  const wide = n === 6;
  files.push({ name: `Capitulo 1/pagina ${n}.jpg`, data: art(wide ? 1600 : 800, 1200, n) });
}
files.push({ name: '__MACOSX/Capitulo 1/._pagina 1.jpg', data: Buffer.from('junk') });
files.push({
  name: 'ComicInfo.xml',
  data: Buffer.from(`<?xml version="1.0"?>
<ComicInfo>
  <Title>Folheia CBZ fixture</Title>
  <Writer>Folheia test suite</Writer>
  <Year>1931</Year>
  <Manga>YesAndRightToLeft</Manga>
  <PageCount>11</PageCount>
  <Pages><Page Image="5" DoublePage="True"/></Pages>
</ComicInfo>`),
});

mkdirSync(values.dir, { recursive: true });
writeFileSync(join(values.dir, 'manga.cbz'), zip(files));
writeFileSync(
  join(values.dir, 'comic.cbr'),
  Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00, 0, 0, 0, 0]),
);
writeFileSync(
  join(values.dir, 'comic.cb7'),
  Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c, 0, 4, 0, 0, 0, 0]),
);
console.log(`Wrote manga.cbz, comic.cbr and comic.cb7 to ${values.dir}`);
