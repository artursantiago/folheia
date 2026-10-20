import { detectFormat } from './detect';

const bytes = (...b: number[]) => new Uint8Array(b);
const ascii = (s: string) => new TextEncoder().encode(s);

describe('detectFormat', () => {
  it('recognizes PDF, ZIP (CBZ), RAR (CBR) and 7z (CB7) by their magic bytes', () => {
    expect(detectFormat(ascii('%PDF-1.7\n'))).toBe('pdf');
    expect(detectFormat(ascii('\n\n%PDF-1.4'))).toBe('pdf');
    expect(detectFormat(bytes(0x50, 0x4b, 0x03, 0x04, 0x14))).toBe('zip');
    expect(detectFormat(bytes(0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00))).toBe('rar');
    expect(detectFormat(bytes(0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c))).toBe('7z');
    expect(detectFormat(ascii('<html>'))).toBe('unknown');
  });
});
