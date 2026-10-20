import { openCbz } from './cbz/CbzSource';
import { detectFormat } from './detect';
import { probe } from './http';
import { openPdf, type OpenPdfOptions } from './pdf/PdfSource';
import { SourceError, type PageSource } from './types';

export type SourceInput = { file: File } | { url: string };

const PROBE_BYTES = 256 * 1024;

/** Opens a PDF or CBZ, telling them apart by content rather than by name. */
export async function openSource(
  input: SourceInput,
  options: OpenPdfOptions = {},
): Promise<PageSource> {
  if ('file' in input) {
    const head = new Uint8Array(await input.file.slice(0, 1024).arrayBuffer());
    const format = detectFormat(head);
    if (format === 'pdf') return openPdf({ file: input.file }, options);
    if (format === 'zip') return openCbz({ file: input.file, name: input.file.name });
    throw unsupported(format);
  }
  const first = await probe(input.url, PROBE_BYTES);
  const format = detectFormat(first.head);
  if (format === 'pdf') return openPdf({ url: input.url, probe: first }, options);
  if (format === 'zip') {
    // Without range support the probe holds the whole archive already.
    return first.length
      ? openCbz({ url: input.url, length: first.length })
      : openCbz({ file: new Blob([first.head.slice()]) });
  }
  throw unsupported(format);
}

function unsupported(format: string): SourceError {
  return new SourceError('unsupported-format', `Unsupported format: ${format}`, format);
}
