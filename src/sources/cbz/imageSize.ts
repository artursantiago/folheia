import type { PageSize } from '../types';

/**
 * Reads an image's pixel size from its first bytes, without decoding it.
 * Supports JPEG, PNG, GIF and WebP; returns undefined otherwise.
 */
export function imageSize(head: Uint8Array): PageSize | undefined {
  const view = new DataView(head.buffer, head.byteOffset, head.byteLength);
  const u8 = (i: number) => head[i] ?? 0;
  if (head.length < 24) return undefined;

  // PNG: IHDR right after the signature.
  if (u8(0) === 0x89 && u8(1) === 0x50 && u8(2) === 0x4e && u8(3) === 0x47) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  // GIF
  if (u8(0) === 0x47 && u8(1) === 0x49 && u8(2) === 0x46) {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }
  // WebP: RIFF....WEBP then VP8 / VP8L / VP8X chunks.
  if (u8(0) === 0x52 && u8(1) === 0x49 && u8(8) === 0x57 && u8(9) === 0x45 && head.length >= 30) {
    const chunk = String.fromCharCode(u8(12), u8(13), u8(14), u8(15));
    if (chunk === 'VP8 ')
      return {
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
      };
    if (chunk === 'VP8L') {
      const bits = view.getUint32(21, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') {
      const width = 1 + (u8(24) | (u8(25) << 8) | (u8(26) << 16));
      const height = 1 + (u8(27) | (u8(28) << 8) | (u8(29) << 16));
      return { width, height };
    }
    return undefined;
  }
  // JPEG: walk the markers until a start-of-frame.
  if (u8(0) === 0xff && u8(1) === 0xd8) {
    let i = 2;
    while (i + 9 < head.length) {
      if (u8(i) !== 0xff) return undefined;
      const marker = u8(i + 1);
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const length = view.getUint16(i + 2);
      const isFrame =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) return { width: view.getUint16(i + 7), height: view.getUint16(i + 5) };
      i += 2 + length;
    }
  }
  return undefined;
}
