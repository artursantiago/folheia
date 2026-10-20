import { SourceError } from './types';

/**
 * Ranged HTTP reads shared by every format. Many CORS servers expose
 * Content-Range but not Accept-Ranges, so we detect support ourselves.
 */
export async function fetchRange(url: string, begin: number, end: number): Promise<Response> {
  // no-store: the HTTP cache can answer a range with the wrong (whole) body.
  try {
    return await fetch(url, { headers: { Range: `bytes=${begin}-${end - 1}` }, cache: 'no-store' });
  } catch (error) {
    throw new SourceError('network', 'Could not download the file', error);
  }
}

export interface RangeProbe {
  /** Total size, when the server honors ranges. */
  length: number | undefined;
  /** The first bytes (or the whole file when ranges aren't supported). */
  head: Uint8Array;
}

export async function probe(url: string, chunk: number): Promise<RangeProbe> {
  const response = await fetchRange(url, 0, chunk);
  if (!response.ok) throw new SourceError('http', `The server answered ${response.status}`);
  const total = Number(response.headers.get('Content-Range')?.match(/\/(\d+)$/)?.[1]);
  const head = new Uint8Array(await response.arrayBuffer());
  return {
    length: response.status === 206 && Number.isFinite(total) && total > 0 ? total : undefined,
    head,
  };
}

/** Reader for unzipit and friends: random access over HTTP ranges. */
export class HttpRangeReader {
  constructor(
    private readonly url: string,
    private readonly length: number,
  ) {}

  async getLength() {
    return this.length;
  }

  async read(offset: number, size: number): Promise<Uint8Array<ArrayBuffer>> {
    const response = await fetchRange(this.url, offset, offset + size);
    if (response.status !== 206)
      throw new SourceError('http', `Range request failed: ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
}
