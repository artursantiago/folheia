import { centralDirectory, zip } from '../../test/zip';
import { contentDigest } from '../digest';
import { openCbz, pageEntries } from './CbzSource';
import { parseComicInfo } from './comicInfo';
import { imageSize } from './imageSize';

function png(width: number, height: number) {
  const bytes = new Uint8Array(32);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}

function jpeg(width: number, height: number) {
  // SOI, an APP0 segment, then SOF0 with height/width.
  const bytes = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0, 0, 0, 0, 0x03,
    0, 0, 0, 0, 0, 0, 0, 0,
  ]);
  const view = new DataView(bytes.buffer);
  view.setUint16(13, height);
  view.setUint16(15, width);
  return bytes;
}

describe('imageSize', () => {
  it('reads PNG and JPEG dimensions from headers', () => {
    expect(imageSize(png(1200, 1800))).toEqual({ width: 1200, height: 1800 });
    expect(imageSize(jpeg(2400, 1700))).toEqual({ width: 2400, height: 1700 });
    expect(imageSize(new Uint8Array(40))).toBeUndefined();
  });
});

describe('pageEntries', () => {
  it('keeps images in natural order and drops junk', () => {
    const names = [
      '10.jpg',
      '2.jpg',
      '__MACOSX/._2.jpg',
      'ComicInfo.xml',
      'ch1/1.png',
      '.DS_Store',
      '1.jpg',
    ];
    const entries = names.map((name) => ({ name, isDirectory: false }));
    expect(pageEntries(entries).map((e) => e.name)).toEqual([
      '1.jpg',
      '2.jpg',
      '10.jpg',
      'ch1/1.png',
    ]);
  });
});

describe('parseComicInfo', () => {
  it('reads metadata, manga direction and page hints', () => {
    const info = parseComicInfo(`<?xml version="1.0"?>
      <ComicInfo>
        <Series>Saga</Series><Number>12</Number><Writer>Fulana</Writer><Year>1930</Year>
        <Manga>YesAndRightToLeft</Manga><LanguageISO>ja</LanguageISO><PageCount>4</PageCount>
        <Pages>
          <Page Image="0" Type="FrontCover"/>
          <Page Image="2" DoublePage="True"/>
          <Page Image="3" Type="Deleted"/>
        </Pages>
      </ComicInfo>`);
    expect(info.metadata).toMatchObject({
      title: 'Saga nº 12',
      author: 'Fulana',
      date: '1930',
      direction: 'rtl',
    });
    expect([...info.doublePages]).toEqual([2]);
    expect([...info.deletedPages]).toEqual([3]);
    expect(info.pageCount).toBe(4);
  });

  it('treats a plain "Yes" as manga of unknown direction', () => {
    expect(
      parseComicInfo('<ComicInfo><Manga>Yes</Manga></ComicInfo>').metadata.direction,
    ).toBeUndefined();
  });
});

describe('CBZ identity', () => {
  const pages = [
    { name: '01.png', data: png(800, 1200) },
    { name: '02.png', data: png(800, 1200) },
  ];
  const archive = zip(pages);

  it('is the SHA-256 of the central directory, whatever the file name or date', async () => {
    const a = await openCbz({
      file: new File([archive], 'saga-01.cbz', { lastModified: 1 }),
    });
    const b = await openCbz({ file: new File([archive], 'renamed.cbz', { lastModified: 2 }) });
    const expected = await contentDigest(centralDirectory(archive));
    expect(a.id).toBe(`cbz:${expected}`);
    expect(b.id).toBe(a.id);
    expect(a.legacyIds).toEqual([`cbz:saga-01.cbz:${archive.length}:1`]);
    await Promise.all([a.destroy(), b.destroy()]);
  });

  it('tells different archives apart, even with the same size and no name', async () => {
    const other = zip([pages[0]!, { name: '03.png', data: png(800, 1200) }]);
    expect(other.length).toBe(archive.length);
    const a = await openCbz({ file: new Blob([archive]) });
    const b = await openCbz({ file: new Blob([other]) });
    expect(a.id).not.toBe(b.id);
    await Promise.all([a.destroy(), b.destroy()]);
  });
});
