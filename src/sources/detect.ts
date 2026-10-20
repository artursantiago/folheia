export type FileFormat = 'pdf' | 'zip' | 'rar' | '7z' | 'unknown';

/** Identifies a file by its first bytes; extensions and MIME types can lie. */
export function detectFormat(head: Uint8Array): FileFormat {
  const starts = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);
  // PDFs may have a little junk before the header; look in the first 1 KB.
  const text = new TextDecoder('latin1').decode(head.subarray(0, 1024));
  if (text.includes('%PDF-')) return 'pdf';
  if (starts(0x50, 0x4b, 0x03, 0x04) || starts(0x50, 0x4b, 0x05, 0x06)) return 'zip';
  if (starts(0x52, 0x61, 0x72, 0x21, 0x1a, 0x07)) return 'rar';
  if (starts(0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c)) return '7z';
  return 'unknown';
}
